/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createHash } from 'node:crypto';
import { URLSearchParams } from 'node:url';
import { Inject, Injectable } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import type { MiMeta } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';

export type NookTranslationKind = 'note' | 'communityMessage' | 'communityAnnouncement' | 'communityEvent';
export const nookTranslationCacheTtlDays = 30;
const maxConcurrentExternalTranslations = 4;

type NookTranslationResult = { sourceLang: string; text: string };

export class NookTranslationUnavailableError extends Error {}

export async function purgeNookTranslationCache(db: DataSource, kind: NookTranslationKind, objectId: string): Promise<void> {
	await db.query('DELETE FROM "nook_translation_cache" WHERE "kind"=$1 AND "objectId"=$2', [kind, objectId]);
}

@Injectable()
export class NookTranslationService {
	private nextCacheCleanupAt = 0;
	private readonly inFlight = new Map<string, Promise<NookTranslationResult>>();
	private activeExternalTranslations = 0;
	private readonly externalTranslationWaiters: Array<() => void> = [];

	constructor(
		@Inject(DI.db) private db: DataSource,
		@Inject(DI.meta) private serverSettings: MiMeta,
		private httpRequestService: HttpRequestService,
	) {}

	private async cleanupExpiredCache(): Promise<void> {
		const now = Date.now();
		if (now < this.nextCacheCleanupAt) return;
		this.nextCacheCleanupAt = now + 60 * 60 * 1000;
		try {
			await this.db.query(`DELETE FROM "nook_translation_cache" WHERE "createdAt" < now() - interval '${nookTranslationCacheTtlDays} days'`);
		} catch {
			// Cache cleanup must never make translation unavailable.
		}
	}

	private async acquireExternalTranslationSlot(): Promise<void> {
		if (this.activeExternalTranslations < maxConcurrentExternalTranslations) {
			this.activeExternalTranslations++;
			return;
		}
		await new Promise<void>(resolve => this.externalTranslationWaiters.push(resolve));
	}

	private releaseExternalTranslationSlot(): void {
		const next = this.externalTranslationWaiters.shift();
		if (next != null) {
			next();
			return;
		}
		this.activeExternalTranslations = Math.max(0, this.activeExternalTranslations - 1);
	}

	private async translateUncached(kind: NookTranslationKind, objectId: string, sourceHash: string, text: string, targetLang: string): Promise<NookTranslationResult> {
		await this.acquireExternalTranslationSlot();
		let translation: { detected_source_language: string; text: string } | undefined;
		try {
			const params = new URLSearchParams();
			params.append('text', text);
			params.append('target_lang', targetLang);
			const endpoint = this.serverSettings.deeplIsPro ? 'https://api.deepl.com/v2/translate' : 'https://api-free.deepl.com/v2/translate';
			const response = await this.httpRequestService.send(endpoint, {
				method: 'POST',
				headers: {
					Authorization: `DeepL-Auth-Key ${this.serverSettings.deeplAuthKey}`,
					'Content-Type': 'application/x-www-form-urlencoded',
					Accept: 'application/json, */*',
				},
				body: params.toString(),
			});
			const json = await response.json() as { translations?: Array<{ detected_source_language: string; text: string }> };
			translation = json.translations?.[0];
			if (translation == null) throw new NookTranslationUnavailableError();
		} finally {
			this.releaseExternalTranslationSlot();
		}

		await this.db.query(
			`INSERT INTO "nook_translation_cache" ("kind","objectId","sourceHash","targetLang","sourceLang","translatedText")
			 VALUES ($1,$2,$3,$4,$5,$6)
			 ON CONFLICT ("kind","objectId","sourceHash","targetLang") DO UPDATE
			 SET "sourceLang"=EXCLUDED."sourceLang", "translatedText"=EXCLUDED."translatedText", "createdAt"=now()`,
			[kind, objectId, sourceHash, targetLang, translation.detected_source_language, translation.text],
		);
		return { sourceLang: translation.detected_source_language, text: translation.text };
	}

	public async translate(kind: NookTranslationKind, objectId: string, text: string, targetLanguage: string): Promise<NookTranslationResult> {
		if (this.serverSettings.deeplAuthKey == null) throw new NookTranslationUnavailableError();
		await this.cleanupExpiredCache();
		const sourceHash = createHash('sha256').update(text).digest('hex');
		let targetLang = targetLanguage.trim();
		if (targetLang.includes('-')) targetLang = targetLang.split('-')[0];
		targetLang = targetLang.toUpperCase();

		const cached = await this.db.query<Array<{ sourceLang: string; translatedText: string }>>(
			`SELECT "sourceLang", "translatedText" FROM "nook_translation_cache"
			 WHERE "kind"=$1 AND "objectId"=$2 AND "sourceHash"=$3 AND "targetLang"=$4 LIMIT 1`,
			[kind, objectId, sourceHash, targetLang],
		);
		if (cached[0] != null) return { sourceLang: cached[0].sourceLang, text: cached[0].translatedText };

		const inFlightKey = `${kind}\0${objectId}\0${sourceHash}\0${targetLang}`;
		const existing = this.inFlight.get(inFlightKey);
		if (existing != null) return await existing;

		const task = this.translateUncached(kind, objectId, sourceHash, text, targetLang)
			.finally(() => this.inFlight.delete(inFlightKey));
		this.inFlight.set(inFlightKey, task);
		return await task;
	}
}
