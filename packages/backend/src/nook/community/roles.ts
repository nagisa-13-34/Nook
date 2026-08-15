/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { DataSource } from 'typeorm';
import type { IdService } from '@/core/IdService.js';
import { isNookCommunityPermission } from './permissions.js';
import type { NookCommunityPermission } from './types.js';

export class NookCommunityRoleError extends Error {
	constructor(public readonly code: 'INVALID_PERMISSIONS' | 'NO_SUCH_ROLE' | 'ROLE_IN_USE') {
		super(code);
	}
}

export interface NookCommunityRoleRecord {
	id: string;
	communityId: string;
	name: string;
	color: string | null;
	position: number;
	permissions: NookCommunityPermission[];
}

function normalizePermissions(values: readonly string[]): NookCommunityPermission[] {
	if (!values.every(isNookCommunityPermission)) throw new NookCommunityRoleError('INVALID_PERMISSIONS');
	return [...new Set(values)] as NookCommunityPermission[];
}

export async function listNookCommunityRoles(db: DataSource, communityId: string): Promise<NookCommunityRoleRecord[]> {
	return await db.query(
		`SELECT "id", "communityId", "name", "color", "position", "permissions"
		 FROM "nook_community_role" WHERE "communityId" = $1 ORDER BY "position" DESC, "createdAt" ASC`,
		[communityId],
	);
}

export async function createNookCommunityRole(db: DataSource, idService: IdService, input: { communityId: string; name: string; color: string | null; position: number; permissions: readonly string[] }): Promise<NookCommunityRoleRecord> {
	const id = idService.gen();
	const permissions = normalizePermissions(input.permissions);
	const rows = await db.query<NookCommunityRoleRecord[]>(
		`INSERT INTO "nook_community_role" ("id", "communityId", "name", "color", "position", "permissions")
		 VALUES ($1, $2, $3, $4, $5, $6::jsonb)
		 RETURNING "id", "communityId", "name", "color", "position", "permissions"`,
		[id, input.communityId, input.name, input.color, input.position, JSON.stringify(permissions)],
	);
	return rows[0];
}

export async function updateNookCommunityRole(db: DataSource, input: { communityId: string; roleId: string; name?: string; color?: string | null; position?: number; permissions?: readonly string[] }): Promise<NookCommunityRoleRecord> {
	const permissions = input.permissions == null ? null : normalizePermissions(input.permissions);
	const rows = await db.query<NookCommunityRoleRecord[]>(
		`UPDATE "nook_community_role" SET
		 "name" = COALESCE($3, "name"),
		 "color" = CASE WHEN $4::boolean THEN $5 ELSE "color" END,
		 "position" = COALESCE($6, "position"),
		 "permissions" = COALESCE($7::jsonb, "permissions"),
		 "updatedAt" = now()
		 WHERE "communityId" = $1 AND "id" = $2
		 RETURNING "id", "communityId", "name", "color", "position", "permissions"`,
		[input.communityId, input.roleId, input.name ?? null, Object.prototype.hasOwnProperty.call(input, 'color'), input.color ?? null, input.position ?? null, permissions == null ? null : JSON.stringify(permissions)],
	);
	if (rows[0] == null) throw new NookCommunityRoleError('NO_SUCH_ROLE');
	return rows[0];
}

export async function deleteNookCommunityRole(db: DataSource, communityId: string, roleId: string): Promise<void> {
	await db.transaction(async manager => {
		const roleRows = await manager.query<Array<{ id: string }>>(
			'SELECT "id" FROM "nook_community_role" WHERE "communityId" = $1 AND "id" = $2 FOR UPDATE',
			[communityId, roleId],
		);
		if (roleRows[0] == null) throw new NookCommunityRoleError('NO_SUCH_ROLE');

		const channelRows = await manager.query<Array<{ id: string }>>(
			`SELECT "id" FROM "nook_community_channel"
			 WHERE "communityId" = $1
			 AND COALESCE("allowedRoleIds", '[]'::jsonb) ? $2
			 LIMIT 1`,
			[communityId, roleId],
		);
		if (channelRows[0] != null) throw new NookCommunityRoleError('ROLE_IN_USE');

		await manager.query(
			'DELETE FROM "nook_community_role" WHERE "communityId" = $1 AND "id" = $2',
			[communityId, roleId],
		);
	});
}

export async function assignNookCommunityRole(db: DataSource, communityId: string, userId: string, roleId: string): Promise<void> {
	const roles = await db.query<Array<{ id: string }>>('SELECT "id" FROM "nook_community_role" WHERE "communityId" = $1 AND "id" = $2 LIMIT 1', [communityId, roleId]);
	if (roles[0] == null) throw new NookCommunityRoleError('NO_SUCH_ROLE');
	await db.query(
		`INSERT INTO "nook_community_member_role" ("communityId", "userId", "roleId") VALUES ($1, $2, $3)
		 ON CONFLICT ("communityId", "userId", "roleId") DO NOTHING`,
		[communityId, userId, roleId],
	);
}

export async function unassignNookCommunityRole(db: DataSource, communityId: string, userId: string, roleId: string): Promise<void> {
	await db.query('DELETE FROM "nook_community_member_role" WHERE "communityId" = $1 AND "userId" = $2 AND "roleId" = $3', [communityId, userId, roleId]);
}
