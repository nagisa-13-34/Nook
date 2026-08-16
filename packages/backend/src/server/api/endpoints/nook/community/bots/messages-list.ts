/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { authenticateNookCommunityBot, ensureBotChannelAllowed, NookCommunityBotError, requireNookCommunityBotCreatorActive } from '@/nook/community/bots.js';
import { requireNookCommunityChannelAccess, NookCommunityChannelError } from '@/nook/community/channels.js';
import { NookCommunityAccessError } from '@/nook/community/access.js';
import { assertNookCommunityChannelAdultBoundary, NookCommunityCommunicationError } from '@/nook/community/communication.js';
import { listNookCommunityMessages } from '@/nook/community/messages.js';
import { serializeNookCommunityMessage } from '@/nook/community/serialize.js';
import { ApiError } from '../../../../error.js';

export const meta = { tags: ['channels'], requireCredential: false, limit: { duration: 60000, max: 240 }, res: { type: 'array', optional: false, nullable: false, items: { type: 'object', properties: { id: { type: 'string' }, communityId: { type: 'string' }, channelId: { type: 'string' }, userId: { type: 'string', nullable: true }, botId: { type: 'string', nullable: true }, replyToId: { type: 'string', nullable: true }, body: { type: 'string' }, createdAt: { type: 'string', format: 'date-time' }, editedAt: { type: 'string', format: 'date-time', nullable: true } }, required: ['id', 'communityId', 'channelId', 'userId', 'botId', 'replyToId', 'body', 'createdAt', 'editedAt'] } }, errors: { unauthorized: { message: 'Bot authentication failed.', code: 'BOT_UNAUTHORIZED', id: 'c7e3fbfe-1ed3-439e-9773-95e29ab099d6' }, forbidden: { message: 'Bot cannot read this channel.', code: 'BOT_FORBIDDEN', id: 'ee561c4d-a507-487b-87dc-22b2ef551525' } } } as const;
export const paramDef = { type: 'object', properties: { botId: { type: 'string', format: 'misskey:id' }, secret: { type: 'string', minLength: 32, maxLength: 256 }, channelId: { type: 'string', format: 'misskey:id' }, limit: { type: 'integer', minimum: 1, maximum: 100 }, before: { type: 'string', format: 'date-time', nullable: true } }, required: ['botId', 'secret', 'channelId'] } as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(@Inject(DI.db) private db: DataSource) {
		super(meta, paramDef, async ps => {
			const secret = ps.secret;
			ps.secret = '[REDACTED]';
			let bot;
			try {
				bot = await authenticateNookCommunityBot(this.db, ps.botId, secret, 'read:messages');
				ensureBotChannelAllowed(bot, ps.channelId);
				if (bot.creatorId == null) throw new NookCommunityBotError('CHANNEL_FORBIDDEN');
				await requireNookCommunityBotCreatorActive(this.db, bot.creatorId);
			} catch (error) {
				if (error instanceof NookCommunityBotError) {
					if (error.code === 'CHANNEL_FORBIDDEN' || error.code === 'SCOPE_REQUIRED') throw new ApiError(meta.errors.forbidden);
					throw new ApiError(meta.errors.unauthorized);
				}
				throw error;
			}
			try {
				const channel = await requireNookCommunityChannelAccess(this.db, bot.communityId, bot.creatorId, ps.channelId);
				if (channel.archivedAt != null || channel.kind === 'voice') throw new NookCommunityChannelError('CHANNEL_FORBIDDEN');
				await assertNookCommunityChannelAdultBoundary(this.db, bot.creatorId, bot.communityId, ps.channelId, 'chat_with_adult');
			} catch (error) {
				if (error instanceof NookCommunityAccessError || error instanceof NookCommunityChannelError || error instanceof NookCommunityCommunicationError) throw new ApiError(meta.errors.forbidden);
				throw error;
			}
			const messages = await listNookCommunityMessages(this.db, bot.communityId, ps.channelId, ps.limit ?? 50, ps.before == null ? null : new Date(ps.before));
			return messages.map(serializeNookCommunityMessage);
		});
	}
}
