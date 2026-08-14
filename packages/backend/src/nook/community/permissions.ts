/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { NookCommunityBaseRole, NookCommunityPermission } from './types.js';

export const nookCommunityPermissions = [
	'community.manage',
	'members.manage',
	'members.invite',
	'roles.manage',
	'rules.manage',
	'channels.manage',
	'announcements.manage',
	'pins.manage',
	'events.manage',
	'bots.manage',
	'voice.manage',
	'translation.manage',
	'messages.post',
	'voice.join',
	'voice.speak',
] as const satisfies readonly NookCommunityPermission[];

const memberPermissions: readonly NookCommunityPermission[] = [
	'messages.post',
	'voice.join',
	'voice.speak',
];

const moderatorPermissions: readonly NookCommunityPermission[] = [
	...memberPermissions,
	'members.manage',
	'announcements.manage',
	'pins.manage',
	'events.manage',
];

const adminPermissions: readonly NookCommunityPermission[] = [
	...moderatorPermissions,
	'community.manage',
	'members.invite',
	'roles.manage',
	'rules.manage',
	'channels.manage',
	'bots.manage',
	'voice.manage',
	'translation.manage',
];

export function baseRolePermissions(role: NookCommunityBaseRole): Set<NookCommunityPermission | '*'> {
	if (role === 'owner') return new Set(['*']);
	if (role === 'admin') return new Set(adminPermissions);
	if (role === 'moderator') return new Set(moderatorPermissions);
	return new Set(memberPermissions);
}

export function isNookCommunityPermission(value: unknown): value is NookCommunityPermission {
	return typeof value === 'string' && (nookCommunityPermissions as readonly string[]).includes(value);
}
