/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { DataSource } from 'typeorm';
import { baseRolePermissions, isNookCommunityPermission } from './permissions.js';
import type { NookCommunityBaseRole, NookCommunityContext, NookCommunityMembership, NookCommunityPermission } from './types.js';

export class NookCommunityAccessError extends Error {
	constructor(public readonly code: 'NO_SUCH_COMMUNITY' | 'NOT_MEMBER' | 'FORBIDDEN') {
		super(code);
	}
}

export async function ensureNookCommunity(db: DataSource, communityId: string): Promise<NookCommunityContext> {
	const channels = await db.query<Array<{ id: string; userId: string | null }>>(
		'SELECT "id", "userId" FROM "channel" WHERE "id" = $1 LIMIT 1',
		[communityId],
	);
	const channel = channels[0];
	if (channel == null) throw new NookCommunityAccessError('NO_SUCH_COMMUNITY');

	await db.query(
		`INSERT INTO "nook_community" ("channelId") VALUES ($1) ON CONFLICT ("channelId") DO NOTHING`,
		[communityId],
	);
	if (channel.userId != null) {
		await db.query(
			`INSERT INTO "nook_community_member" ("communityId", "userId", "baseRole", "state")
			 VALUES ($1, $2, 'owner', 'active')
			 ON CONFLICT ("communityId", "userId") DO UPDATE SET "baseRole" = 'owner', "state" = 'active'`,
			[communityId, channel.userId],
		);
	}

	const rows = await db.query<Array<{ joinMode: NookCommunityContext['joinMode']; discoverable: boolean }>>(
		'SELECT "joinMode", "discoverable" FROM "nook_community" WHERE "channelId" = $1 LIMIT 1',
		[communityId],
	);

	return {
		communityId,
		ownerId: channel.userId,
		joinMode: rows[0]?.joinMode ?? 'open',
		discoverable: rows[0]?.discoverable ?? true,
	};
}

export async function getNookCommunityMembership(db: DataSource, communityId: string, userId: string): Promise<NookCommunityMembership | null> {
	const context = await ensureNookCommunity(db, communityId);
	const members = await db.query<Array<{ baseRole: NookCommunityBaseRole; state: 'active' | 'banned' }>>(
		'SELECT "baseRole", "state" FROM "nook_community_member" WHERE "communityId" = $1 AND "userId" = $2 LIMIT 1',
		[communityId, userId],
	);
	const member = members[0];
	if (member == null) return null;

	const baseRole: NookCommunityBaseRole = context.ownerId === userId ? 'owner' : member.baseRole;
	const permissions = baseRolePermissions(baseRole);
	if (!permissions.has('*')) {
		const roles = await db.query<Array<{ permissions: unknown }>>(
			`SELECT r."permissions"
			 FROM "nook_community_member_role" mr
			 INNER JOIN "nook_community_role" r ON r."id" = mr."roleId"
			 WHERE mr."communityId" = $1 AND mr."userId" = $2`,
			[communityId, userId],
		);
		for (const role of roles) {
			if (!Array.isArray(role.permissions)) continue;
			for (const permission of role.permissions) {
				if (isNookCommunityPermission(permission)) permissions.add(permission);
			}
		}
	}

	return {
		communityId,
		userId,
		baseRole,
		state: member.state,
		permissions,
	};
}

export async function requireNookCommunityMember(db: DataSource, communityId: string, userId: string): Promise<NookCommunityMembership> {
	const membership = await getNookCommunityMembership(db, communityId, userId);
	if (membership == null || membership.state !== 'active') throw new NookCommunityAccessError('NOT_MEMBER');
	return membership;
}

export async function requireNookCommunityPermission(db: DataSource, communityId: string, userId: string, permission: NookCommunityPermission): Promise<NookCommunityMembership> {
	const membership = await requireNookCommunityMember(db, communityId, userId);
	if (!membership.permissions.has('*') && !membership.permissions.has(permission)) throw new NookCommunityAccessError('FORBIDDEN');
	return membership;
}
