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
		id: { type: 'string' }, userId: { type: 'string' }, message: { type: 'string', nullable: true }, createdAt: { type: 'string', format: 'date-time' },
	}, required: ['id', 'userId', 'message', 'createdAt'] } },
	errors: { forbidden: { message: 'You cannot manage members.', code: 'FORBIDDEN', id: 'e045945d-3975-4ff3-95e2-e935630ea8e2' } },
} as const;
export const paramDef = { type: 'object', properties: { communityId: { type: 'string', format: 'misskey:id' } }, required: ['communityId'] } as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(@Inject(DI.db) private db: DataSource) {
		super(meta, paramDef, async (ps, me) => {
			try { await requireNookCommunityPermission(this.db, ps.communityId, me.id, 'members.manage'); } catch (error) {
				if (error instanceof NookCommunityAccessError) throw new ApiError(meta.errors.forbidden);
				throw error;
			}
			return await this.db.query(`SELECT "id", "userId", "message", "createdAt" FROM "nook_community_join_request" WHERE "communityId" = $1 AND "status" = 'pending' ORDER BY "createdAt" ASC LIMIT 200`, [ps.communityId]);
		});
	}
}
