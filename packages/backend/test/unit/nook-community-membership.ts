/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test } from 'vitest';
import type { DataSource } from 'typeorm';
import { respondNookCommunityJoinRequest, useNookCommunityInvite, NookCommunityMembershipError } from '@/nook/community/membership.js';

function inviteRecord() {
	return [{
		id: 'invite', communityId: 'community', defaultBaseRole: 'member', maxUses: 10, useCount: 0,
		expiresAt: null, revokedAt: null,
	}];
}

describe('Nook Community membership boundaries', () => {
	test('invite cannot reactivate a banned member or consume the invite', async () => {
		const calls: Array<{ sql: string; params: unknown[] }> = [];
		const manager = {
			query: async (sql: string, params: unknown[] = []) => {
				calls.push({ sql, params });
				if (sql.includes('FROM "nook_community_invite"')) return inviteRecord();
				if (sql.includes('SELECT "state" FROM "nook_community_member"')) return [{ state: 'banned' }];
				throw new Error(`Unexpected query: ${sql}`);
			},
		};
		const db = {
			transaction: async <T>(callback: (transactionManager: typeof manager) => Promise<T>) => await callback(manager),
		} as unknown as DataSource;

		await assert.rejects(
			() => useNookCommunityInvite(db, 'invite-token', 'banned-user'),
			(error: unknown) => error instanceof NookCommunityMembershipError && error.code === 'BANNED',
		);
		assert.equal(calls.some(call => call.sql.includes('INSERT INTO "nook_community_member"')), false);
		assert.equal(calls.some(call => call.sql.includes('"useCount" = "useCount" + 1')), false);
	});

	test('active member cannot reuse an invite, change base role, or consume the invite', async () => {
		const calls: Array<{ sql: string; params: unknown[] }> = [];
		const manager = {
			query: async (sql: string, params: unknown[] = []) => {
				calls.push({ sql, params });
				if (sql.includes('FROM "nook_community_invite"')) return inviteRecord();
				if (sql.includes('SELECT "state" FROM "nook_community_member"')) return [{ state: 'active' }];
				throw new Error(`Unexpected query: ${sql}`);
			},
		};
		const db = {
			transaction: async <T>(callback: (transactionManager: typeof manager) => Promise<T>) => await callback(manager),
		} as unknown as DataSource;

		await assert.rejects(
			() => useNookCommunityInvite(db, 'invite-token', 'existing-admin'),
			(error: unknown) => error instanceof NookCommunityMembershipError && error.code === 'ALREADY_MEMBER',
		);
		assert.equal(calls.some(call => call.sql.includes('INSERT INTO "nook_community_member"')), false);
		assert.equal(calls.some(call => call.sql.includes('"useCount" = "useCount" + 1')), false);
	});

	test('join request lookup is bound to the supplied Community before mutation', async () => {
		const calls: Array<{ sql: string; params: unknown[] }> = [];
		const manager = {
			query: async (sql: string, params: unknown[] = []) => {
				calls.push({ sql, params });
				return [];
			},
		};
		const db = {
			transaction: async <T>(callback: (transactionManager: typeof manager) => Promise<T>) => await callback(manager),
		} as unknown as DataSource;

		await assert.rejects(
			() => respondNookCommunityJoinRequest(db, 'community-a', 'request-from-b', 'moderator', true),
			(error: unknown) => error instanceof NookCommunityMembershipError && error.code === 'NO_SUCH_REQUEST',
		);
		assert.deepEqual(calls[0]?.params, ['request-from-b', 'community-a']);
		assert.match(calls[0]?.sql ?? '', /"communityId" = \$2/);
	});
});
