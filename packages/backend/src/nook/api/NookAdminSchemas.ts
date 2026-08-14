/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { nookFeatureNames } from '@/nook/feature-flags/NookFeatureFlags.js';
import { nookAccountStates, nookAgeGroups, nookPermissions, type NookPermission } from '@/nook/policy/PolicyTypes.js';

export const nookPermissionProperties = {
	create_post: { type: 'boolean', optional: false, nullable: false },
	create_image_post: { type: 'boolean', optional: false, nullable: false },
	create_video_post: { type: 'boolean', optional: false, nullable: false },
	public_profile: { type: 'boolean', optional: false, nullable: false },
	discoverable_profile: { type: 'boolean', optional: false, nullable: false },
	follow_user: { type: 'boolean', optional: false, nullable: false },
	receive_follow: { type: 'boolean', optional: false, nullable: false },
	send_chat: { type: 'boolean', optional: false, nullable: false },
	receive_chat: { type: 'boolean', optional: false, nullable: false },
	chat_with_stranger: { type: 'boolean', optional: false, nullable: false },
	chat_with_adult: { type: 'boolean', optional: false, nullable: false },
	voice_call: { type: 'boolean', optional: false, nullable: false },
	video_call: { type: 'boolean', optional: false, nullable: false },
	call_with_stranger: { type: 'boolean', optional: false, nullable: false },
	call_with_adult: { type: 'boolean', optional: false, nullable: false },
	join_community: { type: 'boolean', optional: false, nullable: false },
	create_community: { type: 'boolean', optional: false, nullable: false },
	join_space: { type: 'boolean', optional: false, nullable: false },
	speak_in_space: { type: 'boolean', optional: false, nullable: false },
	create_space: { type: 'boolean', optional: false, nullable: false },
	external_link: { type: 'boolean', optional: false, nullable: false },
	location_share: { type: 'boolean', optional: false, nullable: false },
	recommendation: { type: 'boolean', optional: false, nullable: false },
	personalized_ads: { type: 'boolean', optional: false, nullable: false },
} as const satisfies Record<NookPermission, { type: 'boolean'; optional: false; nullable: false }>;

export const nookPermissionsSchema = {
	type: 'object',
	optional: false,
	nullable: false,
	additionalProperties: false,
	properties: nookPermissionProperties,
	required: nookPermissions,
} as const;

export const nookPolicySchema = {
	type: 'object',
	optional: false,
	nullable: false,
	properties: {
		id: { type: 'string', optional: false, nullable: false },
		createdAt: { type: 'string', format: 'date-time', optional: false, nullable: false },
		updatedAt: { type: 'string', format: 'date-time', optional: false, nullable: false },
		country: { type: 'string', optional: false, nullable: false },
		ageGroup: { type: 'string', enum: nookAgeGroups, optional: false, nullable: false },
		accountStates: {
			type: 'array',
			optional: false,
			nullable: false,
			items: { type: 'string', enum: nookAccountStates, optional: false, nullable: false },
		},
		permissions: nookPermissionsSchema,
		priority: { type: 'integer', optional: false, nullable: false },
		enabled: { type: 'boolean', optional: false, nullable: false },
	},
} as const;

export const nookFeatureFlagSchema = {
	type: 'object',
	optional: false,
	nullable: false,
	properties: {
		name: { type: 'string', enum: nookFeatureNames, optional: false, nullable: false },
		enabled: { type: 'boolean', optional: false, nullable: false },
		updatedAt: { type: 'string', format: 'date-time', optional: false, nullable: true },
	},
} as const;

export const nookUpdatedFeatureFlagSchema = {
	...nookFeatureFlagSchema,
	properties: {
		...nookFeatureFlagSchema.properties,
		updatedAt: { type: 'string', format: 'date-time', optional: false, nullable: false },
	},
} as const;

export const nookUserPolicyContextSchema = {
	type: 'object',
	optional: false,
	nullable: false,
	properties: {
		userId: { type: 'string', format: 'id', optional: false, nullable: false },
		country: { type: 'string', optional: false, nullable: true },
		verifiedAgeGroup: { type: 'string', enum: nookAgeGroups, optional: false, nullable: true },
		policyId: { type: 'string', optional: false, nullable: true },
	},
} as const;
