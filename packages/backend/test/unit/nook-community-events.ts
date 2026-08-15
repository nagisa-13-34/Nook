/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test } from 'vitest';
import type { DataSource } from 'typeorm';
import { listNookCommunityEvents, setNookCommunityEventRsvp } from '@/nook/community/events.js';

describe('Nook Community event membership boundaries', () => {
	test('event counts include only active members or the underlying Channel owner', async () => {
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
	});

	test('event capacity ignores stale going RSVPs from inactive users', async () => {
		const calls: string[] = [];
		const manager = {
			query: async (sql: string) => {
				calls.push(sql);
				if (sql.includes('FROM "nook_community_event" WHERE')) return [{ communityId: 'community', maxAttendees: 1, cancelledAt: null }];
				if (sql.includes('SELECT count(*)::text AS count')) return [{ count: '0' }];
				if (sql.includes('INSERT INTO "nook_community_event_rsvp"')) return [];
				throw new Error(`Unexpected query: ${sql}`);
			},
		};
		const db = {
			transaction: async <T>(callback: (transactionManager: typeof manager) => Promise<T>) => await callback(manager),
		} as unknown as DataSource;

		await setNookCommunityEventRsvp(db, 'event', 'active-user', 'going');
		const countQuery = calls.find(sql => sql.includes('SELECT count(*)::text AS count')) ?? '';
		assert.match(countQuery, /m\."state"='active'/);
		assert.match(countQuery, /FROM "channel" c/);
	});
});
