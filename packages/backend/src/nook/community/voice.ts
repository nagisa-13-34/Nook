/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { randomBytes } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type { IdService } from '@/core/IdService.js';
import { requireNookCommunityPermission } from './access.js';
import { requireNookCommunityChannelAccess } from './channels.js';

export class NookCommunityVoiceError extends Error {
	constructor(public readonly code: 'NOT_VOICE_CHANNEL' | 'NO_SESSION' | 'NO_TARGET') { super(code); }
}

export interface NookVoiceIceServer {
	urls: string | string[];
	username?: string;
	credential?: string;
}

export interface NookVoiceMusicState {
	url: string | null;
	title: string | null;
	positionSeconds: number;
	playing: boolean;
	updatedAt: Date;
}

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

async function cleanupVoiceRows(db: DataSource): Promise<void> {
	await db.query(`DELETE FROM "nook_community_voice_presence" WHERE "lastSeenAt" < now() - interval '45 seconds'`);
	await db.query(`DELETE FROM "nook_community_voice_signal" WHERE "createdAt" < now() - interval '2 minutes'`);
}

export async function joinNookCommunityVoice(db: DataSource, communityId: string, channelId: string, userId: string) {
	const membership = await requireNookCommunityPermission(db, communityId, userId, 'voice.join');
	const channel = await requireNookCommunityChannelAccess(db, communityId, userId, channelId);
	if (channel.kind !== 'voice' || channel.archivedAt != null) throw new NookCommunityVoiceError('NOT_VOICE_CHANNEL');
	await cleanupVoiceRows(db);
	const sessionId = randomBytes(24).toString('base64url');
	await db.query(
		`INSERT INTO "nook_community_voice_presence" ("channelId","userId","sessionId") VALUES ($1,$2,$3)
		 ON CONFLICT ("channelId","userId") DO UPDATE SET "sessionId"=EXCLUDED."sessionId", "joinedAt"=now(), "lastSeenAt"=now()`,
		[channelId, userId, sessionId],
	);
	const peers = await db.query<Array<{ userId: string }>>('SELECT "userId" FROM "nook_community_voice_presence" WHERE "channelId"=$1 AND "userId"<>$2 AND "lastSeenAt">now()-interval \'45 seconds\'', [channelId, userId]);
	return { sessionId, peers: peers.map(peer => peer.userId), canSpeak: membership.permissions.has('*') || membership.permissions.has('voice.speak'), iceServersJson: JSON.stringify(getNookVoiceIceServers()) };
}

export async function requireVoiceSession(db: DataSource, channelId: string, userId: string, sessionId: string): Promise<void> {
	const rows = await db.query<Array<{ sessionId: string }>>('SELECT "sessionId" FROM "nook_community_voice_presence" WHERE "channelId"=$1 AND "userId"=$2 AND "sessionId"=$3 AND "lastSeenAt">now()-interval \'45 seconds\' LIMIT 1', [channelId, userId, sessionId]);
	if (rows[0] == null) throw new NookCommunityVoiceError('NO_SESSION');
}

export async function heartbeatNookCommunityVoice(db: DataSource, channelId: string, userId: string, sessionId: string) {
	await requireVoiceSession(db, channelId, userId, sessionId);
	await db.query('UPDATE "nook_community_voice_presence" SET "lastSeenAt"=now() WHERE "channelId"=$1 AND "userId"=$2 AND "sessionId"=$3', [channelId, userId, sessionId]);
	await cleanupVoiceRows(db);
	const [peers, configRows, musicRows] = await Promise.all([
		db.query<Array<{ userId: string }>>('SELECT "userId" FROM "nook_community_voice_presence" WHERE "channelId"=$1 AND "userId"<>$2 AND "lastSeenAt">now()-interval \'45 seconds\' ORDER BY "joinedAt" ASC', [channelId, userId]),
		db.query<Array<{ ttsEnabled: boolean; ttsSourceChannelId: string | null; ttsLanguage: string | null; musicEnabled: boolean }>>('SELECT "ttsEnabled","ttsSourceChannelId","ttsLanguage","musicEnabled" FROM "nook_community_voice_config" WHERE "channelId"=$1 LIMIT 1', [channelId]),
		db.query<NookVoiceMusicState[]>('SELECT "url","title","positionSeconds","playing","updatedAt" FROM "nook_community_voice_music" WHERE "channelId"=$1 LIMIT 1', [channelId]),
	]);
	return {
		peers: peers.map(peer => peer.userId),
		config: configRows[0] ?? { ttsEnabled: false, ttsSourceChannelId: null, ttsLanguage: null, musicEnabled: false },
		music: musicRows[0] ?? null,
	};
}

export async function leaveNookCommunityVoice(db: DataSource, channelId: string, userId: string, sessionId: string): Promise<void> {
	await db.query('DELETE FROM "nook_community_voice_presence" WHERE "channelId"=$1 AND "userId"=$2 AND "sessionId"=$3', [channelId, userId, sessionId]);
	await db.query('DELETE FROM "nook_community_voice_signal" WHERE "channelId"=$1 AND ("fromUserId"=$2 OR "toUserId"=$2)', [channelId, userId]);
}

export async function sendNookCommunityVoiceSignal(db: DataSource, idService: IdService, channelId: string, fromUserId: string, sessionId: string, toUserId: string, type: 'offer' | 'answer' | 'ice', payload: string): Promise<void> {
	await requireVoiceSession(db, channelId, fromUserId, sessionId);
	const target = await db.query<Array<{ userId: string }>>('SELECT "userId" FROM "nook_community_voice_presence" WHERE "channelId"=$1 AND "userId"=$2 AND "lastSeenAt">now()-interval \'45 seconds\' LIMIT 1', [channelId, toUserId]);
	if (target[0] == null) throw new NookCommunityVoiceError('NO_TARGET');
	await db.query('INSERT INTO "nook_community_voice_signal" ("id","channelId","fromUserId","toUserId","type","payload") VALUES ($1,$2,$3,$4,$5,$6)', [idService.gen(), channelId, fromUserId, toUserId, type, payload]);
}

export async function consumeNookCommunityVoiceSignals(db: DataSource, channelId: string, userId: string, sessionId: string) {
	await requireVoiceSession(db, channelId, userId, sessionId);
	return await db.transaction(async manager => {
		const rows = await manager.query<Array<{ id: string; fromUserId: string; type: string; payload: string; createdAt: Date }>>(`SELECT "id","fromUserId","type","payload","createdAt" FROM "nook_community_voice_signal" WHERE "channelId"=$1 AND "toUserId"=$2 ORDER BY "createdAt" ASC LIMIT 100 FOR UPDATE SKIP LOCKED`, [channelId, userId]);
		if (rows.length > 0) await manager.query('DELETE FROM "nook_community_voice_signal" WHERE "id" = ANY($1::varchar[])', [rows.map(row => row.id)]);
		return rows;
	});
}
