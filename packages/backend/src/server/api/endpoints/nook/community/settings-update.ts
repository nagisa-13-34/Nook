/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { requireNookCommunityPermission, NookCommunityAccessError } from '@/nook/community/access.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['channels'], requireCredential: true, kind: 'write:channels',
	errors: {
		noSuchCommunity: { message: 'No such community.', code: 'NO_SUCH_COMMUNITY', id: 'cb7cfea6-e4f8-4d5d-b0b2-708736f1e1a7' },
		forbidden: { message: 'You cannot manage this community.', code: 'FORBIDDEN', id: 'ce7e2a3e-b5c3-4f9e-9745-7d9d3946adc0' },
	},
} as const;
export const paramDef = {
	type: 'object', properties: {
		communityId: { type: 'string', format: 'misskey:id' },
		joinMode: { type: 'string', enum: ['open', 'approval', 'invite', 'private'], nullable: true },
		discoverable: { type: 'boolean', nullable: true },
	}, required: ['communityId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(@Inject(DI.db) private db: DataSource) {
		super(meta, paramDef, async (ps, me) => {
			try {
				await requireNookCommunityPermission(this.db, ps.communityId, me.id, 'community.manage');
			} catch (error) {
				if (error instanceof NookCommunityAccessError) {
					if (error.code === 'NO_SUCH_COMMUNITY') throw new ApiError(meta.errors.noSuchCommunity);
					throw new ApiError(meta.errors.forbidden);
				}
				throw error;
			}
			await this.db.query(
				`UPDATE "nook_community" SET
				 "joinMode" = COALESCE($2, "joinMode"),
				 "discoverable" = COALESCE($3, "discoverable"),
				 "updatedAt" = now()
				 WHERE "channelId" = $1`,
				[ps.communityId, ps.joinMode ?? null, ps.discoverable ?? null],
			);
		});
	}
}
