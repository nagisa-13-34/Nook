/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

process.env.NODE_ENV = 'test';

import * as assert from 'node:assert';
import { beforeAll, describe, test } from 'vitest';
import { initTestDb, relativeFetch, signup } from '../utils.js';
import type * as misskey from 'misskey-js';

type TestUser = misskey.entities.SignupResponse;

type ApiErrorBody = {
	error?: {
		code?: string;
	};
};

type CreatedEventBody = {
	id: string;
};

type EventBody = {
	id: string;
	communityId: string | null;
	visibility: 'public' | 'community' | 'unlisted' | 'private';
	participation: 'anyone' | 'community';
};

type EventListItem = {
	id: string;
};

type RawApiResponse<T> = {
	status: number;
	body: T | null;
};

async function rawApi<T>(path: string, params: Record<string, unknown>, user: TestUser): Promise<RawApiResponse<T>> {
	const response = await relativeFetch(`api/${path}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			...params,
			i: user.token,
		}),
	});
	const contentType = response.headers.get('content-type');
	return {
		status: response.status,
		body: contentType?.startsWith('application/json') === true ? await response.json() as T : null,
	};
}

function futureDate(offsetMinutes = 60): string {
	return new Date(Date.now() + offsetMinutes * 60 * 1000).toISOString();
}

async function createEvent(user: TestUser, params: Record<string, unknown>): Promise<string> {
	const response = await rawApi<CreatedEventBody>('nook/events/create', {
		title: `Nook event ${Date.now()}-${Math.random()}`,
		startsAt: futureDate(),
		...params,
	}, user);
	assert.strictEqual(response.status, 200, JSON.stringify(response.body));
	assert.strictEqual(typeof response.body?.id, 'string');
	return response.body!.id;
}

describe('Nook global events', () => {
	let alice: TestUser;
	let bob: TestUser;

	beforeAll(async () => {
		await initTestDb(true);
		alice = await signup({ username: 'nook-events-alice' });
		bob = await signup({ username: 'nook-events-bob' });
	}, 1000 * 60 * 2);

	test('Community未指定のイベントはpublic/anyoneを既定値にする', async () => {
		const eventId = await createEvent(alice, {});

		const shown = await rawApi<EventBody>('nook/events/show', { eventId }, bob);
		assert.strictEqual(shown.status, 200, JSON.stringify(shown.body));
		assert.strictEqual(shown.body?.id, eventId);
		assert.strictEqual(shown.body?.communityId, null);
		assert.strictEqual(shown.body?.visibility, 'public');
		assert.strictEqual(shown.body?.participation, 'anyone');

		const listed = await rawApi<EventListItem[]>('nook/events/list', { from: futureDate(-1) }, bob);
		assert.strictEqual(listed.status, 200, JSON.stringify(listed.body));
		assert.ok(Array.isArray(listed.body));
		assert.ok(listed.body.some(event => event.id === eventId));
	});

	test('unlistedは直接表示できるが他ユーザーの一覧には出さない', async () => {
		const eventId = await createEvent(alice, { visibility: 'unlisted' });

		const shown = await rawApi<EventBody>('nook/events/show', { eventId }, bob);
		assert.strictEqual(shown.status, 200, JSON.stringify(shown.body));
		assert.strictEqual(shown.body?.id, eventId);
		assert.strictEqual(shown.body?.visibility, 'unlisted');

		const listed = await rawApi<EventListItem[]>('nook/events/list', { from: futureDate(-1) }, bob);
		assert.strictEqual(listed.status, 200, JSON.stringify(listed.body));
		assert.ok(Array.isArray(listed.body));
		assert.ok(!listed.body.some(event => event.id === eventId));
	});

	test('privateは作成者以外へ公開しない', async () => {
		const eventId = await createEvent(alice, { visibility: 'private' });

		const ownerView = await rawApi<EventBody>('nook/events/show', { eventId }, alice);
		assert.strictEqual(ownerView.status, 200, JSON.stringify(ownerView.body));
		assert.strictEqual(ownerView.body?.id, eventId);

		const otherView = await rawApi<ApiErrorBody>('nook/events/show', { eventId }, bob);
		assert.strictEqual(otherView.status, 400, JSON.stringify(otherView.body));
		assert.strictEqual(otherView.body?.error?.code, 'EVENT_UNAVAILABLE');
	});

	test('standaloneイベントでcommunity scopeは指定できない', async () => {
		const response = await rawApi<ApiErrorBody>('nook/events/create', {
			title: 'Invalid standalone community event',
			startsAt: futureDate(),
			visibility: 'community',
		}, alice);

		assert.strictEqual(response.status, 400, JSON.stringify(response.body));
		assert.strictEqual(response.body?.error?.code, 'INVALID_EVENT_SCOPE');
	});

	test('参加上限を超えるgoing RSVPを拒否する', async () => {
		const eventId = await createEvent(alice, { maxAttendees: 1 });

		const first = await rawApi<null>('nook/events/rsvp', {
			eventId,
			response: 'going',
		}, alice);
		assert.ok(first.status === 200 || first.status === 204, JSON.stringify(first.body));

		const second = await rawApi<ApiErrorBody>('nook/events/rsvp', {
			eventId,
			response: 'going',
		}, bob);
		assert.strictEqual(second.status, 400, JSON.stringify(second.body));
		assert.strictEqual(second.body?.error?.code, 'EVENT_FULL');
	});
});
