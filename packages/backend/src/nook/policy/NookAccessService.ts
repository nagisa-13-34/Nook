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

export type NookDirectChatPair = Readonly<{
	sender: MiLocalUser;
	recipient: MiLocalUser | null;
	isMutual: boolean;
}>;

type NookPolicyProfile = Readonly<{
	userId: string;
	nookCountryCode: string | null;
	nookVerifiedAgeGroup: NookAgeGroup | null;
	nookPolicyId: string | null;
}>;

type NookDirectChatRecipientState =
	| Readonly<{ kind: 'remote'; ageGroup: 'UNKNOWN' }>
	| Readonly<{ kind: 'local'; ageGroup: NookAgeGroup; profile: NookPolicyProfile | undefined }>;

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
		const enforcementFlag = await this.nookFeatureFlagsRepository.findOneBy({ name: 'policy_enforcement' });
		if (!(enforcementFlag?.enabled ?? defaultNookFeatureFlags.policy_enforcement)) {
			return this.allowDirectChatDisabled(recipient);
		}

		const isMutual = await resolveIsMutual();
		const [evaluation] = await this.evaluateDirectChatPairsEnabled([{ sender, recipient, isMutual }]);
		if (evaluation == null) {
			throw new Error('Nook direct chat policy evaluation did not return a decision.');
		}

		return evaluation;
	}

	public async evaluateDirectChats(sender: MiLocalUser, targets: readonly NookDirectChatTarget[]): Promise<NookDirectChatEvaluation[]> {
		return await this.evaluateDirectChatPairs(targets.map(target => ({
			sender,
			recipient: target.recipient,
			isMutual: target.isMutual,
		})));
	}

	public async evaluateDirectChatPairs(pairs: readonly NookDirectChatPair[]): Promise<NookDirectChatEvaluation[]> {
		if (pairs.length === 0) return [];

		const enforcementFlag = await this.nookFeatureFlagsRepository.findOneBy({ name: 'policy_enforcement' });
		if (!(enforcementFlag?.enabled ?? defaultNookFeatureFlags.policy_enforcement)) {
			return pairs.map(pair => this.allowDirectChatDisabled(pair.recipient));
		}

		return await this.evaluateDirectChatPairsEnabled(pairs);
	}

	private async evaluateDirectChatPairsEnabled(pairs: readonly NookDirectChatPair[]): Promise<NookDirectChatEvaluation[]> {
		const userIds = [...new Set(pairs.flatMap(pair => pair.recipient == null
			? [pair.sender.id]
			: [pair.sender.id, pair.recipient.id]))];
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
		const profileByUserId = new Map<string, NookPolicyProfile>(profiles.map(profile => [profile.userId, profile]));

		return pairs.map(pair => this.evaluateDirectChatLoaded(pair, engine, profileByUserId));
	}

	private evaluateDirectChatLoaded(
		pair: NookDirectChatPair,
		engine: NookPolicyEngine,
		profileByUserId: ReadonlyMap<string, NookPolicyProfile>,
	): NookDirectChatEvaluation {
		const recipient = pair.recipient;
		const senderPermissions: NookPermission[] = ['send_chat'];
		const recipientPermissions: NookPermission[] = recipient == null ? [] : ['receive_chat'];
		const senderTargetSensitivePermissions: NookPermission[] = [];

		if (!pair.isMutual) {
			senderPermissions.push('chat_with_stranger');
			if (recipient != null) recipientPermissions.push('chat_with_stranger');
		}

		const senderProfile = profileByUserId.get(pair.sender.id);
		const senderAgeGroup = senderProfile?.nookVerifiedAgeGroup ?? 'UNKNOWN';
		const recipientState: NookDirectChatRecipientState = recipient == null
			? { kind: 'remote', ageGroup: 'UNKNOWN' }
			: {
				kind: 'local',
				profile: profileByUserId.get(recipient.id),
				ageGroup: profileByUserId.get(recipient.id)?.nookVerifiedAgeGroup ?? 'UNKNOWN',
			};

		// Remote recipients have no authoritative Nook age/profile data. Treat that
		// uncertainty explicitly and require the sender's adult-target permission.
		if (!isNookAdultAgeGroup(senderAgeGroup) && (
			recipientState.kind === 'remote' ||
			recipientState.ageGroup === 'UNKNOWN' ||
			isNookAdultAgeGroup(recipientState.ageGroup)
		)) {
			senderTargetSensitivePermissions.push('chat_with_adult');
		}

		if (recipientState.kind === 'local' &&
			!isNookAdultAgeGroup(recipientState.ageGroup) &&
			(senderAgeGroup === 'UNKNOWN' || isNookAdultAgeGroup(senderAgeGroup))) {
			recipientPermissions.push('chat_with_adult');
		}

		const senderSubject = this.getSubject(pair.sender, senderProfile);
		return {
			sender: senderPermissions.map(permission => engine.evaluate(senderSubject, permission)),
			senderTargetSensitive: senderTargetSensitivePermissions.map(permission => engine.evaluate(senderSubject, permission)),
			recipient: recipient == null
				? null
				: recipientPermissions.map(permission => engine.evaluate(
					this.getSubject(recipient, recipientState.kind === 'local' ? recipientState.profile : undefined),
					permission,
				)),
		};
	}

	private allowDirectChatDisabled(recipient: MiLocalUser | null): NookDirectChatEvaluation {
		return {
			sender: this.allowDisabled(['send_chat']),
			senderTargetSensitive: [],
			recipient: recipient == null ? null : this.allowDisabled(['receive_chat']),
		};
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
