/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { authenticateNookCommunityBot, ensureBotChannelAllowed, NookCommunityBotError } from '@/nook/community/bots.js';
import { requireNookCommunityChannelAccess, NookCommunityChannelError } from '@/nook/community/channels.js';
import { NookCommunityAccessError } from '@/nook/community/access.js';
import { assertNookCommunityChannelAdultBoundary, NookCommunityCommunicationError } from '@/nook/community/communication.js';
import { requireNookCommunityReplyReference, NookCommunityReferenceError } from '@/nook/community/references.js';
import type { NookCommunityMessageRecord } from '@/nook/community/messages.js';
import { serializeNookCommunityMessage } from '@/nook/community/serialize.js';
import { ApiError } from '../../../../error.js';

const messageSchema = { type: 'object', properties: {
	id: { type: 'string' }, communityId: { type: 'string' }, channelId: { type: 'string' }, userId: { type: 'string', nullable: true }, botId: { type: 'string', nullable: true }, replyToId: { type: 'string', nullable: true }, body: { type: 'string' }, createdAt: { type: 'string', format: 'date-time' }, editedAt: { type: 'string', format: 'date-time', nullable: true },
}, required: ['id', 'communityId', 'channelId', 'userId', 'botId', 'replyToId', 'body', 'createdAt', 'editedAt'] } as const;
export const meta = { tags: ['channels'], requireCredential: false, limit: { duration: 60000, max: 180 }, res: messageSchema, errors: {
	unauthorized: { message: 'Bot authentication failed.', code: 'BOT_UNAUTHORIZED', id: '2686045a-3c66-4671-87c4-426334358c40' },
	forbidden: { message: 'Bot cannot post to this channel.', code: 'BOT_FORBIDDEN', id: 'ecf36bd8-dea4-4712-a0dc-abef4a2dc428' },
	invalidReply: { message: 'Bot reply target must be an active message in the same channel.', code: 'INVALID_REPLY', id: '8b2b9589-a30c-4b82-a77d-917db563c491' },
} } as const;
export const paramDef = { type: 'object', properties: {
	botId: { type: 'string', format: 'misskey:id' }, secret: { type: 'string', minLength: 32, maxLength: 256 }, channelId: { type: 'string', format: 'misskey:id' }, body: { type: 'string', minLength: 1, maxLength: 8000 }, replyToId: { type: 'string', format: 'misskey:id', nullable: true },
}, required: ['botId', 'secret', 'channelId', 'body'] } as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(@Inject(DI.db) private db: DataSource, private idService: IdService) {
		super(meta, paramDef, async ps => {
			const secret = ps.secret;
			ps.secret = '[REDACTED]';
			let bot;
			try {
				bot = await authenticateNookCommunityBot(this.db, ps.botId, secret, 'write:messages');
				ensureBotChannelAllowed(bot, ps.channelId);
			} catch (error) {
				if (error instanceof NookCommunityBotError) {
					if (error.code === 'CHANNEL_FORBIDDEN' || error.code === 'SCOPE_REQUIRED') throw new ApiError(meta.errors.forbidden);
					throw new ApiError(meta.errors.unauthorized);
				}
				throw error;
			}
			if (bot.creatorId == null) throw new ApiError(meta.errors.forbidden);
			try {
				const channel = await requireNookCommunityChannelAccess(this.db, bot.communityId, bot.creatorId, ps.channelId);
				if (channel.archivedAt != null || channel.kind === 'voice') throw new NookCommunityChannelError('CHANNEL_FORBIDDEN');
				await assertNookCommunityChannelAdultBoundary(this.db, bot.creatorId, bot.communityId, ps.channelId, 'chat_with_adult');
			} catch (error) {
				if (error instanceof NookCommunityAccessError || error instanceof NookCommunityChannelError || error instanceof NookCommunityCommunicationError) throw new ApiError(meta.errors.forbidden);
				throw error;
			}
			try {
				await requireNookCommunityReplyReference(this.db, bot.communityId, ps.channelId, ps.replyToId ?? null);
			} catch (error) {
				if (error instanceof NookCommunityReferenceError) throw new ApiError(meta.errors.invalidReply);
				throw error;
			}
			const rows = await this.db.query<NookCommunityMessageRecord[]>(
				'INSERT INTO "nook_community_message" ("id","communityId","channelId","botId","body","replyToId") VALUES ($1,$2,$3,$4,$5,$6) RETURNING "id","communityId","channelId","userId","botId","replyToId","body","createdAt","editedAt"',
				[this.idService.gen(), bot.communityId, ps.channelId, bot.id, ps.body, ps.replyToId ?? null]);
			const message = rows[0];
			if (message == null) throw new Error('Community bot message insert returned no row.');
			return serializeNookCommunityMessage(message);
		});
	}
}
