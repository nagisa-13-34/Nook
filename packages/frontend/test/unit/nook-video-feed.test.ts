/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { classifyNookVideoFile, classifyNookVideoNote, hasNookVideo, noteMatchesNookVideoTab } from '@/nook/video-feed.js';

describe('Nook video feed', () => {
	test('classifies portrait video as Shorts', () => {
		expect(classifyNookVideoFile({
			type: 'video/mp4',
			properties: { width: 1080, height: 1920 },
		})).toBe('shorts');
	});

	test('classifies landscape and square video as regular Videos', () => {
		expect(classifyNookVideoFile({
			type: 'video/webm',
			properties: { width: 1920, height: 1080 },
		})).toBe('videos');
		expect(classifyNookVideoFile({
			type: 'video/mp4',
			properties: { width: 1080, height: 1080 },
		})).toBe('videos');
	});

	test('keeps video with unknown dimensions in regular Videos', () => {
		expect(classifyNookVideoFile({ type: 'video/mp4', properties: {} })).toBe('videos');
	});

	test('ignores non-video files', () => {
		expect(classifyNookVideoFile({
			type: 'image/png',
			properties: { width: 1080, height: 1920 },
		})).toBeNull();
	});

	test('treats notes without files as non-video notes', () => {
		expect(classifyNookVideoNote({})).toBeNull();
		expect(classifyNookVideoNote({ files: null })).toBeNull();
		expect(hasNookVideo({})).toBe(false);
		expect(noteMatchesNookVideoTab({}, 'shorts')).toBe(false);
		expect(noteMatchesNookVideoTab({}, 'videos')).toBe(false);
	});

	test('uses the first attached video to classify a post once', () => {
		const note = {
			files: [
				{ type: 'image/png', properties: { width: 800, height: 600 } },
				{ type: 'video/mp4', properties: { width: 720, height: 1280 } },
				{ type: 'video/mp4', properties: { width: 1920, height: 1080 } },
			],
		};

		expect(hasNookVideo(note)).toBe(true);
		expect(classifyNookVideoNote(note)).toBe('shorts');
		expect(noteMatchesNookVideoTab(note, 'shorts')).toBe(true);
		expect(noteMatchesNookVideoTab(note, 'videos')).toBe(false);
	});
});
