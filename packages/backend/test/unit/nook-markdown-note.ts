/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { MiNote } from '@/models/Note.js';
import { resolveNookMarkdownForNote } from '@/misc/resolve-nook-markdown.js';

describe('nookMarkdown compatibility flag', () => {
	test('new local notes opt into hybrid parsing', () => {
		expect(resolveNookMarkdownForNote(null, null, undefined)).toBe(true);
	});

	test('remote notes stay on legacy MFM', () => {
		expect(resolveNookMarkdownForNote('remote.example', 'https://remote.example/notes/example', undefined)).toBe(false);
	});

	test('remote notes cannot explicitly opt into hybrid parsing', () => {
		expect(resolveNookMarkdownForNote('remote.example', 'https://remote.example/notes/example', true)).toBe(false);
	});

	test('an explicit false local-note flag stays disabled', () => {
		expect(resolveNookMarkdownForNote(null, null, false)).toBe(false);
	});

	test('the model constructor does not implicitly opt legacy local data into hybrid parsing', () => {
		const note = new MiNote({
			userHost: null,
			uri: null,
		});

		expect(note.nookMarkdown).toBeUndefined();
	});

	test('the model preserves an explicit false value', () => {
		const note = new MiNote({
			userHost: null,
			uri: null,
			nookMarkdown: false,
		});

		expect(note.nookMarkdown).toBe(false);
	});
});
