/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { requireNookCommunityPermission, NookCommunityAccessError } from '@/nook/community/access.js';
import { ApiError } from '../../../../error.js';

export const meta = { tags: ['channels'], requireCredential: true, kind: 'write:channels', errors: {
	forbidden: { message: 'You cannot revoke invites.', code: 'FORBIDDEN', id: '1afec11c-eacb-4783-8eb4-9170cc186b73' },
	noSuchInvite: { message: 'No such invite.', code: 'NO_SUCH_INVITE', id: '084c510a-6bb2-4554-8efe-f2d5fc1c3e20' },
} } as const;
export const paramDef = { type: 'object', properties: { communityId: { type: 'string', format: 'misskey:id' }, inviteId: { type: 'string', format: 'misskey:id' } }, required: ['communityId', 'inviteId'] } as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(@Inject(DI.db) private db: DataSource) { super(meta, paramDef, async (ps, me) => {
		try { await requireNookCommunityPermission(this.db, ps.communityId, me.id, 'members.invite'); } catch (error) { if (error instanceof NookCommunityAccessError) throw new ApiError(meta.errors.forbidden); throw error; }
		const rows = await this.db.query<Array<{ id: string }>>('UPDATE "nook_community_invite" SET "revokedAt" = now() WHERE "id" = $1 AND "communityId" = $2 AND "revokedAt" IS NULL RETURNING "id"', [ps.inviteId, ps.communityId]);
		if (rows[0] == null) throw new ApiError(meta.errors.noSuchInvite);
	}); }
}
