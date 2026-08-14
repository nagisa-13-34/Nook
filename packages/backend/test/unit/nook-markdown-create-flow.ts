/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { NoteCreateService } from '@/core/NoteCreateService.js';
import type { MiNote } from '@/models/Note.js';

function createServiceHarness() {
	const inserted: MiNote[] = [];
	const service = Object.create(NoteCreateService.prototype) as NoteCreateService & Record<string, unknown>;

	Object.assign(service, {
		meta: {
			sensitiveWords: [],
			prohibitedWords: [],
			silencedHosts: [],
			mediaSilencedHosts: [],
		},
		utilityService: {
			isKeyWordIncluded: () => false,
			concatNoteContentsForKeyWordCheck: () => '',
			isSilencedHost: () => false,
			isMediaSilencedHost: () => false,
		},
		idService: {
			gen: () => 'test-note-id',
		},
		notesRepository: {
			insert: async (note: MiNote) => {
				inserted.push(note);
			},
		},
		postNoteCreated: async () => undefined,
	});

	return { service, inserted };
}

function noteData(nookMarkdown?: boolean) {
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
		visibility: 'home',
		visibleUsers: [],
		uri: null,
		url: null,
	};
}

const localUser = {
	id: 'local-user-id',
	username: 'local-user',
	host: null,
	isBot: false,
	isCat: false,
};

describe('nookMarkdown note creation flow', () => {
	test('NoteCreateService.create opts a normal new local note into hybrid parsing before insert', async () => {
		const { service, inserted } = createServiceHarness();

		const result = await service.create(localUser, noteData() as any, true);

		expect(inserted).toHaveLength(1);
		expect(inserted[0]?.nookMarkdown).toBe(true);
		expect(result.nookMarkdown).toBe(true);
	});

	test('NoteCreateService.create preserves an explicit local false through insert', async () => {
		const { service, inserted } = createServiceHarness();

		const result = await service.create(localUser, noteData(false) as any, true);

		expect(inserted).toHaveLength(1);
		expect(inserted[0]?.nookMarkdown).toBe(false);
		expect(result.nookMarkdown).toBe(false);
	});
});
