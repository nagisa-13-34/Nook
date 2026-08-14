/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { NookFeatureFlagsRepository, NookPoliciesRepository, UserProfilesRepository } from '@/models/_.js';
import type { MiLocalUser } from '@/models/User.js';
import { defaultNookFeatureFlags } from '@/nook/feature-flags/NookFeatureFlags.js';
import type { NookFeatureName } from '@/nook/feature-flags/NookFeatureFlags.js';
import { NookPolicyEngine } from '@/nook/policy/NookPolicyEngine.js';
import { isNookAdultAgeGroup } from '@/nook/policy/PolicyTypes.js';
import type { NookAccountState, NookAgeGroup, NookPermission, NookPolicyDecision, NookPolicySubject } from '@/nook/policy/PolicyTypes.js';

export type NookDirectChatEvaluation = Readonly<{
	sender: NookPolicyDecision[];
	senderTargetSensitive: NookPolicyDecision[];
	recipient: NookPolicyDecision[] | null;
}>;

export type NookDirectChatTarget = Readonly<{
	recipient: MiLocalUser | null;
	isMutual: boolean;
}>;

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

	public async isFeatureEnabled(feature: NookFeatureName): Promise<boolean> {
		const flag = await this.nookFeatureFlagsRepository.findOneBy({ name: feature });
		return flag?.enabled ?? defaultNookFeatureFlags[feature];
	}

	public async evaluate(user: MiLocalUser, permission: NookPermission): Promise<NookPolicyDecision> {
		const [decision] = await this.evaluateMany(user, [permission]);
		if (decision == null) {
			throw new Error('Nook policy evaluation did not return a decision.');
		}

		return decision;
	}

	public async evaluateMany(user: MiLocalUser, permissions: readonly NookPermission[]): Promise<NookPolicyDecision[]> {
		const enforcementFlag = await this.nookFeatureFlagsRepository.findOneBy({ name: 'policy_enforcement' });
		if (!(enforcementFlag?.enabled ?? defaultNookFeatureFlags.policy_enforcement)) {
			return permissions.map(permission => ({
				allowed: true,
				permission,
				policyId: null,
				reason: 'enforcement_disabled',
			}));
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

		const engine = new NookPolicyEngine(policies);
		return permissions.map(permission => engine.evaluate(subject, permission));
	}

	public async evaluateDirectChat(sender: MiLocalUser, recipient: MiLocalUser | null, resolveIsMutual: () => Promise<boolean>): Promise<NookDirectChatEvaluation> {
		const senderPermissions: NookPermission[] = ['send_chat'];
		const recipientPermissions: NookPermission[] = recipient == null ? [] : ['receive_chat'];
		const senderTargetSensitivePermissions: NookPermission[] = [];

		const enforcementFlag = await this.nookFeatureFlagsRepository.findOneBy({ name: 'policy_enforcement' });
		if (!(enforcementFlag?.enabled ?? defaultNookFeatureFlags.policy_enforcement)) {
			return {
				sender: this.allowDisabled(senderPermissions),
				senderTargetSensitive: [],
				recipient: recipient == null ? null : this.allowDisabled(recipientPermissions),
			};
		}

		const isMutual = await resolveIsMutual();
		if (!isMutual) {
			senderPermissions.push('chat_with_stranger');
			if (recipient != null) recipientPermissions.push('chat_with_stranger');
		}

		const userIds = recipient == null ? [sender.id] : [sender.id, recipient.id];
		const [policies, profiles] = await Promise.all([
			this.nookPoliciesRepository.find(),
			this.userProfilesRepository.find({
				where: userIds.map(userId => ({ userId })),
				select: {
					userId: true,
					nookCountryCode: true,
					nookVerifiedAgeGroup: true,
					nookPolicyId: true,
				},
			}),
		]);
		const profileByUserId = new Map(profiles.map(profile => [profile.userId, profile]));
		const senderProfile = profileByUserId.get(sender.id);
		const senderAgeGroup = senderProfile?.nookVerifiedAgeGroup ?? 'UNKNOWN';
		const recipientProfile = recipient == null ? null : profileByUserId.get(recipient.id);
		const recipientAgeGroup = recipientProfile?.nookVerifiedAgeGroup ?? 'UNKNOWN';

		if (!isNookAdultAgeGroup(senderAgeGroup) && (recipient == null || recipientAgeGroup === 'UNKNOWN' || isNookAdultAgeGroup(recipientAgeGroup))) {
			senderTargetSensitivePermissions.push('chat_with_adult');
		}
		if (recipient != null && !isNookAdultAgeGroup(recipientAgeGroup) && (senderAgeGroup === 'UNKNOWN' || isNookAdultAgeGroup(senderAgeGroup))) {
			recipientPermissions.push('chat_with_adult');
		}

		const engine = new NookPolicyEngine(policies);
		return {
			sender: senderPermissions.map(permission => engine.evaluate(this.getSubject(sender, senderProfile), permission)),
			senderTargetSensitive: senderTargetSensitivePermissions.map(permission => engine.evaluate(this.getSubject(sender, senderProfile), permission)),
			recipient: recipient == null ? null : recipientPermissions.map(permission => engine.evaluate(this.getSubject(recipient, recipientProfile), permission)),
		};
	}

	public async evaluateDirectChats(sender: MiLocalUser, targets: readonly NookDirectChatTarget[]): Promise<NookDirectChatEvaluation[]> {
		if (targets.length === 0) return [];

		const enforcementFlag = await this.nookFeatureFlagsRepository.findOneBy({ name: 'policy_enforcement' });
		if (!(enforcementFlag?.enabled ?? defaultNookFeatureFlags.policy_enforcement)) {
			return targets.map(target => ({
				sender: this.allowDisabled(['send_chat']),
				senderTargetSensitive: [],
				recipient: target.recipient == null ? null : this.allowDisabled(['receive_chat']),
			}));
		}

		const localRecipientIds = targets.flatMap(target => target.recipient == null ? [] : [target.recipient.id]);
		const userIds = [...new Set([sender.id, ...localRecipientIds])];
		const [policies, profiles] = await Promise.all([
			this.nookPoliciesRepository.find(),
			this.userProfilesRepository.find({
				where: userIds.map(userId => ({ userId })),
				select: {
					userId: true,
					nookCountryCode: true,
					nookVerifiedAgeGroup: true,
					nookPolicyId: true,
				},
			}),
		]);

		const engine = new NookPolicyEngine(policies);
		const profileByUserId = new Map(profiles.map(profile => [profile.userId, profile]));
		const senderProfile = profileByUserId.get(sender.id);
		const senderAgeGroup = senderProfile?.nookVerifiedAgeGroup ?? 'UNKNOWN';
		const senderSubject = this.getSubject(sender, senderProfile);

		return targets.map(target => {
			const senderPermissions: NookPermission[] = ['send_chat'];
			const recipientPermissions: NookPermission[] = target.recipient == null ? [] : ['receive_chat'];
			const senderTargetSensitivePermissions: NookPermission[] = [];

			if (!target.isMutual) {
				senderPermissions.push('chat_with_stranger');
				if (target.recipient != null) recipientPermissions.push('chat_with_stranger');
			}

			const recipientProfile = target.recipient == null ? null : profileByUserId.get(target.recipient.id);
			const recipientAgeGroup = recipientProfile?.nookVerifiedAgeGroup ?? 'UNKNOWN';

			if (!isNookAdultAgeGroup(senderAgeGroup) && (target.recipient == null || recipientAgeGroup === 'UNKNOWN' || isNookAdultAgeGroup(recipientAgeGroup))) {
				senderTargetSensitivePermissions.push('chat_with_adult');
			}
			if (target.recipient != null && !isNookAdultAgeGroup(recipientAgeGroup) && (senderAgeGroup === 'UNKNOWN' || isNookAdultAgeGroup(senderAgeGroup))) {
				recipientPermissions.push('chat_with_adult');
			}

			return {
				sender: senderPermissions.map(permission => engine.evaluate(senderSubject, permission)),
				senderTargetSensitive: senderTargetSensitivePermissions.map(permission => engine.evaluate(senderSubject, permission)),
				recipient: target.recipient == null ? null : recipientPermissions.map(permission => engine.evaluate(this.getSubject(target.recipient, recipientProfile), permission)),
			};
		});
	}

	private allowDisabled(permissions: readonly NookPermission[]): NookPolicyDecision[] {
		return permissions.map(permission => ({
			allowed: true,
			permission,
			policyId: null,
			reason: 'enforcement_disabled',
		}));
	}

	private getSubject(user: MiLocalUser, profile: {
		nookCountryCode: string | null;
		nookVerifiedAgeGroup: NookAgeGroup | null;
		nookPolicyId: string | null;
	} | null | undefined): NookPolicySubject {
		return {
			country: profile?.nookCountryCode ?? '*',
			ageGroup: profile?.nookVerifiedAgeGroup ?? 'UNKNOWN',
			accountState: this.getAccountState(user),
			...(profile?.nookPolicyId == null ? {} : { assignedPolicyId: profile.nookPolicyId }),
		};
	}

	private getAccountState(user: MiLocalUser): NookAccountState {
		if (user.isDeleted) return 'banned';
		if (user.isSuspended) return 'suspended';
		return 'active';
	}
}
