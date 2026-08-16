/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { createHash } from 'node:crypto';
import { describe, test } from 'vitest';
import type { DataSource } from 'typeorm';
import type { IdService } from '@/core/IdService.js';
import { ApiError } from '@/server/api/error.js';
import BotMessagesListEndpoint from '@/server/api/endpoints/nook/community/bots/messages-list.js';
import BotPostEndpoint from '@/server/api/endpoints/nook/community/bots/post.js';

function createBotDb(secret: string, creatorState: 'active' | 'suspended' = 'active') {
	let channelAccessQueries = 0;
	const db = {
		query: async (sql: string) => {
			if (sql.includes('FROM "nook_community_bot"')) {
				return [{
					id: 'bot',
					communityId: 'community',
					creatorId: 'creator',
					name: 'Bot',
					description: null,
					kind: 'integration',
					secretHash: createHash('sha256').update(secret).digest('hex'),
					scopes: ['read:messages', 'write:messages'],
					allowedChannelIds: ['staff'],
					enabled: true,
					createdAt: new Date(0),
					updatedAt: new Date(0),
					lastUsedAt: null,
				}];
			}
			if (sql.startsWith('UPDATE "nook_community_bot" SET "lastUsedAt"')) return [];
			if (sql.startsWith('SELECT "host", "isDeleted", "isSuspended" FROM "user"')) {
				return [{ host: null, isDeleted: false, isSuspended: creatorState === 'suspended' }];
			}
			if (sql.includes('FROM "channel" c')) {
				channelAccessQueries++;
				return [{ userId: 'owner', joinMode: 'open', ageMode: 'mixed', discoverable: true, initialized: true }];
			}
			if (sql.includes('SELECT "baseRole", "state" FROM "nook_community_member"')) return [{ baseRole: 'member', state: 'active' }];
			if (sql.includes('INNER JOIN "nook_community_role" r')) return [];
			if (sql.includes('FROM "nook_community_channel" WHERE "communityId"')) {
				return [{ id: 'staff', communityId: 'community', parentId: null, name: 'Staff', topic: null, kind: 'text', position: 0, allowedRoleIds: ['staff-role'], archivedAt: null }];
			}
			if (sql.includes('SELECT "roleId" FROM "nook_community_member_role"')) return [];
			throw new Error(`Unexpected query: ${sql}`);
		},
	} as unknown as DataSource;
	return { db, getChannelAccessQueries: () => channelAccessQueries };
}

describe('Nook Community Bot runtime channel access', () => {
	test('a Bot cannot keep reading or posting after its creator loses access to a restricted channel', async () => {
		const secret = 's'.repeat(32);
		const { db } = createBotDb(secret);
		const list = new BotMessagesListEndpoint(db);
		const post = new BotPostEndpoint(db, { gen: () => 'message' } as unknown as IdService);

		await assert.rejects(
			() => list.exec({ botId: 'bot', secret, channelId: 'staff' }, null, null),
			(error: unknown) => error instanceof ApiError && error.code === 'BOT_FORBIDDEN',
		);
		await assert.rejects(
			() => post.exec({ botId: 'bot', secret, channelId: 'staff', body: 'hello' }, null, null),
			(error: unknown) => error instanceof ApiError && error.code === 'BOT_FORBIDDEN',
		);
	});

	test('a suspended creator disables Bot reads and writes before channel authorization', async () => {
		const secret = 's'.repeat(32);
		const state = createBotDb(secret, 'suspended');
		const list = new BotMessagesListEndpoint(state.db);
		const post = new BotPostEndpoint(state.db, { gen: () => 'message' } as unknown as IdService);

		await assert.rejects(
			() => list.exec({ botId: 'bot', secret, channelId: 'staff' }, null, null),
			(error: unknown) => error instanceof ApiError && error.code === 'BOT_FORBIDDEN',
		);
		await assert.rejects(
			() => post.exec({ botId: 'bot', secret, channelId: 'staff', body: 'hello' }, null, null),
			(error: unknown) => error instanceof ApiError && error.code === 'BOT_FORBIDDEN',
		);
		assert.equal(state.getChannelAccessQueries(), 0);
	});
});
