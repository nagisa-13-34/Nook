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
import { nookCommunityBotScopes } from '@/nook/community/bots.js';
import { ApiError } from '../../../../error.js';

export const meta = { tags: ['channels'], requireCredential: true, kind: 'write:channels', errors: { forbidden: { message: 'You cannot manage bots.', code: 'FORBIDDEN', id: 'ef376367-89bb-471b-8729-c7ddc11d92d9' }, invalidScope: { message: 'Invalid bot scope.', code: 'INVALID_SCOPE', id: 'ab8aeaee-8de1-48bc-bd0b-01ba77d11a5a' }, noSuchBot: { message: 'No such bot.', code: 'NO_SUCH_BOT', id: '486fe026-acd2-4c94-8954-1e07d201e5e0' }, invalidChannel: { message: 'Bot channels must be visible non-voice channels in this community.', code: 'INVALID_CHANNEL', id: '39d89c45-c26d-49d6-bda4-2afcfbb8ac5e' } } } as const;
export const paramDef = { type: 'object', properties: { communityId: { type: 'string', format: 'misskey:id' }, botId: { type: 'string', format: 'misskey:id' }, name: { type: 'string', minLength: 1, maxLength: 64, nullable: true }, description: { type: 'string', maxLength: 1024, nullable: true }, scopes: { type: 'array', maxItems: 16, items: { type: 'string', maxLength: 32 }, nullable: true }, allowedChannelIds: { type: 'array', maxItems: 200, items: { type: 'string', format: 'misskey:id' }, nullable: true }, enabled: { type: 'boolean', nullable: true } }, required: ['communityId','botId'] } as const;

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

			const currentRows = await this.db.query<Array<{ allowedChannelIds: unknown }>>(
				'SELECT "allowedChannelIds" FROM "nook_community_bot" WHERE "communityId"=$1 AND "id"=$2 LIMIT 1',
				[ps.communityId, ps.botId],
			);
			if (currentRows[0] == null) throw new ApiError(meta.errors.noSuchBot);

			try {
				const currentChannelIds = Array.isArray(currentRows[0].allowedChannelIds)
					? currentRows[0].allowedChannelIds.filter((value): value is string => typeof value === 'string')
					: [];
				for (const channelId of [...new Set(currentChannelIds)]) {
					try {
						await requireNookCommunityChannelAccess(this.db, ps.communityId, me.id, channelId);
					} catch (error) {
						if (error instanceof NookCommunityChannelError && error.code === 'NO_SUCH_CHANNEL') continue;
						throw error;
					}
				}

				if (ps.allowedChannelIds != null) {
					for (const channelId of [...new Set(ps.allowedChannelIds)]) {
						const channel = await requireNookCommunityChannelAccess(this.db, ps.communityId, me.id, channelId);
						if (channel.kind === 'voice') throw new NookCommunityChannelError('CHANNEL_FORBIDDEN');
					}
				}
			} catch (error) {
				if (error instanceof NookCommunityAccessError || error instanceof NookCommunityChannelError) throw new ApiError(meta.errors.invalidChannel);
				throw error;
			}

			if (ps.scopes != null && !ps.scopes.every(scope => (nookCommunityBotScopes as readonly string[]).includes(scope))) throw new ApiError(meta.errors.invalidScope);
			const rows = await this.db.query<Array<{ id: string }>>(
				`UPDATE "nook_community_bot" SET
				 "name"=COALESCE($3,"name"),
				 "description"=CASE WHEN $4::boolean THEN $5 ELSE "description" END,
				 "scopes"=COALESCE($6::jsonb,"scopes"),
				 "allowedChannelIds"=COALESCE($7::jsonb,"allowedChannelIds"),
				 "enabled"=COALESCE($8,"enabled"),
				 "updatedAt"=now()
				 WHERE "communityId"=$1 AND "id"=$2
				 RETURNING "id"`,
				[
					ps.communityId,
					ps.botId,
					ps.name ?? null,
					ps.description !== undefined,
					ps.description ?? null,
					ps.scopes == null ? null : JSON.stringify([...new Set(ps.scopes)]),
					ps.allowedChannelIds == null ? null : JSON.stringify([...new Set(ps.allowedChannelIds)]),
					ps.enabled ?? null,
				],
			);
			if (rows[0] == null) throw new ApiError(meta.errors.noSuchBot);
		});
	}
}
