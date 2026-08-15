/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { detectNookTimelineView, isNookRecommendationUnavailableError, mergeNookRecommendationPage, resolveNookTimelineSource } from '@/nook/timeline.js';

describe('Nook timeline', () => {
	test('maps Following to the existing home timeline', () => {
		expect(resolveNookTimelineSource('following', ['home', 'local'])).toEqual({ src: 'home', onlyFiles: false });
	});

	test('maps Discover to local posts as its fallback source', () => {
		expect(resolveNookTimelineSource('discover', ['home', 'local', 'global'])).toEqual({ src: 'local', onlyFiles: false });
	});

	test('falls back from Discover when the local timeline is unavailable', () => {
		expect(resolveNookTimelineSource('discover', ['home', 'global'])).toEqual({ src: 'global', onlyFiles: false });
	});

	test('does not map Discover to Following when public timelines are unavailable', () => {
		expect(resolveNookTimelineSource('discover', ['home'])).toBeNull();
	});

	test('maps Media to followed accounts with attachments', () => {
		expect(resolveNookTimelineSource('media', ['home', 'local'])).toEqual({ src: 'home', onlyFiles: true });
		expect(detectNookTimelineView('home', true)).toBe('media');
	});

	test('falls back only for recommendation availability and policy errors', () => {
		expect(isNookRecommendationUnavailableError({ code: 'NOOK_RECOMMENDATIONS_DISABLED' })).toBe(true);
		expect(isNookRecommendationUnavailableError({ code: 'RESTRICTED_BY_NOOK_POLICY' })).toBe(true);
		expect(isNookRecommendationUnavailableError({ code: 'INTERNAL_ERROR' })).toBe(false);
		expect(isNookRecommendationUnavailableError(null)).toBe(false);
	});

	test('merges recommendation pages without duplicate notes', () => {
		const current = [{ id: 'a' }, { id: 'b' }];
		const page = [{ id: 'b' }, { id: 'c' }, { id: 'c' }, { id: 'd' }];

		expect(mergeNookRecommendationPage(current, page)).toEqual([
			{ id: 'a' },
			{ id: 'b' },
			{ id: 'c' },
			{ id: 'd' },
		]);
	});
});
