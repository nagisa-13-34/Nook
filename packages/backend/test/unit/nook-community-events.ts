/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test } from 'vitest';
import type { DataSource } from 'typeorm';
import type { IdService } from '@/core/IdService.js';
import { createNookCommunityEvent, listNookCommunityEvents, listNookEvents, setNookCommunityEventRsvp } from '@/nook/community/events.js';

describe('Nook event visibility and membership boundaries', () => {
	test('Community event counts include only active members or the underlying Channel owner', async () => {
		let sql = '';
		const db = {
			query: async (query: string) => {
				sql = query;
				return [];
			},
		} as unknown as DataSource;

		await listNookCommunityEvents(db, 'community', 'viewer', null, 50);
		assert.match(sql, /rm\."state" = 'active'/);
		assert.match(sql, /owner_channel\."userId" = r\."userId"/);
		assert.match(sql, /e\."visibility" IN \('public', 'community'\) OR e\."creatorId" = \$2/);
	});

	test('global event list exposes public events and eligible Community events without listing unlisted/private events from others', async () => {
		let sql = '';
		const db = {
			query: async (query: string) => {
				sql = query;
				return [];
			},
		} as unknown as DataSource;

		await listNookEvents(db, 'viewer', null, 50);
		assert.match(sql, /e\."visibility" = 'public'/);
		assert.match(sql, /e\."creatorId" = \$1/);
		assert.match(sql, /e\."visibility" = 'community'/);
		assert.match(sql, /vm\."state" = 'active'/);
		assert.doesNotMatch(sql, /e\."visibility" = 'unlisted'/);
		assert.doesNotMatch(sql, /e\."visibility" = 'private'/);
	});

	test('legacy Community create wrapper keeps community/community defaults', async () => {
		let insertParams: unknown[] = [];
		const db = {
			query: async (sql: string, params?: unknown[]) => {
				if (sql.includes('INSERT INTO "nook_community_event"')) insertParams = params ?? [];
				return [];
			},
		} as unknown as DataSource;
		const idService = {
			gen: () => 'event-id',
		} as unknown as IdService;

		const id = await createNookCommunityEvent(db, idService, {
			communityId: 'community',
			creatorId: 'creator',
			title: 'Legacy Community event',
			description: null,
			location: null,
			startsAt: new Date('2030-01-01T00:00:00.000Z'),
			endsAt: null,
			maxAttendees: null,
			textChannelId: null,
			voiceChannelId: null,
		});

		assert.strictEqual(id, 'event-id');
		assert.strictEqual(insertParams[11], 'community');
		assert.strictEqual(insertParams[12], 'community');
	});

	test('Community-scoped event capacity ignores stale RSVPs from inactive users', async () => {
		const calls: string[] = [];
		const manager = {
			query: async (sql: string) => {
				calls.push(sql);
				if (sql.includes('FROM "nook_community_event" WHERE')) {
					return [{
						communityId: 'community',
						creatorId: 'creator',
						visibility: 'community',
						participation: 'community',
						maxAttendees: 1,
						cancelledAt: null,
					}];
				}
				if (sql.includes('AS allowed')) return [{ allowed: true }];
				if (sql.includes('SELECT count(*)::text AS count')) return [{ count: '0' }];
				if (sql.includes('INSERT INTO "nook_community_event_rsvp"')) return [];
				throw new Error(`Unexpected query: ${sql}`);
			},
		};
		const db = {
			transaction: async <T>(callback: (transactionManager: typeof manager) => Promise<T>) => await callback(manager),
		} as unknown as DataSource;

		await setNookCommunityEventRsvp(db, 'event', 'active-user', 'going');
		const accessQuery = calls.find(sql => sql.includes('AS allowed')) ?? '';
		assert.match(accessQuery, /m\."state"='active'/);
		assert.match(accessQuery, /FROM "channel" c/);
		const countQuery = calls.find(sql => sql.includes('SELECT count(*)::text AS count')) ?? '';
		assert.match(countQuery, /m\."state"='active'/);
		assert.match(countQuery, /FROM "channel" c/);
	});

	test('standalone anyone event capacity does not require Community membership', async () => {
		const calls: string[] = [];
		const manager = {
			query: async (sql: string) => {
				calls.push(sql);
				if (sql.includes('FROM "nook_community_event" WHERE')) {
					return [{
						communityId: null,
						creatorId: 'creator',
						visibility: 'public',
						participation: 'anyone',
						maxAttendees: 1,
						cancelledAt: null,
					}];
				}
				if (sql.includes('SELECT count(*)::text AS count')) return [{ count: '0' }];
				if (sql.includes('INSERT INTO "nook_community_event_rsvp"')) return [];
				throw new Error(`Unexpected query: ${sql}`);
			},
		};
		const db = {
			transaction: async <T>(callback: (transactionManager: typeof manager) => Promise<T>) => await callback(manager),
		} as unknown as DataSource;

		await setNookCommunityEventRsvp(db, 'event', 'viewer', 'going');
		assert.ok(!calls.some(sql => sql.includes('AS allowed')));
		const countQuery = calls.find(sql => sql.includes('SELECT count(*)::text AS count')) ?? '';
		assert.match(countQuery, /"userId"<>\$2/);
		assert.doesNotMatch(countQuery, /nook_community_member/);
	});
});
