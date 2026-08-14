/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { NookPolicyEngine } from '@/nook/policy/NookPolicyEngine.js';
import { nookPermissions } from '@/nook/policy/PolicyTypes.js';
import type { NookPermissionSet, NookPolicy, NookPolicySubject } from '@/nook/policy/PolicyTypes.js';

function permissions(overrides: Partial<NookPermissionSet> = {}): NookPermissionSet {
	return {
		...Object.fromEntries(nookPermissions.map(permission => [permission, false])) as NookPermissionSet,
		...overrides,
	};
}

function policy(overrides: Partial<NookPolicy> = {}): NookPolicy {
	return {
		id: 'default-u13',
		country: 'JP',
		ageGroup: 'U13',
		accountStates: ['active'],
		permissions: permissions({ send_chat: true }),
		priority: 0,
		enabled: true,
		...overrides,
	};
}

const baseSubject: NookPolicySubject = {
	country: 'JP',
	ageGroup: 'U13',
	accountState: 'active',
};

describe('NookPolicyEngine', () => {
	test('assigned policy still has to match the subject age group', () => {
		const adultPolicy = policy({ id: 'adult', ageGroup: '18_PLUS' });
		const engine = new NookPolicyEngine([adultPolicy]);

		expect(engine.resolve({ ...baseSubject, assignedPolicyId: adultPolicy.id })).toBeNull();
	});

	test('assigned policy still has to match the subject country', () => {
		const usPolicy = policy({ id: 'us-u13', country: 'US' });
		const engine = new NookPolicyEngine([usPolicy]);

		expect(engine.resolve({ ...baseSubject, assignedPolicyId: usPolicy.id })).toBeNull();
	});

	test('assigned wildcard-country policy can match any country', () => {
		const wildcardPolicy = policy({ id: 'global-u13', country: '*' });
		const engine = new NookPolicyEngine([wildcardPolicy]);

		expect(engine.resolve({ ...baseSubject, assignedPolicyId: wildcardPolicy.id })?.id).toBe(wildcardPolicy.id);
	});

	test('assigned disabled policy is rejected', () => {
		const disabledPolicy = policy({ id: 'disabled', enabled: false });
		const engine = new NookPolicyEngine([disabledPolicy]);

		expect(engine.resolve({ ...baseSubject, assignedPolicyId: disabledPolicy.id })).toBeNull();
	});

	test('normal resolution uses the highest-priority matching policy', () => {
		const low = policy({ id: 'low', priority: 1 });
		const high = policy({ id: 'high', priority: 10 });
		const engine = new NookPolicyEngine([low, high]);

		expect(engine.resolve(baseSubject)?.id).toBe(high.id);
	});
});
