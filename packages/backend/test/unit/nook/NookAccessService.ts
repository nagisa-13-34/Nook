/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
import type { MiLocalUser } from '@/models/User.js';
import { NookAccessService } from '@/nook/policy/NookAccessService.js';
import { nookPermissions, type NookPermissionSet } from '@/nook/policy/PolicyTypes.js';

function createPermissions(overrides: Partial<NookPermissionSet> = {}): NookPermissionSet {
	return Object.fromEntries(nookPermissions.map(permission => [
		permission,
		overrides[permission] ?? false,
	])) as NookPermissionSet;
}

const deniedPermissions = createPermissions();

function createService(profile: Record<string, unknown> | null, permissions: NookPermissionSet = deniedPermissions, enforcementEnabled = true) {
	const nookPoliciesRepository = {
		find: vi.fn().mockResolvedValue([{
			id: 'JP_13_15',
			country: 'JP',
			ageGroup: '13_15',
			accountStates: ['active'],
			permissions,
			priority: 100,
			enabled: true,
		}]),
	};
	const userProfilesRepository = {
		findOne: vi.fn().mockResolvedValue(profile),
	};
	const nookFeatureFlagsRepository = {
		findOneBy: vi.fn().mockResolvedValue({ name: 'policy_enforcement', enabled: enforcementEnabled }),
	};

	return new NookAccessService(nookPoliciesRepository as never, userProfilesRepository as never, nookFeatureFlagsRepository as never);
}

const user = {
	id: 'user',
	isDeleted: false,
	isSuspended: false,
} as MiLocalUser;

describe('NookAccessService', () => {
	test('allows existing behavior while policy enforcement is disabled', async () => {
		const service = createService(null, deniedPermissions, false);

		await expect(service.evaluate(user, 'create_post')).resolves.toMatchObject({
			allowed: true,
			policyId: null,
			reason: 'enforcement_disabled',
		});
	});

	test('uses the verified age group and country instead of a date of birth', async () => {
		const permissions = createPermissions({ create_post: true });
		const service = createService({
			userId: user.id,
			nookCountryCode: 'JP',
			nookVerifiedAgeGroup: '13_15',
			nookPolicyId: null,
		}, permissions);

		await expect(service.evaluate(user, 'create_post')).resolves.toMatchObject({
			allowed: true,
			policyId: 'JP_13_15',
		});
	});

	test('denies access when no verified user context matches a policy', async () => {
		const service = createService(null);

		await expect(service.evaluate(user, 'create_post')).resolves.toMatchObject({
			allowed: false,
			policyId: null,
			reason: 'policy_not_found',
		});
	});
});
