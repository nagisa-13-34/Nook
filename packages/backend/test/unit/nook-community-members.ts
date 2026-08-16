/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test } from 'vitest';
import type { DataSource } from 'typeorm';
import { listNookCommunityMembers, updateNookCommunityMember, NookCommunityMemberError } from '@/nook/community/members.js';

function initializedCommunity() {
	return [{ userId: 'owner', joinMode: 'open', ageMode: 'mixed', discoverable: true, initialized: true }];
}

describe('Nook Community member state', () => {
	test('legacy Channel owner is listed synthetically without database writes', async () => {
		const calls: string[] = [];
		const createdAt = new Date('2026-01-01T00:00:00Z');
		const db = {
			query: async (sql: string) => {
				calls.push(sql);
				if (sql.includes('FROM "nook_community_member" m')) return [];
				if (sql.includes('FROM "channel"')) return [{ userId: 'owner', createdAt }];
				throw new Error(`Unexpected query: ${sql}`);
			},
		} as unknown as DataSource;
		const members = await listNookCommunityMembers(db, 'community');
		assert.equal(members.length, 1);
		assert.equal(members[0]?.userId, 'owner');
		assert.equal(members[0]?.baseRole, 'owner');
		assert.equal(members[0]?.state, 'active');
		assert.deepEqual(members[0]?.roleIds, []);
		assert.equal(calls.some(sql => /INSERT|UPDATE|DELETE/.test(sql)), false);
	});

	test('banning a member removes their Community event RSVPs', async () => {
		const calls: string[] = [];
		const manager = { query: async (sql: string) => {
			calls.push(sql);
			if (sql.includes('SELECT "state" FROM "nook_community_member"')) return [{ state: 'active' }];
			if (sql.includes('UPDATE "nook_community_member"')) return [];
			if (sql.includes('DELETE FROM "nook_community_event_rsvp"')) return [];
			throw new Error(`Unexpected transaction query: ${sql}`);
		} };
		const db = {
			query: async (sql: string) => {
				calls.push(sql);
				if (sql.includes('FROM "channel" c')) return initializedCommunity();
				throw new Error(`Unexpected query: ${sql}`);
			},
			transaction: async <T>(callback: (transactionManager: typeof manager) => Promise<T>) => await callback(manager),
		} as unknown as DataSource;
		await updateNookCommunityMember(db, 'community', 'member', { state: 'banned' });
		assert.equal(calls.some(sql => sql.includes('DELETE FROM "nook_community_event_rsvp"')), true);
	});

	test('banned to active fails closed without a policy guard', async () => {
		const calls: string[] = [];
		const manager = { query: async (sql: string) => {
			calls.push(sql);
			if (sql.includes('SELECT "ageMode" FROM "nook_community"')) return [{ ageMode: 'mixed' }];
			if (sql.includes('SELECT "state" FROM "nook_community_member"')) return [{ state: 'banned' }];
			throw new Error(`Unexpected transaction query: ${sql}`);
		} };
		const db = {
			query: async (sql: string) => {
				if (sql.includes('FROM "channel" c')) return initializedCommunity();
				throw new Error(`Unexpected query: ${sql}`);
			},
			transaction: async <T>(callback: (transactionManager: typeof manager) => Promise<T>) => await callback(manager),
		} as unknown as DataSource;
		await assert.rejects(
			() => updateNookCommunityMember(db, 'community', 'member', { state: 'active' }),
			(error: unknown) => error instanceof NookCommunityMemberError && error.code === 'ACTIVATION_CHECK_REQUIRED',
		);
		assert.equal(calls.some(sql => sql.includes('UPDATE "nook_community_member"')), false);
	});

	test('reactivation policy denial happens before the membership write', async () => {
		const calls: string[] = [];
		let policyChecked = false;
		const manager = { query: async (sql: string) => {
			calls.push(sql);
			if (sql.includes('SELECT "ageMode" FROM "nook_community"')) return [{ ageMode: 'mixed' }];
			if (sql.includes('SELECT "state" FROM "nook_community_member"')) return [{ state: 'banned' }];
			throw new Error(`Unexpected transaction query: ${sql}`);
		} };
		const db = {
			query: async (sql: string) => {
				if (sql.includes('FROM "channel" c')) return initializedCommunity();
				throw new Error(`Unexpected query: ${sql}`);
			},
			transaction: async <T>(callback: (transactionManager: typeof manager) => Promise<T>) => await callback(manager),
		} as unknown as DataSource;
		await assert.rejects(
			() => updateNookCommunityMember(db, 'community', 'member', { state: 'active' }, async () => { policyChecked = true; throw new Error('POLICY_DENIED'); }),
			/POLICY_DENIED/,
		);
		assert.equal(policyChecked, true);
		assert.equal(calls.some(sql => sql.includes('UPDATE "nook_community_member"')), false);
	});

	test('already active member updates do not require a reactivation policy guard', async () => {
		const calls: string[] = [];
		const manager = { query: async (sql: string) => {
			calls.push(sql);
			if (sql.includes('SELECT "ageMode" FROM "nook_community"')) return [{ ageMode: 'mixed' }];
			if (sql.includes('SELECT "state" FROM "nook_community_member"')) return [{ state: 'active' }];
			if (sql.includes('UPDATE "nook_community_member"')) return [];
			throw new Error(`Unexpected transaction query: ${sql}`);
		} };
		const db = {
			query: async (sql: string) => {
				if (sql.includes('FROM "channel" c')) return initializedCommunity();
				throw new Error(`Unexpected query: ${sql}`);
			},
			transaction: async <T>(callback: (transactionManager: typeof manager) => Promise<T>) => await callback(manager),
		} as unknown as DataSource;
		await updateNookCommunityMember(db, 'community', 'member', { state: 'active', nickname: 'new name' });
		assert.equal(calls.some(sql => sql.includes('UPDATE "nook_community_member"')), true);
	});
});
