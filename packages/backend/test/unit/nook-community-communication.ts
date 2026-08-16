/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test } from 'vitest';
import type { DataSource } from 'typeorm';
import {
	assertNookCommunityAdultBoundaryForUserIds,
	listNookCommunityChannelAudienceUserIds,
	NookCommunityCommunicationError,
} from '@/nook/community/communication.js';

function policy(id: string, ageGroup: '13_15' | '18_PLUS', chatWithAdult: boolean, callWithAdult: boolean) {
	return { id, country: '*', ageGroup, accountStates: ['active'], permissions: { chat_with_adult: chatWithAdult, call_with_adult: callWithAdult }, priority: 0, enabled: true };
}
function user(id: string, ageGroup: '13_15' | '18_PLUS') {
	return { id, host: null, isDeleted: false, isSuspended: false, nookCountryCode: '*', nookVerifiedAgeGroup: ageGroup, nookPolicyId: null };
}
function boundaryDb(users: unknown[], policies: unknown[], enabled = true): DataSource {
	return {
		query: async (sql: string) => {
			if (sql.includes('FROM "nook_feature_flag"')) return [{ enabled }];
			if (sql.includes('FROM "user" u')) return users;
			if (sql.includes('FROM "nook_policy"')) return policies;
			throw new Error(`Unexpected query: ${sql}`);
		},
	} as unknown as DataSource;
}

describe('Nook Community adult communication boundary', () => {
	test('minor cannot use a Community channel to reach an adult when chat_with_adult is denied', async () => {
		const db = boundaryDb([user('minor', '13_15'), user('adult', '18_PLUS')], [policy('minor-policy', '13_15', false, false), policy('adult-policy', '18_PLUS', true, true)]);
		await assert.rejects(
			() => assertNookCommunityAdultBoundaryForUserIds(db, 'minor', ['adult'], 'chat_with_adult'),
			(error: unknown) => error instanceof NookCommunityCommunicationError && error.code === 'ADULT_BOUNDARY',
		);
	});

	test('adult cannot reach a minor whose chat_with_adult policy is denied', async () => {
		const db = boundaryDb([user('adult', '18_PLUS'), user('minor', '13_15')], [policy('minor-policy', '13_15', false, false), policy('adult-policy', '18_PLUS', true, true)]);
		await assert.rejects(
			() => assertNookCommunityAdultBoundaryForUserIds(db, 'adult', ['minor'], 'chat_with_adult'),
			(error: unknown) => error instanceof NookCommunityCommunicationError && error.code === 'ADULT_BOUNDARY',
		);
	});

	test('chat and call adult permissions stay independent', async () => {
		const db = boundaryDb([user('minor', '13_15'), user('adult', '18_PLUS')], [policy('minor-policy', '13_15', true, false), policy('adult-policy', '18_PLUS', true, true)]);
		await assert.doesNotReject(() => assertNookCommunityAdultBoundaryForUserIds(db, 'minor', ['adult'], 'chat_with_adult'));
		await assert.rejects(
			() => assertNookCommunityAdultBoundaryForUserIds(db, 'minor', ['adult'], 'call_with_adult'),
			(error: unknown) => error instanceof NookCommunityCommunicationError && error.code === 'ADULT_BOUNDARY',
		);
	});

	test('restricted channels only include members who can actually access them', async () => {
		const db = {
			query: async (sql: string) => {
				if (sql.includes('FROM "nook_community_channel" cc')) return [{ ownerId: 'owner', allowedRoleIds: ['minor-role'] }];
				if (sql.includes('FROM "nook_community_member"')) return [{ userId: 'owner', baseRole: 'owner' }, { userId: 'minor', baseRole: 'member' }, { userId: 'adult', baseRole: 'member' }];
				if (sql.includes('FROM "nook_community_member_role"')) return [{ userId: 'minor', roleId: 'minor-role', permissions: [] }];
				throw new Error(`Unexpected query: ${sql}`);
			},
		} as unknown as DataSource;
		const audience = await listNookCommunityChannelAudienceUserIds(db, 'community', 'private-channel');
		assert.deepEqual(new Set(audience), new Set(['owner', 'minor']));
	});

	test('disabled policy enforcement stops before querying age or policy data', async () => {
		const sqlCalls: string[] = [];
		const db = {
			query: async (sql: string) => {
				sqlCalls.push(sql);
				if (sql.includes('FROM "nook_feature_flag"')) return [{ enabled: false }];
				throw new Error(`Unexpected query: ${sql}`);
			},
		} as unknown as DataSource;
		await assert.doesNotReject(() => assertNookCommunityAdultBoundaryForUserIds(db, 'minor', ['adult'], 'chat_with_adult'));
		assert.equal(sqlCalls.length, 1);
		assert.match(sqlCalls[0] ?? '', /nook_feature_flag/);
	});
});
