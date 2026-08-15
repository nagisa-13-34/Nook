/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test } from 'vitest';
import type { DataSource } from 'typeorm';
import {
	NookCommunityReferenceError,
	requireNookCommunityChannelReference,
	requireNookCommunityPinReferences,
	requireNookCommunityReplyReference,
	requireNookCommunityRoleReferences,
} from '@/nook/community/references.js';

function fakeDb(handler: (sql: string, params: unknown[]) => unknown[]) {
	return { query: async (sql: string, params: unknown[] = []) => handler(sql, params) } as unknown as DataSource;
}

describe('Nook Community cross-reference boundaries', () => {
	test('channel references are scoped to the supplied Community', async () => {
		const db = fakeDb((_sql, params) => params[1] === 'community-a' && params[0] === 'channel-a'
			? [{ id: 'channel-a', communityId: 'community-a', kind: 'text', archivedAt: null }]
			: []);
		await assert.doesNotReject(() => requireNookCommunityChannelReference(db, 'community-a', 'channel-a'));
		await assert.rejects(
			() => requireNookCommunityChannelReference(db, 'community-b', 'channel-a'),
			(error: unknown) => error instanceof NookCommunityReferenceError && error.code === 'CHANNEL_NOT_IN_COMMUNITY',
		);
	});

	test('voice and text event channel kinds cannot be swapped', async () => {
		const db = fakeDb((_sql, params) => [{ id: params[0], communityId: params[1], kind: 'voice', archivedAt: null }]);
		await assert.doesNotReject(() => requireNookCommunityChannelReference(db, 'community', 'voice', { kind: 'voice' }));
		await assert.rejects(
			() => requireNookCommunityChannelReference(db, 'community', 'voice', { nonVoice: true }),
			(error: unknown) => error instanceof NookCommunityReferenceError && error.code === 'INVALID_CHANNEL_KIND',
		);
	});

	test('all restricted channel role IDs must belong to the same Community', async () => {
		const db = fakeDb((_sql, _params) => [{ id: 'role-a' }]);
		await assert.rejects(
			() => requireNookCommunityRoleReferences(db, 'community', ['role-a', 'role-from-other-community']),
			(error: unknown) => error instanceof NookCommunityReferenceError && error.code === 'ROLE_NOT_IN_COMMUNITY',
		);
	});

	test('role references are locked while a restricted channel write is in flight', async () => {
		let query = '';
		const db = fakeDb((sql, _params) => {
			query = sql;
			return [{ id: 'staff' }];
		});
		await assert.doesNotReject(() => requireNookCommunityRoleReferences(db, 'community', ['staff'], { lockForWrite: true }));
		assert.match(query, /FOR KEY SHARE$/);
	});

	test('reply target must belong to the same Community and channel', async () => {
		const db = fakeDb((_sql, params) => params[0] === 'message-a' && params[1] === 'community-a' && params[2] === 'channel-a' ? [{ id: 'message-a' }] : []);
		await assert.doesNotReject(() => requireNookCommunityReplyReference(db, 'community-a', 'channel-a', 'message-a'));
		await assert.rejects(
			() => requireNookCommunityReplyReference(db, 'community-b', 'channel-a', 'message-a'),
			(error: unknown) => error instanceof NookCommunityReferenceError && error.code === 'MESSAGE_NOT_IN_COMMUNITY',
		);
	});

	test('message pins cannot point to another channel or Community', async () => {
		const db = fakeDb((sql, params) => {
			if (sql.includes('FROM "nook_community_channel"')) return [{ id: params[0], communityId: params[1], kind: 'text', archivedAt: null }];
			if (sql.includes('FROM "nook_community_message"')) return [{ channelId: 'channel-b' }];
			return [];
		});
		await assert.rejects(
			() => requireNookCommunityPinReferences(db, 'community-a', { channelId: 'channel-a', kind: 'message', targetId: 'message-b' }),
			(error: unknown) => error instanceof NookCommunityReferenceError && error.code === 'TARGET_NOT_IN_COMMUNITY',
		);
	});

	test('event and announcement pin targets must belong to the Community', async () => {
		const db = fakeDb(() => []);
		await assert.rejects(
			() => requireNookCommunityPinReferences(db, 'community-a', { channelId: null, kind: 'event', targetId: 'event-b' }),
			(error: unknown) => error instanceof NookCommunityReferenceError && error.code === 'TARGET_NOT_IN_COMMUNITY',
		);
	});
});
