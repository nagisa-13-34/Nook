/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test } from 'vitest';
import type { DataSource } from 'typeorm';
import type { MiMeta } from '@/models/_.js';
import type { HttpRequestService } from '@/core/HttpRequestService.js';
import { NookTranslationService, nookTranslationCacheTtlDays, purgeNookTranslationCache } from '@/nook/translation/NookTranslationService.js';

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

	test('concurrent identical translations share one external request', async () => {
		const db = {
			query: async (sql: string) => {
				if (sql.includes('SELECT "sourceLang"')) return [];
				return [];
			},
		} as unknown as DataSource;
		let sendCount = 0;
		let releaseResponse: (() => void) | undefined;
		let markStarted: (() => void) | undefined;
		const waitForRelease = new Promise<void>(resolve => { releaseResponse = resolve; });
		const started = new Promise<void>(resolve => { markStarted = resolve; });
		const http = {
			send: async () => {
				sendCount++;
				markStarted?.();
				await waitForRelease;
				return {
					json: async () => ({ translations: [{ detected_source_language: 'JA', text: 'hello' }] }),
				};
			},
		} as unknown as HttpRequestService;
		const settings = { deeplAuthKey: 'test-key', deeplIsPro: false } as unknown as MiMeta;
		const service = new NookTranslationService(db, settings, http);

		const first = service.translate('communityMessage', 'message-id', 'こんにちは', 'en-US');
		const second = service.translate('communityMessage', 'message-id', 'こんにちは', 'en-US');
		await started;
		assert.equal(sendCount, 1);
		releaseResponse?.();
		const results = await Promise.all([first, second]);
		assert.deepEqual(results[0], results[1]);
		assert.equal(sendCount, 1);
	});
});
