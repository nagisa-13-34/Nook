/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export const nookPermissions = [
	'create_post',
	'create_image_post',
	'create_video_post',
	'public_profile',
	'discoverable_profile',
	'follow_user',
	'receive_follow',
	'send_chat',
	'receive_chat',
	'chat_with_stranger',
	'chat_with_adult',
	'voice_call',
	'video_call',
	'call_with_stranger',
	'call_with_adult',
	'join_community',
	'create_community',
	'join_space',
	'speak_in_space',
	'create_space',
	'external_link',
	'location_share',
	'recommendation',
	'personalized_ads',
] as const;

export type NookPermission = typeof nookPermissions[number];

export const nookAgeGroups = [
	'U13',
	'13_15',
	'16_17',
	'18_PLUS',
	'UNKNOWN',
] as const;

export type NookAgeGroup = typeof nookAgeGroups[number];

export const nookAgeGroupClasses = {
	U13: 'protected',
	'13_15': 'protected',
	'16_17': 'protected',
	'18_PLUS': 'adult',
	UNKNOWN: 'unknown',
} as const satisfies Record<NookAgeGroup, 'protected' | 'adult' | 'unknown'>;

export function isNookAdultAgeGroup(ageGroup: NookAgeGroup): boolean {
	return nookAgeGroupClasses[ageGroup] === 'adult';
}

export const nookAccountStates = [
	'active',
	'limited',
	'suspended',
	'banned',
] as const;

export type NookAccountState = typeof nookAccountStates[number];

export type NookPermissionSet = Readonly<Record<NookPermission, boolean>>;

export type NookPolicy = Readonly<{
	id: string;
	country: string;
	ageGroup: NookAgeGroup;
	accountStates: readonly NookAccountState[];
	permissions: NookPermissionSet;
	priority: number;
	enabled: boolean;
}>;

export type NookPolicySubject = Readonly<{
	country: string;
	ageGroup: NookAgeGroup;
	accountState: NookAccountState;
	assignedPolicyId?: string;
}>;

export type NookPolicyDecision = Readonly<{
	allowed: boolean;
	permission: NookPermission;
	policyId: string | null;
	reason: 'allowed' | 'denied' | 'policy_not_found' | 'enforcement_disabled';
}>;
