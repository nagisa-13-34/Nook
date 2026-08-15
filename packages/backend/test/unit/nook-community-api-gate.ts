/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test } from 'vitest';
import type { MiLocalUser } from '@/models/User.js';
import type { NookAccessService } from '@/nook/policy/NookAccessService.js';
import { ApiServerService } from '@/server/api/ApiServerService.js';
import { ApiError } from '@/server/api/error.js';

function createService(access: Pick<NookAccessService, 'isFeatureEnabled' | 'evaluate'>): ApiServerService {
	return new ApiServerService(
		{} as never,
		{} as never,
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

async function gate(service: ApiServerService, endpoint: string, user: MiLocalUser | null): Promise<void> {
	await (service as unknown as { assertNookEndpointAccess: (endpointName: string, me: MiLocalUser | null) => Promise<void> }).assertNookEndpointAccess(endpoint, user);
}

const user = { id: 'user', isDeleted: false, isSuspended: false } as unknown as MiLocalUser;

describe('Nook Community API feature and policy gate', () => {
	test('Community endpoints are unavailable while the Community feature is disabled', async () => {
		const service = createService({
			isFeatureEnabled: async () => false,
			evaluate: async () => ({ allowed: true, reasonCode: 'default_allow', detail: null }),
		});
		await assert.rejects(
			() => gate(service, 'nook/community/show', null),
			(error: unknown) => error instanceof ApiError && error.code === 'NOOK_COMMUNITY_DISABLED',
		);
	});

	test('Voice endpoints require the voice_call feature in addition to Community', async () => {
		const service = createService({
			isFeatureEnabled: async feature => feature === 'community',
			evaluate: async () => ({ allowed: true, reasonCode: 'default_allow', detail: null }),
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
				return { allowed: false, reasonCode: 'deny', detail: null };
			},
		});
		await assert.rejects(
			() => gate(service, 'nook/community/join', user),
			(error: unknown) => error instanceof ApiError && error.code === 'RESTRICTED_BY_NOOK_POLICY',
		);
		assert.deepEqual(evaluated, ['join_community']);
	});

	test('Voice endpoints require voice_call policy', async () => {
		const evaluated: string[] = [];
		const service = createService({
			isFeatureEnabled: async () => true,
			evaluate: async (_user, permission) => {
				evaluated.push(permission);
				return { allowed: false, reasonCode: 'deny', detail: null };
			},
		});
		await assert.rejects(
			() => gate(service, 'nook/community/voice/heartbeat', user),
			(error: unknown) => error instanceof ApiError && error.code === 'RESTRICTED_BY_NOOK_POLICY',
		);
		assert.deepEqual(evaluated, ['voice_call']);
	});
});
