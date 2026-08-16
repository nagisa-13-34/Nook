/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test } from 'vitest';
import type { DataSource } from 'typeorm';
import type { IdService } from '@/core/IdService.js';
import { leaveNookCommunity, requestNookCommunityJoin, respondNookCommunityJoinRequest, useNookCommunityInvite, NookCommunityMembershipError } from '@/nook/community/membership.js';

function inviteRecord() {
	return [{ id: 'invite', communityId: 'community', defaultBaseRole: 'member', maxUses: 10, useCount: 0, expiresAt: null, revokedAt: null }];
}
function communityContext() {
	return [{ userId: 'owner', joinMode: 'open', ageMode: 'mixed', discoverable: true, initialized: true }];
}
function ageModeRow() {
	return [{ ageMode: 'mixed' }];
}

describe('Nook Community membership boundaries', () => {
	test('invite cannot reactivate a banned member or consume the invite', async () => {
		const calls: Array<{ sql: string; params: unknown[] }> = [];
		const manager = { query: async (sql: string, params: unknown[] = []) => {
			calls.push({ sql, params });
			if (sql.includes('FROM "nook_community_invite"')) return inviteRecord();
			if (sql.includes('SELECT "ageMode" FROM "nook_community"')) return ageModeRow();
			if (sql.includes('SELECT "state" FROM "nook_community_member"')) return [{ state: 'banned' }];
			throw new Error(`Unexpected query: ${sql}`);
		} };
		const db = { transaction: async <T>(callback: (transactionManager: typeof manager) => Promise<T>) => await callback(manager) } as unknown as DataSource;
		await assert.rejects(() => useNookCommunityInvite(db, 'invite-token', 'banned-user'), error => error instanceof NookCommunityMembershipError && error.code === 'BANNED');
		assert.equal(calls.some(call => call.sql.includes('INSERT INTO "nook_community_member"')), false);
		assert.equal(calls.some(call => call.sql.includes('"useCount" = "useCount" + 1')), false);
	});

	test('banned member cannot remove their ban with leave then join or invite', async () => {
		const calls: Array<{ sql: string; params: unknown[] }> = [];
		const manager = { query: async (sql: string, params: unknown[] = []) => {
			calls.push({ sql, params });
			if (sql.includes('FROM "nook_community_invite"')) return inviteRecord();
			if (sql.includes('SELECT "ageMode" FROM "nook_community"')) return ageModeRow();
			if (sql.includes('SELECT "state" FROM "nook_community_member"')) return [{ state: 'banned' }];
			throw new Error(`Unexpected transaction query: ${sql}`);
		} };
		const db = {
			query: async (sql: string, params: unknown[] = []) => {
				calls.push({ sql, params });
				if (sql.includes('FROM "channel" c')) return communityContext();
				if (sql.includes('SELECT "baseRole", "state" FROM "nook_community_member"')) return [{ baseRole: 'member', state: 'banned' }];
				if (sql.includes('FROM "nook_community_member_role"')) return [];
				throw new Error(`Unexpected query: ${sql}`);
			},
			transaction: async <T>(callback: (transactionManager: typeof manager) => Promise<T>) => await callback(manager),
		} as unknown as DataSource;
		const idService = { gen: () => 'request' } as unknown as IdService;
		await assert.rejects(() => leaveNookCommunity(db, 'community', 'banned-user'), error => error instanceof NookCommunityMembershipError && error.code === 'BANNED');
		await assert.rejects(() => requestNookCommunityJoin(db, idService, 'community', 'banned-user', null), error => error instanceof NookCommunityMembershipError && error.code === 'BANNED');
		await assert.rejects(() => useNookCommunityInvite(db, 'invite-token', 'banned-user'), error => error instanceof NookCommunityMembershipError && error.code === 'BANNED');
		assert.equal(calls.some(call => call.sql.startsWith('DELETE FROM "nook_community_member"')), false);
		assert.equal(calls.some(call => call.sql.includes('"useCount" = "useCount" + 1')), false);
	});

	test('active member cannot reuse an invite, change base role, or consume the invite', async () => {
		const calls: Array<{ sql: string; params: unknown[] }> = [];
		const manager = { query: async (sql: string, params: unknown[] = []) => {
			calls.push({ sql, params });
			if (sql.includes('FROM "nook_community_invite"')) return inviteRecord();
			if (sql.includes('SELECT "ageMode" FROM "nook_community"')) return ageModeRow();
			if (sql.includes('SELECT "state" FROM "nook_community_member"')) return [{ state: 'active' }];
			throw new Error(`Unexpected query: ${sql}`);
		} };
		const db = { transaction: async <T>(callback: (transactionManager: typeof manager) => Promise<T>) => await callback(manager) } as unknown as DataSource;
		await assert.rejects(() => useNookCommunityInvite(db, 'invite-token', 'existing-admin'), error => error instanceof NookCommunityMembershipError && error.code === 'ALREADY_MEMBER');
		assert.equal(calls.some(call => call.sql.includes('INSERT INTO "nook_community_member"')), false);
		assert.equal(calls.some(call => call.sql.includes('"useCount" = "useCount" + 1')), false);
	});

	test('join request lookup is bound to the supplied Community before mutation', async () => {
		const calls: Array<{ sql: string; params: unknown[] }> = [];
		const manager = { query: async (sql: string, params: unknown[] = []) => {
			calls.push({ sql, params });
			if (sql.includes('SELECT "ageMode" FROM "nook_community"')) return ageModeRow();
			if (sql.includes('FROM "nook_community_join_request"')) return [];
			throw new Error(`Unexpected query: ${sql}`);
		} };
		const db = { transaction: async <T>(callback: (transactionManager: typeof manager) => Promise<T>) => await callback(manager) } as unknown as DataSource;
		await assert.rejects(() => respondNookCommunityJoinRequest(db, 'community-a', 'request-from-b', 'moderator', true), error => error instanceof NookCommunityMembershipError && error.code === 'NO_SUCH_REQUEST');
		const requestCall = calls.find(call => call.sql.includes('FROM "nook_community_join_request"'));
		assert.deepEqual(requestCall?.params, ['request-from-b', 'community-a']);
		assert.match(requestCall?.sql ?? '', /"communityId" = \$2/);
	});

	test('join approval policy is checked before activating the member', async () => {
		const calls: Array<{ sql: string; params: unknown[] }> = [];
		const manager = { query: async (sql: string, params: unknown[] = []) => {
			calls.push({ sql, params });
			if (sql.includes('SELECT "ageMode" FROM "nook_community"')) return ageModeRow();
			if (sql.includes('FROM "nook_community_join_request"')) return [{ communityId: 'community', userId: 'requester', status: 'pending' }];
			throw new Error(`Unexpected query: ${sql}`);
		} };
		const db = { transaction: async <T>(callback: (transactionManager: typeof manager) => Promise<T>) => await callback(manager) } as unknown as DataSource;
		await assert.rejects(
			() => respondNookCommunityJoinRequest(db, 'community', 'request', 'moderator', true, async userId => { assert.equal(userId, 'requester'); throw new Error('POLICY_DENIED'); }),
			/POLICY_DENIED/,
		);
		assert.equal(calls.some(call => call.sql.includes('INSERT INTO "nook_community_member"')), false);
		assert.equal(calls.some(call => call.sql.includes('UPDATE "nook_community_join_request" SET "status"')), false);
	});

	test('approval-request message is rejected before storage when the adult boundary denies communication', async () => {
		const calls: Array<{ sql: string; params: unknown[] }> = [];
		const manager = { query: async (sql: string, params: unknown[] = []) => {
			calls.push({ sql, params });
			if (sql.includes('SELECT "ageMode" FROM "nook_community"')) return ageModeRow();
			if (sql.includes('SELECT "userId" FROM "nook_community_member"')) return [{ userId: 'adult' }];
			if (sql.includes('FROM "nook_feature_flag"')) return [{ enabled: true }];
			if (sql.includes('FROM "user" u')) return [
				{ id: 'minor', host: null, isDeleted: false, isSuspended: false, nookCountryCode: '*', nookVerifiedAgeGroup: '13_15', nookPolicyId: null },
				{ id: 'adult', host: null, isDeleted: false, isSuspended: false, nookCountryCode: '*', nookVerifiedAgeGroup: '18_PLUS', nookPolicyId: null },
			];
			if (sql.includes('FROM "nook_policy"')) return [
				{ id: 'minor-policy', country: '*', ageGroup: '13_15', accountStates: ['active'], permissions: { chat_with_adult: false }, priority: 0, enabled: true },
				{ id: 'adult-policy', country: '*', ageGroup: '18_PLUS', accountStates: ['active'], permissions: { chat_with_adult: true }, priority: 0, enabled: true },
			];
			if (sql.includes('INSERT INTO "nook_community_join_request"')) throw new Error('JOIN_REQUEST_WAS_STORED');
			throw new Error(`Unexpected transaction query: ${sql}`);
		} };
		const db = {
			query: async (sql: string) => {
				if (sql.includes('FROM "channel" c')) return [{ userId: 'adult', joinMode: 'approval', ageMode: 'mixed', discoverable: true, initialized: true }];
				if (sql.includes('SELECT "baseRole", "state" FROM "nook_community_member"')) return [];
				throw new Error(`Unexpected query: ${sql}`);
			},
			transaction: async <T>(callback: (transactionManager: typeof manager) => Promise<T>) => await callback(manager),
		} as unknown as DataSource;
		const idService = { gen: () => 'request' } as unknown as IdService;

		await assert.rejects(
			() => requestNookCommunityJoin(db, idService, 'community', 'minor', 'hello'),
			(error: unknown) => error instanceof NookCommunityMembershipError && error.code === 'ADULT_BOUNDARY_RESTRICTED',
		);
		assert.equal(calls.some(call => call.sql.includes('INSERT INTO "nook_community_join_request"')), false);
	});
});
