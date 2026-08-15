/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type {
	NookPermission,
	NookPolicy,
	NookPolicyDecision,
	NookPolicySubject,
} from './PolicyTypes.js';

export class NookPolicyEngine {
	private readonly policies: readonly NookPolicy[];

	public constructor(policies: readonly NookPolicy[]) {
		this.policies = [...policies];
	}

	public resolve(subject: NookPolicySubject): NookPolicy | null {
		if (subject.assignedPolicyId != null) {
			return this.policies.find((policy) =>
				policy.enabled &&
				policy.id === subject.assignedPolicyId &&
				(policy.country === subject.country || policy.country === '*') &&
				policy.ageGroup === subject.ageGroup &&
				policy.accountStates.includes(subject.accountState),
			) ?? null;
		}

		return this.policies
			.filter((policy) =>
				policy.enabled &&
				(policy.country === subject.country || policy.country === '*') &&
				policy.ageGroup === subject.ageGroup &&
				policy.accountStates.includes(subject.accountState),
			)
			.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))[0] ?? null;
	}

	public evaluate(subject: NookPolicySubject, permission: NookPermission): NookPolicyDecision {
		const policy = this.resolve(subject);

		if (policy == null) {
			return {
				allowed: false,
				permission,
				policyId: null,
				reason: 'policy_not_found',
			};
		}

		const allowed = policy.permissions[permission];

		return {
			allowed,
			permission,
			policyId: policy.id,
			reason: allowed ? 'allowed' : 'denied',
		};
	}
}
