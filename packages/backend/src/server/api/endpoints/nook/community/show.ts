/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import { ensureNookCommunity, getNookCommunityMembership, NookCommunityAccessError } from '@/nook/community/access.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['channels'],
	requireCredential: false,
	res: {
		type: 'object', optional: false, nullable: false,
		properties: {
			communityId: { type: 'string' },
			joinMode: { type: 'string', enum: ['open', 'approval', 'invite', 'private'] },
			discoverable: { type: 'boolean' },
			memberCount: { type: 'number' },
			membership: {
				type: 'object', optional: true, nullable: true,
				properties: {
					baseRole: { type: 'string', enum: ['owner', 'admin', 'moderator', 'member'] },
					state: { type: 'string', enum: ['active', 'banned'] },
					permissions: { type: 'array', items: { type: 'string' } },
				},
				required: ['baseRole', 'state', 'permissions'],
			},
		},
		required: ['communityId', 'joinMode', 'discoverable', 'memberCount', 'membership'],
	},
	errors: {
		noSuchCommunity: { message: 'No such community.', code: 'NO_SUCH_COMMUNITY', id: 'c80f450a-e1ae-4813-862a-c6019e0f051f' },
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: { communityId: { type: 'string', format: 'misskey:id' } },
	required: ['communityId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(@Inject(DI.db) private db: DataSource) {
		super(meta, paramDef, async (ps, me) => {
			try {
				const context = await ensureNookCommunity(this.db, ps.communityId);
				const membership = me == null ? null : await getNookCommunityMembership(this.db, ps.communityId, me.id);
				const countRows = await this.db.query<Array<{ count: string }>>('SELECT count(*)::text AS count FROM "nook_community_member" WHERE "communityId" = $1 AND "state" = \'active\'', [ps.communityId]);
				return {
					communityId: ps.communityId,
					joinMode: context.joinMode,
					discoverable: context.discoverable,
					memberCount: Number(countRows[0]?.count ?? 0),
					membership: membership == null ? null : {
						baseRole: membership.baseRole,
						state: membership.state,
						permissions: [...membership.permissions],
					},
				};
			} catch (error) {
				if (error instanceof NookCommunityAccessError && error.code === 'NO_SUCH_COMMUNITY') throw new ApiError(meta.errors.noSuchCommunity);
				throw error;
			}
		});
	}
}
