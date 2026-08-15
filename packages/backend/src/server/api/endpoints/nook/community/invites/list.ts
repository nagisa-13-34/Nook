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

export const meta = {
	tags: ['channels'], requireCredential: true, kind: 'read:channels',
	res: { type: 'array', optional: false, nullable: false, items: { type: 'object', properties: {
		id: { type: 'string' }, creatorId: { type: 'string' }, maxUses: { type: 'number', nullable: true }, useCount: { type: 'number' }, expiresAt: { type: 'string', format: 'date-time', nullable: true }, revokedAt: { type: 'string', format: 'date-time', nullable: true }, createdAt: { type: 'string', format: 'date-time' },
	}, required: ['id', 'creatorId', 'maxUses', 'useCount', 'expiresAt', 'revokedAt', 'createdAt'] } },
	errors: { forbidden: { message: 'You cannot view invites.', code: 'FORBIDDEN', id: 'b031b715-670c-4bf2-ba0f-9c5d3b15d9f2' } },
} as const;
export const paramDef = { type: 'object', properties: { communityId: { type: 'string', format: 'misskey:id' } }, required: ['communityId'] } as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(@Inject(DI.db) private db: DataSource) {
		super(meta, paramDef, async (ps, me) => {
			try { await requireNookCommunityPermission(this.db, ps.communityId, me.id, 'members.invite'); } catch (error) { if (error instanceof NookCommunityAccessError) throw new ApiError(meta.errors.forbidden); throw error; }
			return await this.db.query('SELECT "id", "creatorId", "maxUses", "useCount", "expiresAt", "revokedAt", "createdAt" FROM "nook_community_invite" WHERE "communityId" = $1 ORDER BY "createdAt" DESC LIMIT 200', [ps.communityId]);
		});
	}
}
