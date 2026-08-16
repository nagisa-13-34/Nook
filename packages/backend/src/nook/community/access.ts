/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { baseRolePermissions, isNookCommunityPermission } from './permissions.js';
import type { DataSource } from 'typeorm';
import type { NookCommunityBaseRole, NookCommunityContext, NookCommunityMembership, NookCommunityPermission } from './types.js';

export class NookCommunityAccessError extends Error {
	constructor(public readonly code: 'NO_SUCH_COMMUNITY' | 'NOT_MEMBER' | 'FORBIDDEN') {
		super(code);
	}
}

interface NookCommunityContextRow {
	userId: string | null;
	joinMode: NookCommunityContext['joinMode'] | null;
	ageMode: NookCommunityContext['ageMode'] | null;
	discoverable: boolean | null;
	initialized: boolean;
}

async function readNookCommunityContextRow(db: DataSource, communityId: string): Promise<NookCommunityContextRow> {
	const rows = await db.query<NookCommunityContextRow[]>(
		`SELECT c."userId",
		 nc."joinMode",
		 nc."ageMode",
		 nc."discoverable",
		 (nc."channelId" IS NOT NULL) AS "initialized"
		 FROM "channel" c
		 LEFT JOIN "nook_community" nc ON nc."channelId" = c."id"
		 WHERE c."id" = $1
		 LIMIT 1`,
		[communityId],
	);
	const row = rows[0];
	if (row == null) throw new NookCommunityAccessError('NO_SUCH_COMMUNITY');
	return row;
}

function contextFromRow(communityId: string, row: NookCommunityContextRow): NookCommunityContext {
	return {
		communityId,
		ownerId: row.userId,
		joinMode: row.joinMode ?? 'open',
		ageMode: row.ageMode ?? 'mixed',
		discoverable: row.discoverable ?? true,
	};
}

/** Read Community metadata without creating or updating companion rows. */
export async function getNookCommunityContext(db: DataSource, communityId: string): Promise<NookCommunityContext> {
	return contextFromRow(communityId, await readNookCommunityContextRow(db, communityId));
}

/**
 * Materialize the Nook companion row for a Misskey Channel after the caller has
 * already passed the global create_community policy boundary.
 * Existing Communities are SELECT-only; writes happen only when the companion row is absent.
 */
export async function ensureNookCommunity(db: DataSource, communityId: string): Promise<NookCommunityContext> {
	const row = await readNookCommunityContextRow(db, communityId);
	if (row.initialized) return contextFromRow(communityId, row);

	await db.query(
		'INSERT INTO "nook_community" ("channelId") VALUES ($1) ON CONFLICT ("channelId") DO NOTHING',
		[communityId],
	);
	if (row.userId != null) {
		await db.query(
			`INSERT INTO "nook_community_member" ("communityId", "userId", "baseRole", "state")
			 VALUES ($1, $2, 'owner', 'active')
			 ON CONFLICT ("communityId", "userId") DO NOTHING`,
			[communityId, row.userId],
		);
	}

	return contextFromRow(communityId, row);
}

export async function getNookCommunityMembership(db: DataSource, communityId: string, userId: string): Promise<NookCommunityMembership | null> {
	const context = await getNookCommunityContext(db, communityId);
	const members = await db.query<Array<{ baseRole: NookCommunityBaseRole; state: 'active' | 'banned' }>>(
		'SELECT "baseRole", "state" FROM "nook_community_member" WHERE "communityId" = $1 AND "userId" = $2 LIMIT 1',
		[communityId, userId],
	);
	const member = members[0];
	if (member == null) {
		if (context.ownerId !== userId) return null;
		return {
			communityId,
			userId,
			baseRole: 'owner',
			state: 'active',
			ageMode: context.ageMode,
			permissions: baseRolePermissions('owner'),
		};
	}

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
		ageMode: context.ageMode,
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
