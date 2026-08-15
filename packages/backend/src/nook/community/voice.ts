/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { randomBytes } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type { IdService } from '@/core/IdService.js';
import { requireNookCommunityPermission, NookCommunityAccessError } from './access.js';
import { requireNookCommunityChannelAccess, NookCommunityChannelError } from './channels.js';

export class NookCommunityVoiceError extends Error {
	constructor(public readonly code: 'NOT_VOICE_CHANNEL' | 'NO_SESSION' | 'NO_TARGET') { super(code); }
}

export interface NookVoiceIceServer {
	urls: string | string[];
	username?: string;
	credential?: string;
}

export type NookVoiceIceTransportPolicy = 'all' | 'relay';

export interface NookVoiceConfig {
	ttsEnabled: boolean;
	ttsSourceChannelId: string | null;
	ttsLanguage: string | null;
	musicEnabled: boolean;
}

export interface NookVoiceMusicState {
	url: string | null;
	title: string | null;
	positionSeconds: number;
	playing: boolean;
	updatedAt: Date;
}

interface NookVoicePeerState {
	userId: string;
	canSpeak: boolean;
}

const voiceCleanupIntervalMs = 30_000;
let nextVoiceCleanupAt = 0;

function cleanIceServer(value: unknown): NookVoiceIceServer | null {
	if (typeof value !== 'object' || value == null) return null;
	const raw = value as Record<string, unknown>;
	const urls = raw.urls;
	if (!(typeof urls === 'string' || (Array.isArray(urls) && urls.every(url => typeof url === 'string')))) return null;
	const result: NookVoiceIceServer = { urls: urls as string | string[] };
	if (typeof raw.username === 'string') result.username = raw.username;
	if (typeof raw.credential === 'string') result.credential = raw.credential;
	return result;
}

export function getNookVoiceIceServers(): NookVoiceIceServer[] {
	const raw = process.env.NOOK_VOICE_ICE_SERVERS;
	if (raw == null || raw.trim() === '') return [];
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.slice(0, 8).map(cleanIceServer).filter((value): value is NookVoiceIceServer => value != null);
	} catch {
		return [];
	}
}

export function getNookVoiceIceTransportPolicy(): NookVoiceIceTransportPolicy {
	return process.env.NOOK_VOICE_ICE_TRANSPORT_POLICY === 'relay' ? 'relay' : 'all';
}

export function hideNookVoiceTtsSource(config: NookVoiceConfig): NookVoiceConfig {
	return {
		...config,
		ttsEnabled: false,
		ttsSourceChannelId: null,
	};
}

async function cleanupVoiceRows(db: DataSource): Promise<void> {
	const now = Date.now();
	if (now < nextVoiceCleanupAt) return;
	// Advance before awaiting so simultaneous heartbeats in this process do not all run the same global cleanup.
	nextVoiceCleanupAt = now + voiceCleanupIntervalMs;
	try {
		await db.query(`DELETE FROM "nook_community_voice_presence" WHERE "lastSeenAt" < now() - interval '45 seconds'`);
		await db.query(`DELETE FROM "nook_community_voice_signal" WHERE "createdAt" < now() - interval '2 minutes'`);
	} catch (error) {
		nextVoiceCleanupAt = 0;
		throw error;
	}
}

async function deleteVoiceSession(db: DataSource, channelId: string, userId: string, sessionId: string): Promise<boolean> {
	const deleted = await db.query<Array<{ sessionId: string }>>(
		'DELETE FROM "nook_community_voice_presence" WHERE "channelId"=$1 AND "userId"=$2 AND "sessionId"=$3 RETURNING "sessionId"',
		[channelId, userId, sessionId],
	);
	if (deleted[0] == null) return false;
	await db.query('DELETE FROM "nook_community_voice_signal" WHERE "channelId"=$1 AND ("fromUserId"=$2 OR "toUserId"=$2)', [channelId, userId]);
	return true;
}

export async function requireVoiceSession(db: DataSource, channelId: string, userId: string, sessionId: string): Promise<void> {
	const rows = await db.query<Array<{ sessionId: string }>>('SELECT "sessionId" FROM "nook_community_voice_presence" WHERE "channelId"=$1 AND "userId"=$2 AND "sessionId"=$3 AND "lastSeenAt">now()-interval \'45 seconds\' LIMIT 1', [channelId, userId, sessionId]);
	if (rows[0] == null) throw new NookCommunityVoiceError('NO_SESSION');
}

