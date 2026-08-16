/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ensureNookCommunity } from './access.js';
import { assertNookCommunityAgeModeForUser, lockNookCommunityAgeMode, NookCommunityAgeError } from './age.js';
import { assertNookCommunityMembershipAdultBoundary, NookCommunityCommunicationError } from './communication.js';
import type { DataSource } from 'typeorm';
import type { NookCommunityBaseRole } from './types.js';

export class NookCommunityMemberError extends Error {
	constructor(public readonly code: 'OWNER_IMMUTABLE' | 'NO_SUCH_MEMBER' | 'ACTIVATION_CHECK_REQUIRED' | 'AGE_MODE_RESTRICTED' | 'ADULT_BOUNDARY_RESTRICTED') { super(code); }
}

interface NookCommunityMemberListRecord {
	userId: string;
	baseRole: NookCommunityBaseRole;
	state: 'active' | 'banned';
	nickname: string | null;
	joinedAt: Date;
	roleIds: string[];
}

export async function listNookCommunityMembers(db: DataSource, communityId: string): Promise<NookCommunityMemberListRecord[]> {
	const members = await db.query<NookCommunityMemberListRecord[]>(
		`SELECT m."userId", m."baseRole", m."state", m."nickname", m."joinedAt",
		 COALESCE(array_agg(mr."roleId") FILTER (WHERE mr."roleId" IS NOT NULL), '{}') AS "roleIds"
		 FROM "nook_community_member" m
		 LEFT JOIN "nook_community_member_role" mr ON mr."communityId" = m."communityId" AND mr."userId" = m."userId"
		 WHERE m."communityId" = $1
		 GROUP BY m."communityId", m."userId", m."baseRole", m."state", m."nickname", m."joinedAt"
		 ORDER BY m."joinedAt" ASC LIMIT 1000`, [communityId]);
	const ownerRows = await db.query<Array<{ userId: string | null; createdAt: Date }>>('SELECT "userId", "createdAt" FROM "channel" WHERE "id"=$1 LIMIT 1', [communityId]);
	const owner = ownerRows[0];
	if (owner?.userId != null && !members.some(member => member.userId === owner.userId)) {
		members.unshift({ userId: owner.userId, baseRole: 'owner', state: 'active', nickname: null, joinedAt: owner.createdAt, roleIds: [] });
	}
	return members;
}

export async function updateNookCommunityMember(
	db: DataSource,
	communityId: string,
	userId: string,
	input: { baseRole?: Exclude<NookCommunityBaseRole, 'owner'>; state?: 'active' | 'banned'; nickname?: string | null },
	beforeActivate?: () => Promise<void>,
): Promise<void> {
	const context = await ensureNookCommunity(db, communityId);
	if (context.ownerId === userId) throw new NookCommunityMemberError('OWNER_IMMUTABLE');
	await db.transaction(async manager => {
		const ageMode = input.state === 'active' ? await lockNookCommunityAgeMode(manager, communityId) : null;
		const currentRows = await manager.query<Array<{ state: 'active' | 'banned' }>>(
			'SELECT "state" FROM "nook_community_member" WHERE "communityId" = $1 AND "userId" = $2 FOR UPDATE', [communityId, userId]);
		const current = currentRows[0];
		if (current == null) throw new NookCommunityMemberError('NO_SUCH_MEMBER');
		if (input.state === 'active' && current.state === 'banned') {
			if (beforeActivate == null) throw new NookCommunityMemberError('ACTIVATION_CHECK_REQUIRED');
			await beforeActivate();
			try {
				await assertNookCommunityAgeModeForUser(manager, ageMode ?? 'mixed', userId);
			} catch (error) {
				if (error instanceof NookCommunityAgeError && error.code === 'AGE_MODE_RESTRICTED') throw new NookCommunityMemberError('AGE_MODE_RESTRICTED');
				throw error;
			}
			try {
				await assertNookCommunityMembershipAdultBoundary(manager, communityId, userId);
			} catch (error) {
				if (error instanceof NookCommunityCommunicationError && error.code === 'ADULT_BOUNDARY') throw new NookCommunityMemberError('ADULT_BOUNDARY_RESTRICTED');
				throw error;
			}
		}
		await manager.query(
			`UPDATE "nook_community_member" SET
			 "baseRole" = COALESCE($3, "baseRole"), "state" = COALESCE($4, "state"),
			 "nickname" = CASE WHEN $5::boolean THEN $6 ELSE "nickname" END
			 WHERE "communityId" = $1 AND "userId" = $2`,
			[communityId, userId, input.baseRole ?? null, input.state ?? null, Object.prototype.hasOwnProperty.call(input, 'nickname'), input.nickname ?? null]);
		if (input.state === 'banned') {
			await manager.query(
				`DELETE FROM "nook_community_event_rsvp" r USING "nook_community_event" e
				 WHERE r."eventId"=e."id" AND e."communityId"=$1 AND r."userId"=$2`, [communityId, userId]);
		}
	});
}
