/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { IdService } from '@/core/IdService.js';
import { requireNookCommunityChannelReference } from './references.js';
import type { DataSource } from 'typeorm';

export const nookCommunityBotScopes = ['read:messages', 'write:messages'] as const;
export type NookCommunityBotScope = typeof nookCommunityBotScopes[number];

export interface NookCommunityBotRecord {
	id: string;
	communityId: string;
	creatorId: string | null;
	name: string;
	description: string | null;
	kind: 'integration' | 'tts' | 'music';
	scopes: NookCommunityBotScope[];
	allowedChannelIds: string[];
	enabled: boolean;
	createdAt: Date;
	updatedAt: Date;
	lastUsedAt: Date | null;
}

export class NookCommunityBotError extends Error {
	constructor(public readonly code: 'INVALID_SCOPE' | 'NO_SUCH_BOT' | 'INVALID_SECRET' | 'SCOPE_REQUIRED' | 'CHANNEL_FORBIDDEN') { super(code); }
}

function hashSecret(secret: string): string {
	return createHash('sha256').update(secret).digest('hex');
}

function normalizeScopes(scopes: readonly string[]): NookCommunityBotScope[] {
	if (!scopes.every(scope => (nookCommunityBotScopes as readonly string[]).includes(scope))) throw new NookCommunityBotError('INVALID_SCOPE');
	return [...new Set(scopes)] as NookCommunityBotScope[];
}

function secretMatches(secret: string, expectedHash: string): boolean {
	const actual = Buffer.from(hashSecret(secret), 'hex');
	const expected = Buffer.from(expectedHash, 'hex');
	return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function validateAllowedChannels(db: DataSource, communityId: string, channelIds: readonly string[]): Promise<string[]> {
	const unique = [...new Set(channelIds)];
	for (const channelId of unique) await requireNookCommunityChannelReference(db, communityId, channelId, { nonVoice: true });
	return unique;
}

export function generateNookCommunityBotSecret(): string {
	return randomBytes(32).toString('base64url');
}

export async function createNookCommunityBot(db: DataSource, idService: IdService, input: { communityId: string; creatorId: string; name: string; description: string | null; kind?: NookCommunityBotRecord['kind']; scopes: readonly string[]; allowedChannelIds: readonly string[] }): Promise<{ bot: NookCommunityBotRecord; secret: string }> {
	const id = idService.gen();
	const secret = generateNookCommunityBotSecret();
	const scopes = normalizeScopes(input.scopes);
	const allowedChannelIds = await validateAllowedChannels(db, input.communityId, input.allowedChannelIds);
	const rows = await db.query<NookCommunityBotRecord[]>(
		`INSERT INTO "nook_community_bot" ("id", "communityId", "creatorId", "name", "description", "kind", "secretHash", "scopes", "allowedChannelIds")
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb)
		 RETURNING "id","communityId","creatorId","name","description","kind","scopes","allowedChannelIds","enabled","createdAt","updatedAt","lastUsedAt"`,
		[id, input.communityId, input.creatorId, input.name, input.description, input.kind ?? 'integration', hashSecret(secret), JSON.stringify(scopes), JSON.stringify(allowedChannelIds)],
	);
	return { bot: rows[0], secret };
}

export async function authenticateNookCommunityBot(db: DataSource, botId: string, secret: string, requiredScope: NookCommunityBotScope): Promise<NookCommunityBotRecord> {
	const rows = await db.query<Array<NookCommunityBotRecord & { secretHash: string }>>(
		'SELECT "id","communityId","creatorId","name","description","kind","secretHash","scopes","allowedChannelIds","enabled","createdAt","updatedAt","lastUsedAt" FROM "nook_community_bot" WHERE "id"=$1 LIMIT 1', [botId]);
	const bot = rows[0];
	if (bot == null || !bot.enabled) throw new NookCommunityBotError('NO_SUCH_BOT');
	if (!secretMatches(secret, bot.secretHash)) throw new NookCommunityBotError('INVALID_SECRET');
	if (!Array.isArray(bot.scopes) || !bot.scopes.includes(requiredScope)) throw new NookCommunityBotError('SCOPE_REQUIRED');
	await db.query('UPDATE "nook_community_bot" SET "lastUsedAt"=now() WHERE "id"=$1', [botId]);
	return bot;
}

export async function requireNookCommunityBotCreatorActive(db: DataSource, creatorId: string): Promise<void> {
	const rows = await db.query<Array<{ host: string | null; isDeleted: boolean; isSuspended: boolean }>>(
		'SELECT "host", "isDeleted", "isSuspended" FROM "user" WHERE "id"=$1 LIMIT 1',
		[creatorId],
	);
	const creator = rows[0];
	if (creator == null || creator.host != null || creator.isDeleted || creator.isSuspended) throw new NookCommunityBotError('CHANNEL_FORBIDDEN');
}

export function ensureBotChannelAllowed(bot: NookCommunityBotRecord, channelId: string): void {
	if (!Array.isArray(bot.allowedChannelIds) || !bot.allowedChannelIds.includes(channelId)) throw new NookCommunityBotError('CHANNEL_FORBIDDEN');
}

export async function rotateNookCommunityBotSecret(db: DataSource, communityId: string, botId: string): Promise<string> {
	const secret = generateNookCommunityBotSecret();
	const rows = await db.query<Array<{ id: string }>>('UPDATE "nook_community_bot" SET "secretHash"=$3, "updatedAt"=now() WHERE "communityId"=$1 AND "id"=$2 RETURNING "id"', [communityId, botId, hashSecret(secret)]);
	if (rows[0] == null) throw new NookCommunityBotError('NO_SUCH_BOT');
	return secret;
}
