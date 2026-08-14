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

	return {
		service: new NookAccessService(nookPoliciesRepository as never, userProfilesRepository as never, nookFeatureFlagsRepository as never),
		nookPoliciesRepository,
		userProfilesRepository,
		nookFeatureFlagsRepository,
	};
}

const user = {
	id: 'user',
	isDeleted: false,
	isSuspended: false,
} as MiLocalUser;

describe('NookAccessService', () => {
	test('allows existing behavior while policy enforcement is disabled', async () => {
		const { service } = createService(null, deniedPermissions, false);

		await expect(service.evaluate(user, 'create_post')).resolves.toMatchObject({
			allowed: true,
			policyId: null,
			reason: 'enforcement_disabled',
		});
	});

	test('uses the verified age group and country instead of a date of birth', async () => {
		const permissions = createPermissions({ create_post: true });
		const { service } = createService({
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
		const { service } = createService(null);

		await expect(service.evaluate(user, 'create_post')).resolves.toMatchObject({
			allowed: false,
			policyId: null,
			reason: 'policy_not_found',
		});
	});

	test('evaluates multiple media permissions with one policy and profile lookup', async () => {
		const permissions = createPermissions({
			create_post: true,
			create_image_post: true,
			create_video_post: false,
		});
		const { service, nookPoliciesRepository, userProfilesRepository, nookFeatureFlagsRepository } = createService({
			userId: user.id,
			nookCountryCode: 'JP',
			nookVerifiedAgeGroup: '13_15',
			nookPolicyId: null,
		}, permissions);

		await expect(service.evaluateMany(user, ['create_post', 'create_image_post', 'create_video_post'])).resolves.toEqual([
			expect.objectContaining({ permission: 'create_post', allowed: true }),
			expect.objectContaining({ permission: 'create_image_post', allowed: true }),
			expect.objectContaining({ permission: 'create_video_post', allowed: false }),
		]);
		expect(nookFeatureFlagsRepository.findOneBy).toHaveBeenCalledOnce();
		expect(nookPoliciesRepository.find).toHaveBeenCalledOnce();
		expect(userProfilesRepository.findOne).toHaveBeenCalledOnce();
	});

	test('requires stranger and adult chat permissions for a protected sender', async () => {
		const senderPermissions = createPermissions({
			send_chat: true,
			chat_with_stranger: true,
			chat_with_adult: false,
		});
		const adultPermissions = createPermissions({
			receive_chat: true,
			chat_with_stranger: true,
		});
		const nookPoliciesRepository = {
			find: vi.fn().mockResolvedValue([
				{ id: 'JP_13_15', country: 'JP', ageGroup: '13_15', accountStates: ['active'], permissions: senderPermissions, priority: 100, enabled: true },
				{ id: 'JP_18_PLUS', country: 'JP', ageGroup: '18_PLUS', accountStates: ['active'], permissions: adultPermissions, priority: 100, enabled: true },
			]),
		};
		const userProfilesRepository = {
			find: vi.fn().mockResolvedValue([
				{ userId: 'user', nookCountryCode: 'JP', nookVerifiedAgeGroup: '13_15', nookPolicyId: null },
				{ userId: 'adult', nookCountryCode: 'JP', nookVerifiedAgeGroup: '18_PLUS', nookPolicyId: null },
			]),
		};
		const nookFeatureFlagsRepository = {
			findOneBy: vi.fn().mockResolvedValue({ name: 'policy_enforcement', enabled: true }),
		};
		const service = new NookAccessService(nookPoliciesRepository as never, userProfilesRepository as never, nookFeatureFlagsRepository as never);
		const adult = { ...user, id: 'adult' } as MiLocalUser;

		const result = await service.evaluateDirectChat(user, adult, async () => false);

		expect(result.sender).toEqual([
			expect.objectContaining({ permission: 'send_chat', allowed: true }),
			expect.objectContaining({ permission: 'chat_with_stranger', allowed: true }),
		]);
		expect(result.senderTargetSensitive).toEqual([
			expect.objectContaining({ permission: 'chat_with_adult', allowed: false }),
		]);
		expect(result.recipient).toEqual([
			expect.objectContaining({ permission: 'receive_chat', allowed: true }),
			expect.objectContaining({ permission: 'chat_with_stranger', allowed: true }),
		]);
	});

	test('does not require stranger chat permission for mutual followers', async () => {
		const permissions = createPermissions({
			send_chat: true,
			receive_chat: true,
			chat_with_stranger: false,
		});
		const nookPoliciesRepository = {
			find: vi.fn().mockResolvedValue([
				{ id: 'JP_13_15', country: 'JP', ageGroup: '13_15', accountStates: ['active'], permissions, priority: 100, enabled: true },
			]),
		};
		const userProfilesRepository = {
			find: vi.fn().mockResolvedValue([
				{ userId: 'user', nookCountryCode: 'JP', nookVerifiedAgeGroup: '13_15', nookPolicyId: null },
				{ userId: 'friend', nookCountryCode: 'JP', nookVerifiedAgeGroup: '13_15', nookPolicyId: null },
			]),
		};
		const nookFeatureFlagsRepository = {
			findOneBy: vi.fn().mockResolvedValue({ name: 'policy_enforcement', enabled: true }),
		};
		const service = new NookAccessService(nookPoliciesRepository as never, userProfilesRepository as never, nookFeatureFlagsRepository as never);
		const friend = { ...user, id: 'friend' } as MiLocalUser;

		const result = await service.evaluateDirectChat(user, friend, async () => true);

		expect(result.sender).toEqual([
			expect.objectContaining({ permission: 'send_chat', allowed: true }),
		]);
		expect(result.recipient).toEqual([
			expect.objectContaining({ permission: 'receive_chat', allowed: true }),
		]);
	});

	test('requires adult chat permission for unknown and remote counterparts', async () => {
		const permissions = createPermissions({ send_chat: true, chat_with_stranger: true });
		const unknownPermissions = createPermissions({ receive_chat: true, chat_with_stranger: true, chat_with_adult: true });
		const nookPoliciesRepository = {
			find: vi.fn().mockResolvedValue([
				{ id: 'JP_13_15', country: 'JP', ageGroup: '13_15', accountStates: ['active'], permissions, priority: 100, enabled: true },
				{ id: 'UNKNOWN', country: '*', ageGroup: 'UNKNOWN', accountStates: ['active'], permissions: unknownPermissions, priority: 100, enabled: true },
			]),
		};
		const userProfilesRepository = {
			find: vi.fn().mockResolvedValue([
				{ userId: user.id, nookCountryCode: 'JP', nookVerifiedAgeGroup: '13_15', nookPolicyId: null },
				{ userId: 'unknown', nookCountryCode: null, nookVerifiedAgeGroup: null, nookPolicyId: null },
			]),
		};
		const nookFeatureFlagsRepository = {
			findOneBy: vi.fn().mockResolvedValue({ name: 'policy_enforcement', enabled: true }),
		};
		const service = new NookAccessService(nookPoliciesRepository as never, userProfilesRepository as never, nookFeatureFlagsRepository as never);
		const unknown = { ...user, id: 'unknown' } as MiLocalUser;

		const remoteResult = await service.evaluateDirectChat(user, null, async () => false);
		const unknownResult = await service.evaluateDirectChat(user, unknown, async () => false);

		expect(remoteResult.senderTargetSensitive).toEqual([
			expect.objectContaining({ permission: 'chat_with_adult', allowed: false }),
		]);
		expect(unknownResult.senderTargetSensitive).toEqual([
			expect.objectContaining({ permission: 'chat_with_adult', allowed: false }),
		]);
	});

	test('does not resolve mutual following while enforcement is disabled', async () => {
		const { service } = createService(null, deniedPermissions, false);
		const resolveIsMutual = vi.fn().mockResolvedValue(false);

		const result = await service.evaluateDirectChat(user, null, resolveIsMutual);

		expect(resolveIsMutual).not.toHaveBeenCalled();
		expect(result.sender).toEqual([
			expect.objectContaining({ permission: 'send_chat', allowed: true, reason: 'enforcement_disabled' }),
		]);
	});
});
