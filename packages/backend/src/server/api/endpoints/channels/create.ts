/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import ms from 'ms';
import type { DataSource } from 'typeorm';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { ChannelsRepository, DriveFilesRepository } from '@/models/_.js';
import type { MiChannel } from '@/models/Channel.js';
import { IdService } from '@/core/IdService.js';
import { ChannelEntityService } from '@/core/entities/ChannelEntityService.js';
import { DI } from '@/di-symbols.js';
import { NookAccessService } from '@/nook/policy/NookAccessService.js';
import { ensureNookCommunity } from '@/nook/community/access.js';
import { ApiError } from '../../error.js';

export const meta = {
	tags: ['channels'],

	requireCredential: true,

	prohibitMoved: true,

	kind: 'write:channels',

	requiredRolePolicy: 'canCreateChannel',

	limit: {
		duration: ms('1hour'),
		max: 10,
	},

	res: {
		type: 'object',
		optional: false, nullable: false,
		ref: 'Channel',
	},

	errors: {
		noSuchFile: {
			message: 'No such file.',
			code: 'NO_SUCH_FILE',
			id: 'cd1e9f3e-5a12-4ab4-96f6-5d0a2cc32050',
		},
		communityRestricted: {
			message: 'You are not allowed to create a Community under the current Nook policy.',
			code: 'RESTRICTED_BY_NOOK_POLICY',
			id: '513a3c2d-d5df-44f4-86f7-94c74139be39',
			kind: 'permission',
			httpStatusCode: 403,
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		name: { type: 'string', minLength: 1, maxLength: 128 },
		description: { type: 'string', nullable: true, maxLength: 2048 },
		bannerId: { type: 'string', format: 'misskey:id', nullable: true },
		color: { type: 'string', minLength: 1, maxLength: 16 },
		isSensitive: { type: 'boolean', nullable: true },
		allowRenoteToExternal: { type: 'boolean', nullable: true },
	},
	required: ['name'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.db)
		private db: DataSource,

		@Inject(DI.driveFilesRepository)
		private driveFilesRepository: DriveFilesRepository,

		@Inject(DI.channelsRepository)
		private channelsRepository: ChannelsRepository,

		private idService: IdService,
		private channelEntityService: ChannelEntityService,
		private nookAccessService: NookAccessService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const communityEnabled = await this.nookAccessService.isFeatureEnabled('community');
			if (communityEnabled) {
				const createDecision = await this.nookAccessService.evaluate(me, 'create_community');
				const joinDecision = await this.nookAccessService.evaluate(me, 'join_community');
				if (!createDecision.allowed || !joinDecision.allowed) {
					throw new ApiError(meta.errors.communityRestricted);
				}
			}

			let banner = null;
			if (ps.bannerId != null) {
				banner = await this.driveFilesRepository.findOneBy({
					id: ps.bannerId,
					userId: me.id,
				});

				if (banner == null) {
					throw new ApiError(meta.errors.noSuchFile);
				}
			}

			const channel = await this.channelsRepository.insertOne({
				id: this.idService.gen(),
				userId: me.id,
				name: ps.name,
				description: ps.description ?? null,
				bannerId: banner ? banner.id : null,
				isSensitive: ps.isSensitive ?? false,
				...(ps.color !== undefined ? { color: ps.color } : {}),
				allowRenoteToExternal: ps.allowRenoteToExternal ?? true,
			} as MiChannel);

			if (communityEnabled) await ensureNookCommunity(this.db, channel.id);
			return await this.channelEntityService.pack(channel, me);
		});
	}
}
