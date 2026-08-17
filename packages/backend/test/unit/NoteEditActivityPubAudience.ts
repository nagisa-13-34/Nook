/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test, vi } from 'vitest';
import type { MiNote } from '@/models/Note.js';
import type { MiLocalUser, MiRemoteUser } from '@/models/User.js';
import NoteEditEndpoint from '@/server/api/endpoints/notes/edit.js';

const PUBLIC = 'https://www.w3.org/ns/activitystreams#Public';

type DeliverUpdateTarget = {
	deliverUpdate(user: MiLocalUser, note: MiNote): Promise<void>;
};

function createHarness(renderedNote: { type: 'Note'; to: string[]; cc: string[] }, remoteUsers: MiRemoteUser[] = []) {
	let deliveredActivity: { to?: unknown; cc?: unknown } | undefined;

	const manager = {
		addDirectRecipe: vi.fn(),
		addFollowersRecipe: vi.fn(),
		execute: vi.fn(async () => undefined),
	};
	const usersRepository = {
		findBy: vi.fn(async () => remoteUsers),
		findOneBy: vi.fn(async () => null),
	};
	const userEntityService = {
		isRemoteUser: vi.fn((user: { host: string | null }) => user.host != null),
	};
	const apRendererService = {
		renderNote: vi.fn(async () => renderedNote),
		renderUpdate: vi.fn((object: unknown) => ({
			type: 'Update',
			to: [PUBLIC],
			object,
		})),
		addContext: vi.fn(<T>(activity: T) => activity),
	};
	const apDeliverManagerService = {
		createDeliverManager: vi.fn((_user: MiLocalUser, activity: { to?: unknown; cc?: unknown }) => {
			deliveredActivity = activity;
			return manager;
		}),
	};
	const relayService = {
		deliverToRelays: vi.fn(async () => undefined),
	};

	const endpoint = new NoteEditEndpoint(
		{} as never,
		{} as never,
		usersRepository as never,
		{} as never,
		{} as never,
		{} as never,
		userEntityService as never,
		{} as never,
		{} as never,
		{} as never,
		{} as never,
		{} as never,
		{} as never,
		apRendererService as never,
		apDeliverManagerService as never,
		relayService as never,
		{} as never,
	);

	return {
		endpoint: endpoint as unknown as DeliverUpdateTarget,
		getDeliveredActivity: () => deliveredActivity,
		manager,
		relayService,
	};
}

describe('notes/edit ActivityPub audience', () => {
	const alice = { id: 'alice', host: null } as MiLocalUser;

	test('followers edit keeps the Update audience followers-only', async () => {
		const followers = 'https://misskey.local/users/alice/followers';
		const harness = createHarness({
			type: 'Note',
			to: [followers],
			cc: [],
		});
		const note = {
			visibility: 'followers',
			mentions: [],
			replyUserId: null,
			renoteUserId: null,
		} as MiNote;

		await harness.endpoint.deliverUpdate(alice, note);

		const activity = harness.getDeliveredActivity();
		assert.deepStrictEqual(activity?.to, [followers]);
		assert.deepStrictEqual(activity?.cc, []);
		assert.ok(![...(activity?.to as string[]), ...(activity?.cc as string[])].includes(PUBLIC));
		assert.strictEqual(harness.manager.addFollowersRecipe.mock.calls.length, 1);
		assert.strictEqual(harness.manager.addDirectRecipe.mock.calls.length, 0);
		assert.strictEqual(harness.relayService.deliverToRelays.mock.calls.length, 0);
	});

	test('specified edit keeps the Update audience on the specified remote user only', async () => {
		const bob = {
			id: 'bob',
			host: 'remote.example',
			uri: 'https://remote.example/users/bob',
			inbox: 'https://remote.example/users/bob/inbox',
			sharedInbox: null,
		} as MiRemoteUser;
		const harness = createHarness({
			type: 'Note',
			to: [bob.uri],
			cc: [],
		}, [bob]);
		const note = {
			visibility: 'specified',
			mentions: [bob.id],
			replyUserId: null,
			renoteUserId: null,
		} as MiNote;

		await harness.endpoint.deliverUpdate(alice, note);

		const activity = harness.getDeliveredActivity();
		assert.deepStrictEqual(activity?.to, [bob.uri]);
		assert.deepStrictEqual(activity?.cc, []);
		assert.ok(![...(activity?.to as string[]), ...(activity?.cc as string[])].includes(PUBLIC));
		assert.strictEqual(harness.manager.addFollowersRecipe.mock.calls.length, 0);
		assert.deepStrictEqual(harness.manager.addDirectRecipe.mock.calls, [[bob]]);
		assert.strictEqual(harness.relayService.deliverToRelays.mock.calls.length, 0);
	});
});