async function authorizeVoiceSession(db: DataSource, channelId: string, userId: string, sessionId: string): Promise<{ canSpeak: boolean; communityId: string }> {
	await requireVoiceSession(db, channelId, userId, sessionId);
	const rows = await db.query<Array<{ communityId: string; kind: string; archivedAt: Date | null }>>(
		'SELECT "communityId", "kind", "archivedAt" FROM "nook_community_channel" WHERE "id"=$1 LIMIT 1',
		[channelId],
	);
	const channel = rows[0];
	if (channel == null || channel.kind !== 'voice' || channel.archivedAt != null) {
		await deleteVoiceSession(db, channelId, userId, sessionId);
		throw new NookCommunityVoiceError('NO_SESSION');
	}
	try {
		const membership = await requireNookCommunityPermission(db, channel.communityId, userId, 'voice.join');
		await requireNookCommunityChannelAccess(db, channel.communityId, userId, channelId);
		return {
			canSpeak: membership.permissions.has('*') || membership.permissions.has('voice.speak'),
			communityId: channel.communityId,
		};
	} catch (error) {
		if (error instanceof NookCommunityAccessError || error instanceof NookCommunityChannelError) {
			await deleteVoiceSession(db, channelId, userId, sessionId);
			throw new NookCommunityVoiceError('NO_SESSION');
		}
		throw error;
	}
}

async function listAuthorizedVoicePeers(db: DataSource, channelId: string, excludeUserId: string): Promise<NookVoicePeerState[]> {
	const rows = await db.query<Array<{ userId: string; sessionId: string }>>(
		'SELECT "userId","sessionId" FROM "nook_community_voice_presence" WHERE "channelId"=$1 AND "userId"<>$2 AND "lastSeenAt">now()-interval \'45 seconds\' ORDER BY "joinedAt" ASC',
		[channelId, excludeUserId],
	);
	const peers: NookVoicePeerState[] = [];
	for (const row of rows) {
		try {
			const authorization = await authorizeVoiceSession(db, channelId, row.userId, row.sessionId);
			peers.push({ userId: row.userId, canSpeak: authorization.canSpeak });
		} catch (error) {
			if (error instanceof NookCommunityVoiceError && error.code === 'NO_SESSION') continue;
			throw error;
		}
	}
	return peers;
}

function serializePeerState(peers: NookVoicePeerState[]) {
	return {
		peers: peers.map(peer => peer.userId),
		speakingPeerIds: peers.filter(peer => peer.canSpeak).map(peer => peer.userId),
	};
}

export async function joinNookCommunityVoice(db: DataSource, communityId: string, channelId: string, userId: string) {
	const membership = await requireNookCommunityPermission(db, communityId, userId, 'voice.join');
	const channel = await requireNookCommunityChannelAccess(db, communityId, userId, channelId);
	if (channel.kind !== 'voice' || channel.archivedAt != null) throw new NookCommunityVoiceError('NOT_VOICE_CHANNEL');
	await cleanupVoiceRows(db);
	const sessionId = randomBytes(24).toString('base64url');
	await db.transaction(async manager => {
		await manager.query(
			'DELETE FROM "nook_community_voice_signal" WHERE "channelId"=$1 AND ("fromUserId"=$2 OR "toUserId"=$2)',
			[channelId, userId],
		);
		await manager.query(
			`INSERT INTO "nook_community_voice_presence" ("channelId","userId","sessionId") VALUES ($1,$2,$3)
			 ON CONFLICT ("channelId","userId") DO UPDATE SET "sessionId"=EXCLUDED."sessionId", "joinedAt"=now(), "lastSeenAt"=now()`,
			[channelId, userId, sessionId],
		);
	});
	const peerState = serializePeerState(await listAuthorizedVoicePeers(db, channelId, userId));
	return {
		sessionId,
		...peerState,
		canSpeak: membership.permissions.has('*') || membership.permissions.has('voice.speak'),
		iceServersJson: JSON.stringify(getNookVoiceIceServers()),
		iceTransportPolicy: getNookVoiceIceTransportPolicy(),
	};
}

