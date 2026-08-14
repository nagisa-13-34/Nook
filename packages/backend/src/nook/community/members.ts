/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { DataSource } from 'typeorm';
import { ensureNookCommunity } from './access.js';
import type { NookCommunityBaseRole } from './types.js';

export class NookCommunityMemberError extends Error {
	constructor(public readonly code: 'OWNER_IMMUTABLE' | 'NO_SUCH_MEMBER') { super(code); }
}

export async function listNookCommunityMembers(db: DataSource, communityId: string) {
	return await db.query(
		`SELECT m."userId", m."baseRole", m."state", m."nickname", m."joinedAt",
		 COALESCE(array_agg(mr."roleId") FILTER (WHERE mr."roleId" IS NOT NULL), '{}') AS "roleIds"
		 FROM "nook_community_member" m
		 LEFT JOIN "nook_community_member_role" mr ON mr."communityId" = m."communityId" AND mr."userId" = m."userId"
		 WHERE m."communityId" = $1
		 GROUP BY m."communityId", m."userId", m."baseRole", m."state", m."nickname", m."joinedAt"
		 ORDER BY m."joinedAt" ASC LIMIT 1000`,
		[communityId],
	);
}

export async function updateNookCommunityMember(db: DataSource, communityId: string, userId: string, input: { baseRole?: Exclude<NookCommunityBaseRole, 'owner'>; state?: 'active' | 'banned'; nickname?: string | null }): Promise<void> {
	const context = await ensureNookCommunity(db, communityId);
	if (context.ownerId === userId) throw new NookCommunityMemberError('OWNER_IMMUTABLE');
	const rows = await db.query<Array<{ userId: string }>>(
		`UPDATE "nook_community_member" SET
		 "baseRole" = COALESCE($3, "baseRole"),
		 "state" = COALESCE($4, "state"),
		 "nickname" = CASE WHEN $5::boolean THEN $6 ELSE "nickname" END
		 WHERE "communityId" = $1 AND "userId" = $2 RETURNING "userId"`,
		[communityId, userId, input.baseRole ?? null, input.state ?? null, Object.prototype.hasOwnProperty.call(input, 'nickname'), input.nickname ?? null],
	);
	if (rows[0] == null) throw new NookCommunityMemberError('NO_SUCH_MEMBER');
}
