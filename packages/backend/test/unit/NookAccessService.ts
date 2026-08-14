/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
import { NookAccessService } from '@/nook/policy/NookAccessService.js';
import { nookPermissions } from '@/nook/policy/PolicyTypes.js';
import type { NookFeatureFlagsRepository, NookPoliciesRepository, UserProfilesRepository } from '@/models/_.js';
import type { MiLocalUser } from '@/models/User.js';
import type { NookPermissionSet, NookPolicy } from '@/nook/policy/PolicyTypes.js';

function permissions(overrides: Partial<NookPermissionSet> = {}): NookPermissionSet {
	return {
		...Object.fromEntries(nookPermissions.map(permission => [permission, false])) as NookPermissionSet,
		...overrides,
	};
}

function localUser(id: string): MiLocalUser {
	return {
		id,
		host: null,
		isDeleted: false,
		isSuspended: false,
	} as MiLocalUser;
}

function buildService(policies: readonly NookPolicy[], profiles: readonly {
	userId: string;
	nookCountryCode: string | null;
	nookVerifiedAgeGroup: 'U13' | '13_15' | '16_17' | '18_PLUS' | 'UNKNOWN' | null;
	nookPolicyId: string | null;
}[]) {
	const nookPoliciesRepository = {
		find: vi.fn().mockResolvedValue(policies),
	} as unknown as NookPoliciesRepository;
	const userProfilesRepository = {
		find: vi.fn().mockResolvedValue(profiles),
		findOne: vi.fn(),
	} as unknown as UserProfilesRepository;
	const nookFeatureFlagsRepository = {
		findOneBy: vi.fn().mockResolvedValue({ name: 'policy_enforcement', enabled: true }),
	} as unknown as NookFeatureFlagsRepository;

	return {
		service: new NookAccessService(nookPoliciesRepository, userProfilesRepository, nookFeatureFlagsRepository),
		nookPoliciesRepository,
		userProfilesRepository,
	};
}

describe('NookAccessService', () => {
	test('remote recipient is explicitly treated as unknown and requires chat_with_adult for a protected sender', async () => {
		const sender = localUser('sender');
		const protectedPolicy: NookPolicy = {
			id: 'protected',
			country: 'JP',
			ageGroup: '13_15',
			accountStates: ['active'],
			permissions: permissions({
				send_chat: true,
				chat_with_stranger: true,
				chat_with_adult: false,
			}),
			priority: 0,
			enabled: true,
		};
		const { service } = buildService([protectedPolicy], [{
			userId: sender.id,
			nookCountryCode: 'JP',
			nookVerifiedAgeGroup: '13_15',
			nookPolicyId: null,
		}]);

		const [evaluation] = await service.evaluateDirectChatPairs([{ sender, recipient: null, isMutual: false }]);

		expect(evaluation?.senderTargetSensitive).toEqual([
			expect.objectContaining({ permission: 'chat_with_adult', allowed: false }),
		]);
		expect(evaluation?.recipient).toBeNull();
	});

	test('direct chat pairs load policies and profiles once for a mixed room', async () => {
		const sender = localUser('sender');
		const recipientA = localUser('recipient-a');
		const recipientB = localUser('recipient-b');
		const adultPolicy: NookPolicy = {
			id: 'adult',
			country: 'JP',
			ageGroup: '18_PLUS',
			accountStates: ['active'],
			permissions: permissions({
				send_chat: true,
				receive_chat: true,
				chat_with_stranger: true,
				chat_with_adult: true,
			}),
			priority: 0,
			enabled: true,
		};
		const profiles = [sender, recipientA, recipientB].map(user => ({
			userId: user.id,
			nookCountryCode: 'JP',
			nookVerifiedAgeGroup: '18_PLUS' as const,
			nookPolicyId: null,
		}));
		const { service, nookPoliciesRepository, userProfilesRepository } = buildService([adultPolicy], profiles);

		await service.evaluateDirectChatPairs([
			{ sender, recipient: recipientA, isMutual: true },
			{ sender: recipientA, recipient: sender, isMutual: true },
			{ sender, recipient: recipientB, isMutual: false },
			{ sender, recipient: null, isMutual: false },
		]);

		expect(nookPoliciesRepository.find).toHaveBeenCalledTimes(1);
		expect(userProfilesRepository.find).toHaveBeenCalledTimes(1);
	});
});
