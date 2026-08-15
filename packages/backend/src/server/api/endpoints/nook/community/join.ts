/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ChannelsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';
import { ChannelFollowingService } from '@/core/ChannelFollowingService.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { requestNookCommunityJoin, NookCommunityMembershipError } from '@/nook/community/membership.js';
import { NookCommunityAccessError } from '@/nook/community/access.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['channels'], requireCredential: true, kind: 'write:channels', prohibitMoved: true,
	res: { type: 'object', optional: false, nullable: false, properties: { status: { type: 'string', enum: ['joined', 'pending'] } }, required: ['status'] },
	errors: {
		noSuchCommunity: { message: 'No such community.', code: 'NO_SUCH_COMMUNITY', id: '97838bf0-b3e6-4589-b650-c9a29872e019' },
		alreadyMember: { message: 'You are already a member.', code: 'ALREADY_MEMBER', id: '069192cf-411b-4c2e-992c-216c633283ba' },
		banned: { message: 'You are banned from this community.', code: 'BANNED', id: '9a32b1d7-1f9a-46e8-ba22-4b64946631e0' },
		inviteRequired: { message: 'An invite is required.', code: 'INVITE_REQUIRED', id: '78f9b12b-744b-490c-91c0-cbdae467d323' },
	},
} as const;
export const paramDef = {
	type: 'object', properties: {
		communityId: { type: 'string', format: 'misskey:id' },
		message: { type: 'string', maxLength: 1024, nullable: true },
	}, required: ['communityId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.db) private db: DataSource,
		@Inject(DI.channelsRepository) private channelsRepository: ChannelsRepository,
		private idService: IdService,
		private channelFollowingService: ChannelFollowingService,
	) {
		super(meta, paramDef, async (ps, me) => {
			try {
				const status = await requestNookCommunityJoin(this.db, this.idService, ps.communityId, me.id, ps.message ?? null);
				if (status === 'joined') {
					const channel = await this.channelsRepository.findOneBy({ id: ps.communityId });
					if (channel != null) {
						// Community membership is canonical. Following the backing Misskey Channel is only a convenience,
						// so a follow-side failure must not turn an already-committed join into an API failure.
						try { await this.channelFollowingService.follow(me, channel); } catch {}
					}
				}
				return { status };
			} catch (error) {
				if (error instanceof NookCommunityAccessError && error.code === 'NO_SUCH_COMMUNITY') throw new ApiError(meta.errors.noSuchCommunity);
				if (error instanceof NookCommunityMembershipError) {
					if (error.code === 'ALREADY_MEMBER') throw new ApiError(meta.errors.alreadyMember);
					if (error.code === 'BANNED') throw new ApiError(meta.errors.banned);
					if (error.code === 'INVITE_REQUIRED') throw new ApiError(meta.errors.inviteRequired);
				}
				throw error;
			}
		});
	}
}
