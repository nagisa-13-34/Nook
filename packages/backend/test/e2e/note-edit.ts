/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

process.env.NODE_ENV = 'test';

import * as assert from 'node:assert';
import type { DataSource } from 'typeorm';
import { beforeAll, describe, test } from 'vitest';
import type * as misskey from 'misskey-js';
import { MiNote } from '@/models/Note.js';
import { api, castAsError, initTestDb, post, react, signup } from '../utils.js';

describe('notes/edit', () => {
	let db: DataSource;
	let alice: misskey.entities.SignupResponse;
	let bob: misskey.entities.SignupResponse;

	beforeAll(async () => {
		db = await initTestDb(true);
		alice = await signup();
		bob = await signup();
	}, 1000 * 60 * 2);

	test('owner can edit text and CW without changing the note id', async () => {
		const note = await post(alice, { text: 'before', cw: 'old CW' });
		const res = await api('notes/edit', {
			noteId: note.id,
			text: 'after',
			cw: 'new CW',
		}, alice);

		assert.strictEqual(res.status, 200);
		assert.strictEqual(res.body.id, note.id);
		assert.strictEqual(res.body.text, 'after');
		assert.strictEqual(res.body.cw, 'new CW');
		assert.ok(res.body.editedAt);

		const stored = await db.getRepository(MiNote).findOneByOrFail({ id: note.id });
		assert.strictEqual(stored.text, 'after');
		assert.strictEqual(stored.cw, 'new CW');
		assert.ok(stored.editedAt);
		assert.deepStrictEqual(stored.editHistory, [{
			editedAt: stored.editedAt.toISOString(),
			text: 'before',
			cw: 'old CW',
		}]);
	});

	test('editing keeps existing reactions', async () => {
		const note = await post(alice, { text: 'before' });
		await react(bob, note, '🚀');

		const edit = await api('notes/edit', {
			noteId: note.id,
			text: 'after',
			cw: null,
		}, alice);
		assert.strictEqual(edit.status, 200);

		const shown = await api('notes/show', { noteId: note.id }, alice);
		assert.strictEqual(shown.status, 200);
		assert.strictEqual(shown.body.reactions['🚀'], 1);
	});

	test('another user cannot edit the note', async () => {
		const note = await post(alice, { text: 'owner only' });
		const res = await api('notes/edit', {
			noteId: note.id,
			text: 'hijacked',
			cw: null,
		}, bob);

		assert.strictEqual(res.status, 403);
		assert.strictEqual(castAsError(res.body).error.code, 'NOT_NOTE_OWNER');
	});

	test('a pure Renote cannot be turned into an edited quote', async () => {
		const original = await post(alice, { text: 'original' });
		const renote = await post(alice, { renoteId: original.id });
		const res = await api('notes/edit', {
			noteId: renote.id,
			text: 'new quote text',
			cw: null,
		}, alice);

		assert.strictEqual(res.status, 400);
		assert.strictEqual(castAsError(res.body).error.code, 'CANNOT_EDIT_PURE_RENOTE');
	});

	test('a text-only note cannot be edited into an empty note', async () => {
		const note = await post(alice, { text: 'content' });
		const res = await api('notes/edit', {
			noteId: note.id,
			text: null,
			cw: null,
		}, alice);

		assert.strictEqual(res.status, 400);
		assert.strictEqual(castAsError(res.body).error.code, 'CONTENT_REQUIRED');
	});

	test('a no-op edit does not create an edit timestamp or revision', async () => {
		const note = await post(alice, { text: 'same', cw: 'same CW' });
		const before = await db.getRepository(MiNote).findOneByOrFail({ id: note.id });
		assert.strictEqual(before.editedAt, null);
		assert.deepStrictEqual(before.editHistory, []);

		const res = await api('notes/edit', {
			noteId: note.id,
			text: 'same',
			cw: 'same CW',
		}, alice);
		assert.strictEqual(res.status, 200);
		assert.strictEqual(res.body.editedAt, null);

		const after = await db.getRepository(MiNote).findOneByOrFail({ id: note.id });
		assert.strictEqual(after.editedAt, null);
		assert.deepStrictEqual(after.editHistory, []);
	});

	test('edit history stores the previous body for each real edit', async () => {
		const note = await post(alice, { text: 'v1', cw: null });

		await api('notes/edit', { noteId: note.id, text: 'v2', cw: 'cw2' }, alice);
		await api('notes/edit', { noteId: note.id, text: 'v3', cw: null }, alice);

		const stored = await db.getRepository(MiNote).findOneByOrFail({ id: note.id });
		assert.strictEqual(stored.editHistory.length, 2);
		assert.deepStrictEqual(stored.editHistory.map(revision => ({ text: revision.text, cw: revision.cw })), [
			{ text: 'v1', cw: null },
			{ text: 'v2', cw: 'cw2' },
		]);
	});

	test('editing cannot add a newly mentioned user', async () => {
		const note = await post(alice, { text: 'no mentions yet' });
		const res = await api('notes/edit', {
			noteId: note.id,
			text: `hello @${bob.username}`,
			cw: null,
		}, alice);

		assert.strictEqual(res.status, 400);
		assert.strictEqual(castAsError(res.body).error.code, 'CANNOT_EXPAND_NOTE_AUDIENCE_BY_EDIT');
	});
});
