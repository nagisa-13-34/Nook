/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { NookFeatureFlagsRepository, NookPoliciesRepository, UserProfilesRepository } from '@/models/_.js';
import type { MiLocalUser } from '@/models/User.js';
import { defaultNookFeatureFlags } from '@/nook/feature-flags/NookFeatureFlags.js';
import { NookPolicyEngine } from '@/nook/policy/NookPolicyEngine.js';
import type { NookAccountState, NookPermission, NookPolicyDecision, NookPolicySubject } from '@/nook/policy/PolicyTypes.js';

@Injectable()
export class NookAccessService {
	constructor(
		@Inject(DI.nookPoliciesRepository)
		private nookPoliciesRepository: NookPoliciesRepository,

		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,

		@Inject(DI.nookFeatureFlagsRepository)
		private nookFeatureFlagsRepository: NookFeatureFlagsRepository,
	) {
	}

	public async evaluate(user: MiLocalUser, permission: NookPermission): Promise<NookPolicyDecision> {
		const enforcementFlag = await this.nookFeatureFlagsRepository.findOneBy({ name: 'policy_enforcement' });
		if (!(enforcementFlag?.enabled ?? defaultNookFeatureFlags.policy_enforcement)) {
			return {
				allowed: true,
				permission,
				policyId: null,
				reason: 'enforcement_disabled',
			};
		}

		const [policies, profile] = await Promise.all([
			this.nookPoliciesRepository.find(),
			this.userProfilesRepository.findOne({
				where: { userId: user.id },
				select: {
					userId: true,
					nookCountryCode: true,
					nookVerifiedAgeGroup: true,
					nookPolicyId: true,
				},
			}),
		]);

		const subject: NookPolicySubject = {
			country: profile?.nookCountryCode ?? '*',
			ageGroup: profile?.nookVerifiedAgeGroup ?? 'UNKNOWN',
			accountState: this.getAccountState(user),
			...(profile?.nookPolicyId == null ? {} : { assignedPolicyId: profile.nookPolicyId }),
		};

		return new NookPolicyEngine(policies).evaluate(subject, permission);
	}

	private getAccountState(user: MiLocalUser): NookAccountState {
		if (user.isDeleted) return 'banned';
		if (user.isSuspended) return 'suspended';
		return 'active';
	}
}
