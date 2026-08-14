/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { detectNookTimelineView, resolveNookTimelineSource } from '@/nook/timeline.js';

describe('Nook timeline', () => {
	test('maps Following to the existing home timeline', () => {
		expect(resolveNookTimelineSource('following', ['home', 'local'])).toEqual({ src: 'home', onlyFiles: false });
	});

	test('maps Discover to local posts without recommendations', () => {
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
});
