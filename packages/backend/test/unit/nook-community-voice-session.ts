/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test } from 'vitest';
import type { DataSource } from 'typeorm';
import { leaveNookCommunityVoice } from '@/nook/community/voice.js';

describe('Nook Community Voice session generations', () => {
	test('stale session leave cannot delete signals for a newer session', async () => {
		const calls: Array<{ sql: string; params: unknown[] }> = [];
		const db = {
			query: async (sql: string, params: unknown[] = []) => {
				calls.push({ sql, params });
				if (sql.includes('DELETE FROM "nook_community_voice_presence"')) return [];
				throw new Error(`Unexpected query: ${sql}`);
			},
		} as unknown as DataSource;

		await leaveNookCommunityVoice(db, 'voice', 'user', 'old-session');
		assert.equal(calls.length, 1);
		assert.match(calls[0]?.sql ?? '', /RETURNING "sessionId"/);
		assert.equal(calls.some(call => call.sql.includes('DELETE FROM "nook_community_voice_signal"')), false);
	});

	test('matching session leave removes that generation and its queued signals', async () => {
		const calls: Array<{ sql: string; params: unknown[] }> = [];
		const db = {
			query: async (sql: string, params: unknown[] = []) => {
				calls.push({ sql, params });
				if (sql.includes('DELETE FROM "nook_community_voice_presence"')) return [{ sessionId: 'current-session' }];
				if (sql.includes('DELETE FROM "nook_community_voice_signal"')) return [];
				throw new Error(`Unexpected query: ${sql}`);
			},
		} as unknown as DataSource;

		await leaveNookCommunityVoice(db, 'voice', 'user', 'current-session');
		assert.equal(calls.some(call => call.sql.includes('DELETE FROM "nook_community_voice_signal"')), true);
	});
});