export async function heartbeatNookCommunityVoice(db: DataSource, channelId: string, userId: string, sessionId: string) {
	const authorization = await authorizeVoiceSession(db, channelId, userId, sessionId);
	await db.query('UPDATE "nook_community_voice_presence" SET "lastSeenAt"=now() WHERE "channelId"=$1 AND "userId"=$2 AND "sessionId"=$3', [channelId, userId, sessionId]);
	await cleanupVoiceRows(db);
	const [authorizedPeers, configRows, musicRows] = await Promise.all([
		listAuthorizedVoicePeers(db, channelId, userId),
		db.query<NookVoiceConfig[]>('SELECT "ttsEnabled","ttsSourceChannelId","ttsLanguage","musicEnabled" FROM "nook_community_voice_config" WHERE "channelId"=$1 LIMIT 1', [channelId]),
		db.query<NookVoiceMusicState[]>('SELECT "url","title","positionSeconds","playing","updatedAt" FROM "nook_community_voice_music" WHERE "channelId"=$1 LIMIT 1', [channelId]),
	]);
	let config: NookVoiceConfig = configRows[0] ?? { ttsEnabled: false, ttsSourceChannelId: null, ttsLanguage: null, musicEnabled: false };
	if (config.ttsEnabled && config.ttsSourceChannelId != null) {
		try {
			const source = await requireNookCommunityChannelAccess(db, authorization.communityId, userId, config.ttsSourceChannelId);
			if (source.kind === 'voice' || source.archivedAt != null) config = hideNookVoiceTtsSource(config);
		} catch (error) {
			if (error instanceof NookCommunityAccessError || error instanceof NookCommunityChannelError) config = hideNookVoiceTtsSource(config);
			else throw error;
		}
	}
	return {
		...serializePeerState(authorizedPeers),
		canSpeak: authorization.canSpeak,
		config,
		music: musicRows[0] ?? null,
	};
}

export async function leaveNookCommunityVoice(db: DataSource, channelId: string, userId: string, sessionId: string): Promise<void> {
	await deleteVoiceSession(db, channelId, userId, sessionId);
}

export async function sendNookCommunityVoiceSignal(db: DataSource, idService: IdService, channelId: string, fromUserId: string, sessionId: string, toUserId: string, type: 'offer' | 'answer' | 'ice', payload: string): Promise<void> {
	await authorizeVoiceSession(db, channelId, fromUserId, sessionId);
	const targetRows = await db.query<Array<{ userId: string; sessionId: string }>>('SELECT "userId","sessionId" FROM "nook_community_voice_presence" WHERE "channelId"=$1 AND "userId"=$2 AND "lastSeenAt">now()-interval \'45 seconds\' LIMIT 1', [channelId, toUserId]);
	const target = targetRows[0];
	if (target == null) throw new NookCommunityVoiceError('NO_TARGET');
	try {
		await authorizeVoiceSession(db, channelId, target.userId, target.sessionId);
	} catch (error) {
		if (error instanceof NookCommunityVoiceError) throw new NookCommunityVoiceError('NO_TARGET');
		throw error;
	}
	await db.query('INSERT INTO "nook_community_voice_signal" ("id","channelId","fromUserId","toUserId","type","payload") VALUES ($1,$2,$3,$4,$5,$6)', [idService.gen(), channelId, fromUserId, toUserId, type, payload]);
}

export async function consumeNookCommunityVoiceSignals(db: DataSource, channelId: string, userId: string, sessionId: string) {
	await authorizeVoiceSession(db, channelId, userId, sessionId);
	return await db.transaction(async manager => {
		const rows = await manager.query<Array<{ id: string; fromUserId: string; type: string; payload: string; createdAt: Date }>>(`SELECT "id","fromUserId","type","payload","createdAt" FROM "nook_community_voice_signal" WHERE "channelId"=$1 AND "toUserId"=$2 ORDER BY "createdAt" ASC LIMIT 100 FOR UPDATE SKIP LOCKED`, [channelId, userId]);
		if (rows.length > 0) await manager.query('DELETE FROM "nook_community_voice_signal" WHERE "id" = ANY($1::varchar[])', [rows.map(row => row.id)]);
		return rows;
	});
}
