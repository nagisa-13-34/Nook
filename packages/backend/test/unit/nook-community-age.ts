/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test } from 'vitest';
import type { DataSource } from 'typeorm';
import { NookCommunityAccessError } from '@/nook/community/access.js';
import {
	assertNookCommunityAgeModeForAllMembers,
	assertNookCommunityAgeModeForUser,
	isNookCommunityAgeModeAllowed,
	NookCommunityAgeError,
} from '@/nook/community/age.js';
import { requireNookCommunityChannelAccess } from '@/nook/community/channels.js';

describe('Nook Community age mode', () => {
	test('mixed accepts every age group while restricted modes reject unknown', () => {
		assert.equal(isNookCommunityAgeModeAllowed('mixed', 'UNKNOWN'), true);
		assert.equal(isNookCommunityAgeModeAllowed('minors_only', '13_15'), true);
		assert.equal(isNookCommunityAgeModeAllowed('minors_only', '18_PLUS'), false);
		assert.equal(isNookCommunityAgeModeAllowed('minors_only', 'UNKNOWN'), false);
		assert.equal(isNookCommunityAgeModeAllowed('adults_only', '18_PLUS'), true);
		assert.equal(isNookCommunityAgeModeAllowed('adults_only', '16_17'), false);
		assert.equal(isNookCommunityAgeModeAllowed('adults_only', 'UNKNOWN'), false);
	});

	test('remote users are treated as unknown for restricted Community modes', async () => {
		const db = {
			query: async (sql: string) => {
				if (sql.includes('FROM "user" u')) return [{ host: 'remote.example', nookVerifiedAgeGroup: '18_PLUS' }];
				throw new Error(`Unexpected query: ${sql}`);
			},
		} as unknown as DataSource;

		await assert.rejects(
			() => assertNookCommunityAgeModeForUser(db, 'adults_only', 'remote'),
			(error: unknown) => error instanceof NookCommunityAgeError && error.code === 'AGE_MODE_RESTRICTED',
		);
	});

	test('restricted channel access rechecks age after a member has already joined', async () => {
		const db = {
			query: async (sql: string) => {
				if (sql.includes('FROM "channel" c')) {
					return [{ userId: 'member', joinMode: 'open', ageMode: 'minors_only', discoverable: true, initialized: true }];
				}
				if (sql.includes('SELECT "baseRole", "state" FROM "nook_community_member"')) return [];
				if (sql.includes('FROM "user" u')) return [{ host: null, nookVerifiedAgeGroup: '18_PLUS' }];
				throw new Error(`Unexpected query: ${sql}`);
			},
		} as unknown as DataSource;

		await assert.rejects(
			() => requireNookCommunityChannelAccess(db, 'community', 'member', 'general'),
			(error: unknown) => error instanceof NookCommunityAccessError && error.code === 'FORBIDDEN',
		);
	});

	test('mixed and legacy Communities do not require an age lookup for channel access', async () => {
		let ageLookups = 0;
		const db = {
			query: async (sql: string) => {
				if (sql.includes('FROM "channel" c')) {
					return [{ userId: 'member', joinMode: null, ageMode: null, discoverable: null, initialized: false }];
				}
				if (sql.includes('SELECT "baseRole", "state" FROM "nook_community_member"')) return [];
				if (sql.includes('FROM "user" u')) {
					ageLookups++;
					return [{ host: null, nookVerifiedAgeGroup: null }];
				}
				if (sql.includes('FROM "nook_community_channel" WHERE "communityId"')) {
					return [{ id: 'general', communityId: 'community', parentId: null, name: 'General', topic: null, kind: 'text', position: 0, allowedRoleIds: [], archivedAt: null }];
				}
				throw new Error(`Unexpected query: ${sql}`);
			},
		} as unknown as DataSource;

		const channel = await requireNookCommunityChannelAccess(db, 'community', 'member', 'general');
		assert.equal(channel.id, 'general');
		assert.equal(ageLookups, 0);
	});

	test('age mode changes fail when an existing active member does not fit', async () => {
		const db = {
			query: async (sql: string) => {
				if (sql.includes('FROM (')) {
					return [
						{ userId: 'minor', host: null, nookVerifiedAgeGroup: '13_15' },
						{ userId: 'adult', host: null, nookVerifiedAgeGroup: '18_PLUS' },
					];
				}
				throw new Error(`Unexpected query: ${sql}`);
			},
		} as unknown as DataSource;

		await assert.rejects(
			() => assertNookCommunityAgeModeForAllMembers(db, 'community', 'minors_only'),
			(error: unknown) => error instanceof NookCommunityAgeError && error.code === 'AGE_MODE_CONFLICT',
		);
		await assert.rejects(
			() => assertNookCommunityAgeModeForAllMembers(db, 'community', 'adults_only'),
			(error: unknown) => error instanceof NookCommunityAgeError && error.code === 'AGE_MODE_CONFLICT',
		);
	});
});
