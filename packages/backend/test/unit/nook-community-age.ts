/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test } from 'vitest';
import type { DataSource } from 'typeorm';
import {
	assertNookCommunityAgeModeForAllMembers,
	assertNookCommunityAgeModeForUser,
	isNookCommunityAgeModeAllowed,
	NookCommunityAgeError,
} from '@/nook/community/age.js';

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
