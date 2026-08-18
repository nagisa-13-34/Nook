/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['channels'],
	requireCredential: true,
	kind: 'write:channels',
	res: { type: 'object', optional: false, nullable: false, properties: { ownerId: { type: 'string' } }, required: ['ownerId'] },
	errors: {
		forbidden: { message: 'Only the community owner can transfer ownership.', code: 'FORBIDDEN', id: '457fbc52-ea68-4b1e-9b8c-98aa5efe2854' },
		noSuchMember: { message: 'The new owner must be an active community member.', code: 'NO_SUCH_MEMBER', id: '8e7f5c53-09c4-4cca-8753-d27b44e6d948' },
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		communityId: { type: 'string', format: 'misskey:id' },
		targetUserId: { type: 'string', format: 'misskey:id' },
	},
	required: ['communityId', 'targetUserId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(@Inject(DI.db) private db: DataSource) {
		super(meta, paramDef, async (ps, me) => {
			return await this.db.transaction(async manager => {
				const roots = await manager.query<Array<{ userId: string | null }>>('SELECT "userId" FROM "channel" WHERE "id" = $1 FOR UPDATE', [ps.communityId]);
				if (roots[0]?.userId !== me.id) throw new ApiError(meta.errors.forbidden);
				if (ps.targetUserId === me.id) return { ownerId: me.id };

				const targets = await manager.query<Array<{ state: 'active' | 'banned' }>>(
					'SELECT "state" FROM "nook_community_member" WHERE "communityId" = $1 AND "userId" = $2 LIMIT 1 FOR UPDATE',
					[ps.communityId, ps.targetUserId],
				);
				if (targets[0]?.state !== 'active') throw new ApiError(meta.errors.noSuchMember);

				await manager.query(
					`INSERT INTO "nook_community_member" ("communityId", "userId", "baseRole", "state") VALUES ($1, $2, 'admin', 'active')
					 ON CONFLICT ("communityId", "userId") DO UPDATE SET "baseRole" = 'admin', "state" = 'active'`,
					[ps.communityId, me.id],
				);
				await manager.query(
					`UPDATE "nook_community_member" SET "baseRole" = 'member' WHERE "communityId" = $1 AND "baseRole" = 'owner' AND "userId" <> $2`,
					[ps.communityId, ps.targetUserId],
				);
				await manager.query(
					`UPDATE "nook_community_member" SET "baseRole" = 'owner', "state" = 'active' WHERE "communityId" = $1 AND "userId" = $2`,
					[ps.communityId, ps.targetUserId],
				);
				await manager.query('UPDATE "channel" SET "userId" = $2 WHERE "id" = $1', [ps.communityId, ps.targetUserId]);
				return { ownerId: ps.targetUserId };
			});
		});
	}
}
