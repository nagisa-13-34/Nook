/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

process.env.NODE_ENV = 'test';

import { describe, expect, test, vi } from 'vitest';
import { ApNoteService } from '@/core/activitypub/models/ApNoteService.js';

const remoteUri = 'https://remote.example/notes/123';
const actor = {
	id: 'remote-user-id',
	host: 'remote.example',
	uri: 'https://remote.example/users/alice',
} as any;

function makeStoredNote(overrides: Record<string, unknown> = {}) {
	return {
		id: 'a000000000000001',
		uri: remoteUri,
		userId: actor.id,
		userHost: actor.host,
		text: 'before',
		cw: null,
		fileIds: ['file-1'],
		hasPoll: false,
		renoteId: null,
		visibility: 'followers',
		visibleUserIds: ['recipient-1'],
		mentions: ['recipient-1'],
		tags: ['old'],
		emojis: [],
		editedAt: null,
		editHistory: [],
		...overrides,
	} as any;
}

function makeService(stored = makeStoredNote()) {
	const saved: any[] = [];
	const searchService = {
		unindexNote: vi.fn(async () => undefined),
		indexNote: vi.fn(async () => undefined),
	};
	const globalEventService = {
		publishNoteStream: vi.fn(),
	};
	const service = Object.create(ApNoteService.prototype) as any;
	service.logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
	service.utilityService = {
		extractDbHost: (uri: string) => new URL(uri).host,
	};
	service.idService = {
		isSafeT: () => true,
		parse: () => ({ date: new Date('2026-08-16T00:00:00.000Z') }),
	};
	service.apDbResolverService = {
		getNoteFromApId: vi.fn(async () => stored),
	};
	service.apMfmService = {
		htmlToMfm: (html: string) => html,
	};
	service.noteCreateService = {
		checkProhibitedWordsContain: () => false,
	};
	service.notesRepository = {
		manager: {
			transaction: async (callback: (manager: any) => Promise<unknown>) => callback({
				findOne: vi.fn(async () => stored),
				save: vi.fn(async (_entity, note) => {
					saved.push(note);
					return note;
				}),
			}),
		},
	};
	service.searchService = searchService;
	service.globalEventService = globalEventService;

	return { service, stored, saved, searchService, globalEventService };
}

function updateObject(overrides: Record<string, unknown> = {}) {
	return {
		id: remoteUri,
		type: 'Note',
		attributedTo: actor.uri,
		updated: '2026-08-17T02:00:00.000Z',
		source: {
			mediaType: 'text/x.misskeymarkdown',
			content: 'after #newtag',
		},
		summary: 'new CW',
		...overrides,
	} as any;
}

describe('ApNoteService.updateNote', () => {
	test('applies a newer body update while preserving the stored audience and attachments', async () => {
		const { service, stored, saved, searchService, globalEventService } = makeService();
		const before = {
			visibility: stored.visibility,
			visibleUserIds: [...stored.visibleUserIds],
			mentions: [...stored.mentions],
			fileIds: [...stored.fileIds],
		};

		const result = await service.updateNote(updateObject(), actor);

		expect(result).toBe('ok: Note updated');
		expect(stored.text).toBe('after #newtag');
		expect(stored.cw).toBe('new CW');
		expect(stored.editedAt.toISOString()).toBe('2026-08-17T02:00:00.000Z');
		expect(stored.editHistory).toEqual([{ editedAt: '2026-08-17T02:00:00.000Z', text: 'before', cw: null }]);
		expect({
			visibility: stored.visibility,
			visibleUserIds: stored.visibleUserIds,
			mentions: stored.mentions,
			fileIds: stored.fileIds,
		}).toEqual(before);
		expect(saved).toHaveLength(1);
		expect(searchService.unindexNote).toHaveBeenCalledOnce();
		expect(searchService.indexNote).toHaveBeenCalledOnce();
		expect(globalEventService.publishNoteStream).toHaveBeenCalledOnce();
	});

	test('ignores an older or replayed update', async () => {
		const stored = makeStoredNote({ editedAt: new Date('2026-08-17T03:00:00.000Z') });
		const { service, saved, searchService, globalEventService } = makeService(stored);

		const result = await service.updateNote(updateObject({ updated: '2026-08-17T02:00:00.000Z' }), actor);

		expect(result).toBe('skip: stale Note Update');
		expect(stored.text).toBe('before');
		expect(saved).toHaveLength(0);
		expect(searchService.unindexNote).not.toHaveBeenCalled();
		expect(globalEventService.publishNoteStream).not.toHaveBeenCalled();
	});

	test('rejects an update whose attribution does not match the sending actor', async () => {
		const { service, stored, saved } = makeService();
		const result = await service.updateNote(updateObject({
			attributedTo: 'https://remote.example/users/mallory',
		}), actor);

		expect(result).toBe('skip: invalid Note Update');
		expect(stored.text).toBe('before');
		expect(saved).toHaveLength(0);
	});

	test('requires a trustworthy update timestamp', async () => {
		const { service, stored, saved } = makeService();
		const result = await service.updateNote(updateObject({ updated: undefined }), actor);

		expect(result).toBe('skip: Note Update has no timestamp');
		expect(stored.text).toBe('before');
		expect(saved).toHaveLength(0);
	});
});
