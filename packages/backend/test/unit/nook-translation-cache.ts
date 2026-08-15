/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test } from 'vitest';
import type { DataSource } from 'typeorm';
import { nookTranslationCacheTtlDays, purgeNookTranslationCache } from '@/nook/translation/NookTranslationService.js';

describe('Nook translation cache privacy', () => {
	test('cache retention is bounded', () => {
		assert.equal(nookTranslationCacheTtlDays, 30);
	});

	test('source object cleanup removes every cached translation for that object', async () => {
		const calls: Array<{ sql: string; params: unknown[] }> = [];
		const db = {
			query: async (sql: string, params: unknown[] = []) => {
				calls.push({ sql, params });
				return [];
			},
		} as unknown as DataSource;

		await purgeNookTranslationCache(db, 'communityMessage', 'message-id');
		assert.equal(calls.length, 1);
		assert.match(calls[0]?.sql ?? '', /DELETE FROM "nook_translation_cache"/);
		assert.deepEqual(calls[0]?.params, ['communityMessage', 'message-id']);
	});
});
