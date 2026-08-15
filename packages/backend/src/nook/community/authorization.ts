/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { getNookCommunityMembership } from './access.js';
import { isNookCommunityPermission } from './permissions.js';
import type { DataSource } from 'typeorm';
import type { NookCommunityBaseRole, NookCommunityMembership, NookCommunityPermission } from './types.js';

export class NookCommunityAuthorizationError extends Error {
	constructor(public readonly code: 'ROLE_HIERARCHY' | 'PRIVILEGE_ESCALATION' | 'NO_SUCH_MEMBER' | 'NO_SUCH_ROLE') {
		super(code);
	}
}

const roleRanks: Record<NookCommunityBaseRole, number> = {
	member: 0,
	moderator: 1,
	admin: 2,
	owner: 3,
};

export function canGrantNookCommunityPermissions(
	actor: NookCommunityMembership,
	permissions: readonly string[],
): boolean {
	if (actor.permissions.has('*')) return permissions.every(isNookCommunityPermission);
	return permissions.every(permission => isNookCommunityPermission(permission) && actor.permissions.has(permission));
}

export function assertCanGrantNookCommunityPermissions(
	actor: NookCommunityMembership,
	permissions: readonly string[],
): void {
	if (!canGrantNookCommunityPermissions(actor, permissions)) {
		throw new NookCommunityAuthorizationError('PRIVILEGE_ESCALATION');
	}
}

export function assertCanAssignNookCommunityBaseRole(
	actor: NookCommunityMembership,
	baseRole: Exclude<NookCommunityBaseRole, 'owner'>,
): void {
	if (actor.baseRole === 'owner') return;
	if (roleRanks[actor.baseRole] <= roleRanks[baseRole]) {
		throw new NookCommunityAuthorizationError('ROLE_HIERARCHY');
	}
}

export async function requireManageableNookCommunityMember(
	db: DataSource,
	communityId: string,
	actor: NookCommunityMembership,
	targetUserId: string,
): Promise<NookCommunityMembership> {
	const target = await getNookCommunityMembership(db, communityId, targetUserId);
	if (target == null) throw new NookCommunityAuthorizationError('NO_SUCH_MEMBER');
	if (actor.userId === target.userId || roleRanks[actor.baseRole] <= roleRanks[target.baseRole]) {
		throw new NookCommunityAuthorizationError('ROLE_HIERARCHY');
	}
	return target;
}

export async function requireGrantableNookCommunityRole(
	db: DataSource,
	communityId: string,
	actor: NookCommunityMembership,
	roleId: string,
): Promise<NookCommunityPermission[]> {
	const rows = await db.query<Array<{ permissions: unknown }>>(
		'SELECT "permissions" FROM "nook_community_role" WHERE "communityId" = $1 AND "id" = $2 LIMIT 1',
		[communityId, roleId],
	);
	const role = rows[0];
	if (role == null) throw new NookCommunityAuthorizationError('NO_SUCH_ROLE');
	if (!Array.isArray(role.permissions) || !role.permissions.every(isNookCommunityPermission)) {
		throw new NookCommunityAuthorizationError('PRIVILEGE_ESCALATION');
	}
	assertCanGrantNookCommunityPermissions(actor, role.permissions);
	return role.permissions;
}
