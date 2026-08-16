/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test } from 'vitest';
import type { DataSource } from 'typeorm';
import type { NookAccessService } from '@/nook/policy/NookAccessService.js';
import { joinNookCommunityVoice, leaveNookCommunityVoice } from '@/nook/community/voice.js';

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

	test('rejoin serializes the age-boundary check before installing the new presence session', async () => {
		const transactionCalls: string[] = [];
		const manager = {
			query: async (sql: string) => {
				transactionCalls.push(sql);
				if (sql.includes('pg_advisory_xact_lock')) return [];
				if (sql.includes('SELECT "userId" FROM "nook_community_voice_presence"')) return [];
				if (sql.includes('DELETE FROM "nook_community_voice_signal"')) return [];
				if (sql.includes('INSERT INTO "nook_community_voice_presence"')) return [];
				throw new Error(`Unexpected transaction query: ${sql}`);
			},
		};
		const db = {
			query: async (sql: string) => {
				if (sql.includes('FROM "user"')) return [{ id: 'user', isDeleted: false, isSuspended: false }];
				if (sql.includes('FROM "channel" c')) return [{ userId: 'user', joinMode: 'open', discoverable: true, initialized: true }];
				if (sql.includes('SELECT "baseRole", "state" FROM "nook_community_member"')) return [{ baseRole: 'owner', state: 'active' }];
				if (sql.includes('FROM "nook_community_channel" WHERE "communityId"')) return [{ id: 'voice', communityId: 'community', parentId: null, name: 'Voice', topic: null, kind: 'voice', position: 0, allowedRoleIds: [], archivedAt: null }];
				if (sql.includes('DELETE FROM "nook_community_voice_presence" WHERE "lastSeenAt"')) return [];
				if (sql.includes('DELETE FROM "nook_community_voice_signal" WHERE "createdAt"')) return [];
				if (sql.includes('SELECT "userId","sessionId" FROM "nook_community_voice_presence"')) return [];
				throw new Error(`Unexpected query: ${sql}`);
			},
			transaction: async <T>(callback: (transactionManager: typeof manager) => Promise<T>) => await callback(manager),
		} as unknown as DataSource;
		const access = {
			isFeatureEnabled: async () => true,
			evaluate: async (_user: unknown, permission: 'voice_call') => ({ allowed: true, permission, policyId: null, reason: 'allowed' as const }),
		} as unknown as NookAccessService;

		await joinNookCommunityVoice(db, access, 'community', 'voice', 'user');
		assert.equal(transactionCalls.length, 4);
		assert.match(transactionCalls[0] ?? '', /pg_advisory_xact_lock/);
		assert.match(transactionCalls[1] ?? '', /SELECT "userId" FROM "nook_community_voice_presence"/);
		assert.match(transactionCalls[2] ?? '', /DELETE FROM "nook_community_voice_signal"/);
		assert.match(transactionCalls[3] ?? '', /INSERT INTO "nook_community_voice_presence"/);
	});
});
