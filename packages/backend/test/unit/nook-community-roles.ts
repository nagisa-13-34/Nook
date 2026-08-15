/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test } from 'vitest';
import type { DataSource } from 'typeorm';
import { deleteNookCommunityRole, NookCommunityRoleError } from '@/nook/community/roles.js';

describe('Nook Community role deletion', () => {
	test('rejects deleting a role referenced by a restricted channel', async () => {
		const calls: string[] = [];
		const manager = {
			query: async (sql: string) => {
				calls.push(sql);
				if (sql.includes('FROM "nook_community_role"')) return [{ id: 'staff' }];
				if (sql.includes('FROM "nook_community_channel"')) return [{ id: 'staff-secret' }];
				if (sql.startsWith('DELETE')) throw new Error('role must not be deleted');
				throw new Error(`Unexpected query: ${sql}`);
			},
		};
		const db = {
			transaction: async <T>(callback: (transactionManager: typeof manager) => Promise<T>) => await callback(manager),
		} as unknown as DataSource;

		await assert.rejects(
			() => deleteNookCommunityRole(db, 'community', 'staff'),
			(error: unknown) => error instanceof NookCommunityRoleError && error.code === 'ROLE_IN_USE',
		);
		assert.equal(calls.some(sql => sql.startsWith('DELETE')), false);
	});

	test('deletes an unreferenced role', async () => {
		const calls: string[] = [];
		const manager = {
			query: async (sql: string) => {
				calls.push(sql);
				if (sql.includes('FROM "nook_community_role"')) return [{ id: 'unused' }];
				if (sql.includes('FROM "nook_community_channel"')) return [];
				if (sql.startsWith('DELETE')) return [];
				throw new Error(`Unexpected query: ${sql}`);
			},
		};
		const db = {
			transaction: async <T>(callback: (transactionManager: typeof manager) => Promise<T>) => await callback(manager),
		} as unknown as DataSource;

		await assert.doesNotReject(() => deleteNookCommunityRole(db, 'community', 'unused'));
		assert.equal(calls.some(sql => sql.startsWith('DELETE')), true);
	});
});
