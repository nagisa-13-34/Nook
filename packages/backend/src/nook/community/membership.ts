/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createHash, randomBytes } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type { IdService } from '@/core/IdService.js';
import { ensureNookCommunity, getNookCommunityMembership } from './access.js';
import type { NookCommunityBaseRole } from './types.js';

export type NookCommunityJoinResult = 'joined' | 'pending';

export class NookCommunityMembershipError extends Error {
	constructor(public readonly code: 'ALREADY_MEMBER' | 'BANNED' | 'INVITE_REQUIRED' | 'OWNER_CANNOT_LEAVE' | 'NO_SUCH_REQUEST' | 'NO_SUCH_INVITE' | 'INVITE_EXPIRED' | 'INVITE_EXHAUSTED') {
		super(code);
	}
}

export function hashNookCommunityInviteToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export function generateNookCommunityInviteToken(): string {
	return randomBytes(24).toString('base64url');
}

export async function addNookCommunityMember(db: DataSource, communityId: string, userId: string, baseRole: NookCommunityBaseRole = 'member'): Promise<void> {
	await ensureNookCommunity(db, communityId);
	const rows = await db.query<Array<{ userId: string }>>(
		`INSERT INTO "nook_community_member" ("communityId", "userId", "baseRole", "state")
		 VALUES ($1, $2, $3, 'active')
		 ON CONFLICT ("communityId", "userId") DO UPDATE
		 SET "baseRole" = CASE WHEN "nook_community_member"."baseRole" = 'owner' THEN 'owner' ELSE EXCLUDED."baseRole" END,
		     "state" = 'active'
		 WHERE "nook_community_member"."state" <> 'banned'
		 RETURNING "userId"`,
		[communityId, userId, baseRole],
	);
	if (rows[0] == null) throw new NookCommunityMembershipError('BANNED');
	await db.query(
		`UPDATE "nook_community_join_request"
		 SET "status" = 'approved', "respondedAt" = COALESCE("respondedAt", now())
		 WHERE "communityId" = $1 AND "userId" = $2 AND "status" = 'pending'`,
		[communityId, userId],
	);
}

export async function requestNookCommunityJoin(db: DataSource, idService: IdService, communityId: string, userId: string, message: string | null): Promise<NookCommunityJoinResult> {
	const context = await ensureNookCommunity(db, communityId);
	const current = await getNookCommunityMembership(db, communityId, userId);
	if (current?.state === 'active') throw new NookCommunityMembershipError('ALREADY_MEMBER');
	if (current?.state === 'banned') throw new NookCommunityMembershipError('BANNED');

	if (context.joinMode === 'open') {
		await addNookCommunityMember(db, communityId, userId);
		return 'joined';
	}
	if (context.joinMode === 'invite' || context.joinMode === 'private') {
		throw new NookCommunityMembershipError('INVITE_REQUIRED');
	}

	await db.query(
		`INSERT INTO "nook_community_join_request" ("id", "communityId", "userId", "message")
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT ("communityId", "userId") WHERE "status" = 'pending'
		 DO UPDATE SET "message" = EXCLUDED."message", "createdAt" = now()`,
		[idService.gen(), communityId, userId, message],
	);
	return 'pending';
}

export async function leaveNookCommunity(db: DataSource, communityId: string, userId: string): Promise<void> {
	const context = await ensureNookCommunity(db, communityId);
	if (context.ownerId === userId) throw new NookCommunityMembershipError('OWNER_CANNOT_LEAVE');
	await db.query('DELETE FROM "nook_community_member" WHERE "communityId" = $1 AND "userId" = $2', [communityId, userId]);
	await db.query('DELETE FROM "nook_community_join_request" WHERE "communityId" = $1 AND "userId" = $2 AND "status" = \'pending\'', [communityId, userId]);
}

