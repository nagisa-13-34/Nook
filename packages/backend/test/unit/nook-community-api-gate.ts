/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test } from 'vitest';
import type { DataSource } from 'typeorm';
import type { MiLocalUser } from '@/models/User.js';
import type { NookAccessService } from '@/nook/policy/NookAccessService.js';
import { ApiServerService } from '@/server/api/ApiServerService.js';
import ChannelCreateEndpoint from '@/server/api/endpoints/channels/create.js';
import { ApiError } from '@/server/api/error.js';

function createService(access: Pick<NookAccessService, 'isFeatureEnabled' | 'evaluate'>, db: DataSource = {} as DataSource): ApiServerService {
	return new ApiServerService(
		{} as never,
		{} as never,
		db,
		{} as never,
		{} as never,
		{} as never,
		{} as never,
		access as NookAccessService,
		{} as never,
		{} as never,
		{} as never,
	);
}

async function gate(service: ApiServerService, endpoint: string, user: MiLocalUser | null, data?: unknown, endpointKind?: string): Promise<void> {
	await (service as unknown as {
		assertNookEndpointAccess: (endpointName: string, me: MiLocalUser | null, requestData?: unknown, kind?: string) => Promise<void>;
	}).assertNookEndpointAccess(endpoint, user, data, endpointKind);
}

const user = { id: 'user', isDeleted: false, isSuspended: false } as unknown as MiLocalUser;
const owner = { id: 'owner', isDeleted: false, isSuspended: false } as unknown as MiLocalUser;

describe('Nook Community API feature and policy gate', () => {
	test('Community endpoints are unavailable while the Community feature is disabled', async () => {
		const service = createService({
			isFeatureEnabled: async () => false,
			evaluate: async (_user, permission) => ({ allowed: true, permission, policyId: null, reason: 'allowed' }),
		});
		await assert.rejects(
			() => gate(service, 'nook/community/show', null),
			(error: unknown) => error instanceof ApiError && error.code === 'NOOK_COMMUNITY_DISABLED',
		);
	});

	test('Voice endpoints require the voice_call feature in addition to Community', async () => {
		const service = createService({
			isFeatureEnabled: async feature => feature === 'community',
			evaluate: async (_user, permission) => ({ allowed: true, permission, policyId: null, reason: 'allowed' }),
		});
		await assert.rejects(
			() => gate(service, 'nook/community/voice/join', user),
			(error: unknown) => error instanceof ApiError && error.code === 'NOOK_VOICE_CALL_DISABLED',
		);
	});

	test('join and invite use require join_community policy', async () => {
		const evaluated: string[] = [];
		const service = createService({
			isFeatureEnabled: async () => true,
			evaluate: async (_user, permission) => {
				evaluated.push(permission);
				return { allowed: false, permission, policyId: null, reason: 'denied' };
			},
		});
		await assert.rejects(
			() => gate(service, 'nook/community/join', user),
			(error: unknown) => error instanceof ApiError && error.code === 'RESTRICTED_BY_NOOK_POLICY',
		);
		await assert.rejects(
			() => gate(service, 'nook/community/invites/use', user),
			(error: unknown) => error instanceof ApiError && error.code === 'RESTRICTED_BY_NOOK_POLICY',
		);
		assert.deepEqual(evaluated, ['join_community', 'join_community']);
	});

	test('Community creation requires both create and join policies', async () => {
		const evaluated: string[] = [];
		const access = {
			isFeatureEnabled: async () => true,
			evaluate: async (_user: MiLocalUser, permission: 'create_community' | 'join_community') => {
				evaluated.push(permission);
				return { allowed: permission !== 'join_community', permission, policyId: null, reason: permission === 'join_community' ? 'denied' as const : 'allowed' as const };
			},
		};
		const endpoint = new ChannelCreateEndpoint(
			{} as DataSource,
			{} as never,
			{} as never,
			{} as never,
			{} as never,
			access as NookAccessService,
		);

		await assert.rejects(
			() => endpoint.exec({ name: 'community' }, owner, null),
			(error: unknown) => error instanceof ApiError && error.code === 'RESTRICTED_BY_NOOK_POLICY',
		);
		assert.deepEqual(evaluated, ['create_community', 'join_community']);
	});

	test('Voice endpoints require voice_call policy', async () => {
		const evaluated: string[] = [];
		const service = createService({
			isFeatureEnabled: async () => true,
			evaluate: async (_user, permission) => {
				evaluated.push(permission);
				return { allowed: false, permission, policyId: null, reason: 'denied' };
			},
		});
		await assert.rejects(
			() => gate(service, 'nook/community/voice/heartbeat', user),
			(error: unknown) => error instanceof ApiError && error.code === 'RESTRICTED_BY_NOOK_POLICY',
		);
		assert.deepEqual(evaluated, ['voice_call']);
	});

	test('read-only Community access never initializes a legacy companion row', async () => {
		let databaseCalls = 0;
		const db = { query: async () => { databaseCalls += 1; return []; } } as unknown as DataSource;
		const service = createService({
			isFeatureEnabled: async () => true,
			evaluate: async (_user, permission) => ({ allowed: true, permission, policyId: null, reason: 'allowed' }),
		}, db);

		await gate(service, 'nook/community/show', null, { communityId: 'legacy' }, 'read:channels');
		assert.equal(databaseCalls, 0);
	});

	test('non-owner management write does not materialize a legacy Community', async () => {
		const sqlCalls: string[] = [];
		const evaluated: string[] = [];
		const db = {
			query: async (sql: string) => {
				sqlCalls.push(sql);
				return [{ ownerId: 'owner', initialized: false, isDeleted: false, isSuspended: false }];
			},
		} as unknown as DataSource;
		const service = createService({
			isFeatureEnabled: async () => true,
			evaluate: async (_user, permission) => {
				evaluated.push(permission);
				return { allowed: true, permission, policyId: null, reason: 'allowed' };
			},
		}, db);

		await gate(service, 'nook/community/settings-update', user, { communityId: 'legacy' }, 'write:channels');
		assert.deepEqual(evaluated, []);
		assert.equal(sqlCalls.length, 1);
		assert.match(sqlCalls[0] ?? '', /LEFT JOIN "nook_community"/);
	});

	test('first owner legacy Community write requires create and join policies', async () => {
		const sqlCalls: string[] = [];
		const db = {
			query: async (sql: string) => {
				sqlCalls.push(sql);
				return [{ ownerId: 'owner', initialized: false, isDeleted: false, isSuspended: false }];
			},
		} as unknown as DataSource;
		const evaluated: string[] = [];
		const service = createService({
			isFeatureEnabled: async () => true,
			evaluate: async (_user, permission) => {
				evaluated.push(permission);
				return { allowed: permission !== 'join_community', permission, policyId: null, reason: permission === 'join_community' ? 'denied' : 'allowed' };
			},
		}, db);

		await assert.rejects(
			() => gate(service, 'nook/community/settings-update', owner, { communityId: 'legacy' }, 'write:channels'),
			(error: unknown) => error instanceof ApiError && error.code === 'RESTRICTED_BY_NOOK_POLICY',
		);
		assert.deepEqual(evaluated, ['create_community', 'join_community']);
		assert.equal(sqlCalls.length, 1);
		assert.match(sqlCalls[0] ?? '', /LEFT JOIN "nook_community"/);
	});
});
