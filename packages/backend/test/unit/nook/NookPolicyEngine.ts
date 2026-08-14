/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { NookPolicyEngine } from '@/nook/policy/NookPolicyEngine.js';
import { nookPermissions } from '@/nook/policy/PolicyTypes.js';
import type { NookPermissionSet, NookPolicy } from '@/nook/policy/PolicyTypes.js';

const permissions = (allowed: readonly (typeof nookPermissions[number])[] = []): NookPermissionSet =>
	Object.fromEntries(nookPermissions.map((permission) => [permission, allowed.includes(permission)])) as NookPermissionSet;

const jpPolicy: NookPolicy = {
	id: 'JP_13_15',
	country: 'JP',
	ageGroup: '13_15',
	accountStates: ['active'],
	permissions: permissions(['create_post']),
	priority: 100,
	enabled: true,
};

describe(NookPolicyEngine, () => {
	test('country, age group and account stateからPolicyを決定する', () => {
		const engine = new NookPolicyEngine([jpPolicy]);

		expect(engine.resolve({
			country: 'JP',
			ageGroup: '13_15',
			accountState: 'active',
		})?.id).toBe('JP_13_15');
	});

	test('Policyが存在しない場合は安全側に倒す', () => {
		const engine = new NookPolicyEngine([jpPolicy]);

		expect(engine.evaluate({
			country: 'JP',
			ageGroup: 'UNKNOWN',
			accountState: 'active',
		}, 'create_post')).toEqual({
			allowed: false,
			permission: 'create_post',
			policyId: null,
			reason: 'policy_not_found',
		});
	});

	test('許可と拒否をPolicyのPermissionから返す', () => {
		const engine = new NookPolicyEngine([jpPolicy]);
		const subject = {
			country: 'JP',
			ageGroup: '13_15',
			accountState: 'active',
		} as const;

		expect(engine.evaluate(subject, 'create_post').allowed).toBe(true);
		expect(engine.evaluate(subject, 'send_chat').allowed).toBe(false);
	});

	test('明示的に割り当てられたPolicyを優先する', () => {
		const assignedPolicy: NookPolicy = {
			...jpPolicy,
			id: 'JP_RESTRICTED',
			permissions: permissions(),
		};
		const engine = new NookPolicyEngine([jpPolicy, assignedPolicy]);

		expect(engine.resolve({
			country: 'JP',
			ageGroup: '13_15',
			accountState: 'active',
			assignedPolicyId: 'JP_RESTRICTED',
		})?.id).toBe('JP_RESTRICTED');
	});
});