export async function respondNookCommunityJoinRequest(db: DataSource, communityId: string, requestId: string, responderId: string, approve: boolean): Promise<{ communityId: string; userId: string }> {
	return await db.transaction(async manager => {
		const rows = await manager.query<Array<{ communityId: string; userId: string; status: string }>>(
			'SELECT "communityId", "userId", "status" FROM "nook_community_join_request" WHERE "id" = $1 AND "communityId" = $2 FOR UPDATE',
			[requestId, communityId],
		);
		const request = rows[0];
		if (request == null || request.status !== 'pending') throw new NookCommunityMembershipError('NO_SUCH_REQUEST');

		if (approve) {
			const memberRows = await manager.query<Array<{ userId: string }>>(
				`INSERT INTO "nook_community_member" ("communityId", "userId", "baseRole", "state")
				 VALUES ($1, $2, 'member', 'active')
				 ON CONFLICT ("communityId", "userId") DO UPDATE SET "state" = 'active'
				 WHERE "nook_community_member"."state" <> 'banned'
				 RETURNING "userId"`,
				[request.communityId, request.userId],
			);
			if (memberRows[0] == null) throw new NookCommunityMembershipError('BANNED');
		}

		await manager.query(
			`UPDATE "nook_community_join_request" SET "status" = $2, "respondedAt" = now(), "respondedBy" = $3 WHERE "id" = $1 AND "communityId" = $4`,
			[requestId, approve ? 'approved' : 'rejected', responderId, communityId],
		);
		return { communityId: request.communityId, userId: request.userId };
	});
}

export async function createNookCommunityInvite(db: DataSource, idService: IdService, communityId: string, creatorId: string, options: { maxUses: number | null; expiresAt: Date | null }): Promise<{ id: string; token: string }> {
	const id = idService.gen();
	const token = generateNookCommunityInviteToken();
	await db.query(
		`INSERT INTO "nook_community_invite" ("id", "communityId", "creatorId", "tokenHash", "maxUses", "expiresAt")
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		[id, communityId, creatorId, hashNookCommunityInviteToken(token), options.maxUses, options.expiresAt],
	);
	return { id, token };
}

export async function useNookCommunityInvite(db: DataSource, token: string, userId: string): Promise<string> {
	return await db.transaction(async manager => {
		const rows = await manager.query<Array<{ id: string; communityId: string; defaultBaseRole: NookCommunityBaseRole; maxUses: number | null; useCount: number; expiresAt: Date | null; revokedAt: Date | null }>>(
			`SELECT "id", "communityId", "defaultBaseRole", "maxUses", "useCount", "expiresAt", "revokedAt"
			 FROM "nook_community_invite" WHERE "tokenHash" = $1 FOR UPDATE`,
			[hashNookCommunityInviteToken(token)],
		);
		const invite = rows[0];
		if (invite == null || invite.revokedAt != null) throw new NookCommunityMembershipError('NO_SUCH_INVITE');
		if (invite.expiresAt != null && new Date(invite.expiresAt).getTime() <= Date.now()) throw new NookCommunityMembershipError('INVITE_EXPIRED');
		if (invite.maxUses != null && invite.useCount >= invite.maxUses) throw new NookCommunityMembershipError('INVITE_EXHAUSTED');

		const existingRows = await manager.query<Array<{ state: 'active' | 'banned' }>>(
			'SELECT "state" FROM "nook_community_member" WHERE "communityId"=$1 AND "userId"=$2 FOR UPDATE',
			[invite.communityId, userId],
		);
		const existing = existingRows[0];
		if (existing?.state === 'banned') throw new NookCommunityMembershipError('BANNED');
		if (existing?.state === 'active') throw new NookCommunityMembershipError('ALREADY_MEMBER');

		const memberRows = await manager.query<Array<{ userId: string }>>(
			`INSERT INTO "nook_community_member" ("communityId", "userId", "baseRole", "state")
			 VALUES ($1, $2, $3, 'active')
			 ON CONFLICT ("communityId", "userId") DO NOTHING
			 RETURNING "userId"`,
			[invite.communityId, userId, invite.defaultBaseRole],
		);
		if (memberRows[0] == null) throw new NookCommunityMembershipError('ALREADY_MEMBER');

		await manager.query('UPDATE "nook_community_invite" SET "useCount" = "useCount" + 1 WHERE "id" = $1', [invite.id]);
		await manager.query(
			`UPDATE "nook_community_join_request" SET "status" = 'approved', "respondedAt" = now()
			 WHERE "communityId" = $1 AND "userId" = $2 AND "status" = 'pending'`,
			[invite.communityId, userId],
		);
		return invite.communityId;
	});
}
