/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { NoteCreateService } from '@/core/NoteCreateService.js';
import { resolveNookMarkdownForNote } from '@/misc/resolve-nook-markdown.js';
import type { MiNote } from '@/models/Note.js';

function createInsertHarness() {
	const inserted: MiNote[] = [];
	const service = Object.create(NoteCreateService.prototype) as NoteCreateService & Record<string, unknown>;

	Object.assign(service, {
		idService: {
			gen: () => 'test-note-id',
		},
		notesRepository: {
			insert: async (note: MiNote) => {
				inserted.push(note);
			},
		},
		userProfilesRepository: {
			findBy: async () => [],
		},
		userEntityService: {
			isRemoteUser: () => false,
		},
	});

	return { service, inserted };
}

function noteData(nookMarkdown: boolean) {
	return {
		createdAt: new Date(0),
		files: [],
		reply: null,
		renote: null,
		channel: null,
		name: null,
		text: '**hello**',
		nookMarkdown,
		poll: null,
		cw: null,
		localOnly: false,
		reactionAcceptance: null,
		visibility: 'public',
		visibleUsers: [],
		uri: null,
		url: null,
	};
}

describe('nookMarkdown note creation flow', () => {
	test('a normal new local note reaches the repository with nookMarkdown=true', async () => {
		const { service, inserted } = createInsertHarness();
		const nookMarkdown = resolveNookMarkdownForNote(null, null, undefined);

		const result = await (service as any).insertNote(
			{ id: 'local-user-id', host: null },
			noteData(nookMarkdown),
			[],
			[],
			[],
		);

		expect(nookMarkdown).toBe(true);
		expect(inserted).toHaveLength(1);
		expect(inserted[0]?.nookMarkdown).toBe(true);
		expect(result.nookMarkdown).toBe(true);
	});

	test('an explicit local false reaches the repository unchanged', async () => {
		const { service, inserted } = createInsertHarness();
		const nookMarkdown = resolveNookMarkdownForNote(null, null, false);

		const result = await (service as any).insertNote(
			{ id: 'local-user-id', host: null },
			noteData(nookMarkdown),
			[],
			[],
			[],
		);

		expect(nookMarkdown).toBe(false);
		expect(inserted).toHaveLength(1);
		expect(inserted[0]?.nookMarkdown).toBe(false);
		expect(result.nookMarkdown).toBe(false);
	});
});
