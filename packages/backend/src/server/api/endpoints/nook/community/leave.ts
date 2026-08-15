/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { leaveNookCommunity, NookCommunityMembershipError } from '@/nook/community/membership.js';
import { NookCommunityAccessError } from '@/nook/community/access.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['channels'], requireCredential: true, kind: 'write:channels', prohibitMoved: true,
	errors: {
		noSuchCommunity: { message: 'No such community.', code: 'NO_SUCH_COMMUNITY', id: '159d8fac-38e3-4b2f-8dc3-04eeafd7a95a' },
		ownerCannotLeave: { message: 'The owner cannot leave the community.', code: 'OWNER_CANNOT_LEAVE', id: 'fcbfb97e-7cd5-46e2-b6b2-1eebf0a6003a' },
		notActiveMember: { message: 'Only an active community member can leave.', code: 'NOT_ACTIVE_MEMBER', id: 'aad0c40d-d762-4dfa-bd09-7a96047130fc', kind: 'permission', httpStatusCode: 403 },
	},
} as const;
export const paramDef = { type: 'object', properties: { communityId: { type: 'string', format: 'misskey:id' } }, required: ['communityId'] } as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(@Inject(DI.db) private db: DataSource) {
		super(meta, paramDef, async (ps, me) => {
			try {
				await leaveNookCommunity(this.db, ps.communityId, me.id);
			} catch (error) {
				if (error instanceof NookCommunityAccessError && error.code === 'NO_SUCH_COMMUNITY') throw new ApiError(meta.errors.noSuchCommunity);
				if (error instanceof NookCommunityMembershipError && error.code === 'OWNER_CANNOT_LEAVE') throw new ApiError(meta.errors.ownerCannotLeave);
				if (error instanceof NookCommunityMembershipError && (error.code === 'BANNED' || error.code === 'NOT_MEMBER')) throw new ApiError(meta.errors.notActiveMember);
				throw error;
			}
		});
	}
}
