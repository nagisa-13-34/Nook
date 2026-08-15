/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ChannelsRepository, UsersRepository } from '@/models/_.js';
import type { MiLocalUser } from '@/models/User.js';
import { DI } from '@/di-symbols.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ChannelFollowingService } from '@/core/ChannelFollowingService.js';
import { NookAccessService } from '@/nook/policy/NookAccessService.js';
import { requireNookCommunityPermission, NookCommunityAccessError } from '@/nook/community/access.js';
import { respondNookCommunityJoinRequest, NookCommunityMembershipError } from '@/nook/community/membership.js';
import { ApiError } from '../../../../error.js';

export const meta = {
	tags: ['channels'], requireCredential: true, kind: 'write:channels',
	errors: {
		forbidden: { message: 'You cannot manage members.', code: 'FORBIDDEN', id: 'b694e638-afb8-4ddd-a7ec-23e0b33d542d' },
		noSuchRequest: { message: 'No such pending request.', code: 'NO_SUCH_REQUEST', id: 'e4eeab0e-d3e6-4ed8-a78a-c0a5e560ce2c' },
		banned: { message: 'The requested user is banned from this community.', code: 'BANNED', id: 'd2432c91-d535-42d9-9a38-b47e41017dd0' },
		joinRestricted: { message: 'The requested user is not currently allowed to join Communities.', code: 'RESTRICTED_BY_NOOK_POLICY', id: '755b5523-bf06-49b9-93aa-0a6bcf817af6', kind: 'permission', httpStatusCode: 403 },
	},
} as const;
export const paramDef = { type: 'object', properties: {
	communityId: { type: 'string', format: 'misskey:id' }, requestId: { type: 'string', format: 'misskey:id' }, approve: { type: 'boolean' },
}, required: ['communityId', 'requestId', 'approve'] } as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.db) private db: DataSource,
		@Inject(DI.channelsRepository) private channelsRepository: ChannelsRepository,
		@Inject(DI.usersRepository) private usersRepository: UsersRepository,
		private channelFollowingService: ChannelFollowingService,
		private nookAccessService: NookAccessService,
	) {
		super(meta, paramDef, async (ps, me) => {
			try { await requireNookCommunityPermission(this.db, ps.communityId, me.id, 'members.manage'); } catch (error) {
				if (error instanceof NookCommunityAccessError) throw new ApiError(meta.errors.forbidden);
				throw error;
			}
			let result: { communityId: string; userId: string };
			try {
				result = await respondNookCommunityJoinRequest(
					this.db,
					ps.communityId,
					ps.requestId,
					me.id,
					ps.approve,
					ps.approve ? async userId => {
						const user = await this.usersRepository.findOneBy({ id: userId, host: null });
						if (user == null || !(await this.nookAccessService.evaluate(user as MiLocalUser, 'join_community')).allowed) {
							throw new ApiError(meta.errors.joinRestricted);
						}
					} : undefined,
				);
			} catch (error) {
				if (error instanceof NookCommunityMembershipError && error.code === 'NO_SUCH_REQUEST') throw new ApiError(meta.errors.noSuchRequest);
				if (error instanceof NookCommunityMembershipError && error.code === 'BANNED') throw new ApiError(meta.errors.banned);
				throw error;
			}
			if (ps.approve) {
				// Approval already committed membership; backing Channel lookup/follow is best-effort only.
				try {
					const [channel, user] = await Promise.all([
						this.channelsRepository.findOneBy({ id: result.communityId }),
						this.usersRepository.findOneBy({ id: result.userId, host: null }),
					]);
					if (channel != null && user != null) await this.channelFollowingService.follow(user as MiLocalUser, channel);
				} catch {}
			}
		});
	}
}
