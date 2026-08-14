/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ChannelsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { ChannelFollowingService } from '@/core/ChannelFollowingService.js';
import { IdentifiableError } from '@/misc/identifiable-error.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { useNookCommunityInvite, NookCommunityMembershipError } from '@/nook/community/membership.js';
import { ApiError } from '../../../../error.js';

export const meta = {
	tags: ['channels'], requireCredential: true, kind: 'write:channels', prohibitMoved: true,
	res: { type: 'object', optional: false, nullable: false, properties: { communityId: { type: 'string' } }, required: ['communityId'] },
	errors: {
		noSuchInvite: { message: 'No such invite.', code: 'NO_SUCH_INVITE', id: '81f90c95-12ac-4f06-b854-e5e95bef141b' },
		inviteExpired: { message: 'The invite has expired.', code: 'INVITE_EXPIRED', id: '9ad4c4d5-a97d-4025-8314-92a451d08b64' },
		inviteExhausted: { message: 'The invite has reached its use limit.', code: 'INVITE_EXHAUSTED', id: '297c1dfe-639b-4145-b0b9-d6c2869b0439' },
	},
} as const;
export const paramDef = { type: 'object', properties: { token: { type: 'string', minLength: 16, maxLength: 256 } }, required: ['token'] } as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(@Inject(DI.db) private db: DataSource, @Inject(DI.channelsRepository) private channelsRepository: ChannelsRepository, private channelFollowingService: ChannelFollowingService) {
		super(meta, paramDef, async (ps, me) => {
			let communityId: string;
			try { communityId = await useNookCommunityInvite(this.db, ps.token, me.id); } catch (error) {
				if (error instanceof NookCommunityMembershipError) {
					if (error.code === 'INVITE_EXPIRED') throw new ApiError(meta.errors.inviteExpired);
					if (error.code === 'INVITE_EXHAUSTED') throw new ApiError(meta.errors.inviteExhausted);
					if (error.code === 'NO_SUCH_INVITE') throw new ApiError(meta.errors.noSuchInvite);
				}
				throw error;
			}
			const channel = await this.channelsRepository.findOneBy({ id: communityId });
			if (channel != null) {
				try { await this.channelFollowingService.follow(me, channel); } catch (error) { if (!(error instanceof IdentifiableError && error.id === '6e335e39-0203-4418-a936-b3f2dc987845')) throw error; }
			}
			return { communityId };
		});
	}
}
