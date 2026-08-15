/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test } from 'vitest';
import type { DataSource } from 'typeorm';
import { ensureNookCommunity, getNookCommunityContext } from '@/nook/community/access.js';

describe('Nook Community access reads', () => {
	test('Community context reads never write companion rows', async () => {
		const calls: string[] = [];
		const db = {
			query: async (sql: string) => {
				calls.push(sql);
				if (sql.includes('FROM "channel" c')) return [{ userId: 'owner', joinMode: 'open', discoverable: true, initialized: true }];
				throw new Error(`Unexpected query: ${sql}`);
			},
		} as unknown as DataSource;

		const context = await getNookCommunityContext(db, 'community');
		assert.equal(context.ownerId, 'owner');
		assert.equal(calls.length, 1);
		assert.ok(calls.every(sql => sql.trimStart().startsWith('SELECT')));
	});

	test('ensure is SELECT-only after a Community is initialized', async () => {
		const calls: string[] = [];
		const db = {
			query: async (sql: string) => {
				calls.push(sql);
				if (sql.includes('FROM "channel" c')) return [{ userId: 'owner', joinMode: 'approval', discoverable: false, initialized: true }];
				throw new Error(`Unexpected query: ${sql}`);
			},
		} as unknown as DataSource;

		const context = await ensureNookCommunity(db, 'community');
		assert.equal(context.joinMode, 'approval');
		assert.equal(calls.length, 1);
		assert.ok(calls.every(sql => sql.trimStart().startsWith('SELECT')));
	});

	test('ensure initializes a missing companion row without updating an existing owner row', async () => {
		const calls: string[] = [];
		const db = {
			query: async (sql: string) => {
				calls.push(sql);
				if (sql.includes('FROM "channel" c')) return [{ userId: 'owner', joinMode: null, discoverable: null, initialized: false }];
				if (sql.includes('INSERT INTO "nook_community"')) return [];
				if (sql.includes('INSERT INTO "nook_community_member"')) return [];
				throw new Error(`Unexpected query: ${sql}`);
			},
		} as unknown as DataSource;

		await ensureNookCommunity(db, 'community');
		assert.equal(calls.filter(sql => sql.includes('INSERT INTO "nook_community"')).length, 1);
		const ownerInsert = calls.find(sql => sql.includes('INSERT INTO "nook_community_member"')) ?? '';
		assert.match(ownerInsert, /ON CONFLICT .* DO NOTHING/s);
		assert.doesNotMatch(ownerInsert, /DO UPDATE/);
	});
});
