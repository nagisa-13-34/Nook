/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test } from 'vitest';
import type { DataSource } from 'typeorm';
import type { IdService } from '@/core/IdService.js';
import { ApiError } from '@/server/api/error.js';
import MessageDeleteEndpoint from '@/server/api/endpoints/nook/community/messages/delete.js';
import PinCreateEndpoint from '@/server/api/endpoints/nook/community/pins/create.js';
import PinDeleteEndpoint from '@/server/api/endpoints/nook/community/pins/delete.js';

function createRestrictedMutationDb(permission: 'members.manage' | 'pins.manage') {
	const writes: string[] = [];
	const db = {
		query: async (sql: string) => {
			if (sql.includes('FROM "channel" c')) {
				return [{ userId: 'owner', joinMode: 'open', discoverable: true, initialized: true }];
			}
			if (sql.includes('FROM "nook_community_member" WHERE')) {
				return [{ baseRole: 'member', state: 'active' }];
			}
			if (sql.includes('INNER JOIN "nook_community_role"')) {
				return [{ permissions: [permission] }];
			}
			if (sql.includes('FROM "nook_community_message"') && sql.includes('"userId", "channelId"')) {
				return [{ userId: 'other-user', channelId: 'staff' }];
			}
			if (sql.includes('FROM "nook_community_pin"')) {
				return [{ channelId: 'staff', kind: 'url', targetId: null }];
			}
			if (sql.includes('FROM "nook_community_channel"')) {
				return [{ id: 'staff', communityId: 'community', parentId: null, name: 'Staff', topic: null, kind: 'text', position: 0, allowedRoleIds: ['staff-role'], archivedAt: null }];
			}
			if (sql.includes('SELECT "roleId" FROM "nook_community_member_role"')) return [];
			if (sql.startsWith('UPDATE') || sql.startsWith('DELETE') || sql.startsWith('INSERT')) {
				writes.push(sql);
				return [];
			}
			throw new Error(`Unexpected query: ${sql}`);
		},
	} as unknown as DataSource;
	return { db, writes };
}

describe('Nook Community restricted channel mutations', () => {
	test('members.manage cannot delete a message in a channel the actor cannot access', async () => {
		const { db, writes } = createRestrictedMutationDb('members.manage');
		const endpoint = new MessageDeleteEndpoint(db);

		await assert.rejects(
			() => endpoint.exec({ communityId: 'community', messageId: 'message' }, { id: 'manager' } as never, null),
			(error: unknown) => error instanceof ApiError && error.code === 'FORBIDDEN',
		);
		assert.deepEqual(writes, []);
	});

	test('pins.manage cannot create or delete pins scoped to a hidden channel', async () => {
		const createState = createRestrictedMutationDb('pins.manage');
		const idService = { gen: () => 'pin' } as unknown as IdService;
		const create = new PinCreateEndpoint(createState.db, idService);

		await assert.rejects(
			() => create.exec({ communityId: 'community', channelId: 'staff', kind: 'url', url: 'https://example.com' }, { id: 'manager' } as never, null),
			(error: unknown) => error instanceof ApiError && error.code === 'INVALID_TARGET',
		);
		assert.deepEqual(createState.writes, []);

		const deleteState = createRestrictedMutationDb('pins.manage');
		const remove = new PinDeleteEndpoint(deleteState.db);
		await assert.rejects(
			() => remove.exec({ communityId: 'community', pinId: 'pin' }, { id: 'manager' } as never, null),
			(error: unknown) => error instanceof ApiError && error.code === 'FORBIDDEN',
		);
		assert.deepEqual(deleteState.writes, []);
	});
});
