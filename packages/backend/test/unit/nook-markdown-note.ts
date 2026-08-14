/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { MiNote } from '@/models/Note.js';

describe('MiNote nookMarkdown compatibility flag', () => {
	test('new local notes opt into hybrid parsing', () => {
		const note = new MiNote({
			userHost: null,
			uri: null,
		});

		expect(note.nookMarkdown).toBe(true);
	});

	test('remote notes do not opt into hybrid parsing', () => {
		const note = new MiNote({
			userHost: 'remote.example',
			uri: 'https://remote.example/notes/example',
		});

		expect(note.nookMarkdown).toBe(false);
	});

	test('an explicit legacy local-note flag stays disabled', () => {
		const note = new MiNote({
			userHost: null,
			uri: null,
			nookMarkdown: false,
		});

		expect(note.nookMarkdown).toBe(false);
	});
});
