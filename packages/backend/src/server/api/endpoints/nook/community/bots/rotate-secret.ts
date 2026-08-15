/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { requireNookCommunityPermission, NookCommunityAccessError } from '@/nook/community/access.js';
import { requireNookCommunityChannelAccess, NookCommunityChannelError } from '@/nook/community/channels.js';
import { rotateNookCommunityBotSecret, NookCommunityBotError } from '@/nook/community/bots.js';
import { ApiError } from '../../../../error.js';

export const meta = { tags: ['channels'], requireCredential: true, kind: 'write:channels', res: { type: 'object', optional: false, nullable: false, properties: { secret: { type: 'string' } }, required: ['secret'] }, errors: { forbidden: { message: 'You cannot manage this bot.', code: 'FORBIDDEN', id: '522bb34e-6365-4a93-96b8-4a15f0d67fdb' }, noSuchBot: { message: 'No such bot.', code: 'NO_SUCH_BOT', id: '43f2e9a1-760d-4445-b44a-d44f5f998653' } } } as const;
export const paramDef = { type: 'object', properties: { communityId: { type: 'string', format: 'misskey:id' }, botId: { type: 'string', format: 'misskey:id' } }, required: ['communityId','botId'] } as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(@Inject(DI.db) private db: DataSource) {
		super(meta, paramDef, async (ps, me) => {
			try {
				await requireNookCommunityPermission(this.db, ps.communityId, me.id, 'bots.manage');
			} catch (error) {
				if (error instanceof NookCommunityAccessError) throw new ApiError(meta.errors.forbidden);
				throw error;
			}

			const botRows = await this.db.query<Array<{ allowedChannelIds: unknown }>>(
				'SELECT "allowedChannelIds" FROM "nook_community_bot" WHERE "communityId"=$1 AND "id"=$2 LIMIT 1',
				[ps.communityId, ps.botId],
			);
			if (botRows[0] == null) throw new ApiError(meta.errors.noSuchBot);
			const channelIds = Array.isArray(botRows[0].allowedChannelIds)
				? botRows[0].allowedChannelIds.filter((value): value is string => typeof value === 'string')
				: [];
			try {
				for (const channelId of [...new Set(channelIds)]) {
					try {
						await requireNookCommunityChannelAccess(this.db, ps.communityId, me.id, channelId);
					} catch (error) {
						if (error instanceof NookCommunityChannelError && error.code === 'NO_SUCH_CHANNEL') continue;
						throw error;
					}
				}
			} catch (error) {
				if (error instanceof NookCommunityAccessError || error instanceof NookCommunityChannelError) throw new ApiError(meta.errors.forbidden);
				throw error;
			}

			try {
				return { secret: await rotateNookCommunityBotSecret(this.db, ps.communityId, ps.botId) };
			} catch (error) {
				if (error instanceof NookCommunityBotError) throw new ApiError(meta.errors.noSuchBot);
				throw error;
			}
		});
	}
}
