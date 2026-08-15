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
import { ApiError } from '../../../../error.js';

export const meta = { tags: ['channels'], requireCredential: true, kind: 'write:channels', errors: { forbidden: { message: 'You cannot manage pins.', code: 'FORBIDDEN', id: '30ae3057-d3b9-4f6e-aafa-d47bc160b121' } } } as const;
export const paramDef = { type: 'object', properties: { communityId: { type: 'string', format: 'misskey:id' }, pinId: { type: 'string', format: 'misskey:id' } }, required: ['communityId', 'pinId'] } as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(@Inject(DI.db) private db: DataSource) {
		super(meta, paramDef, async (ps, me) => {
			try {
				await requireNookCommunityPermission(this.db, ps.communityId, me.id, 'pins.manage');
			} catch (error) {
				if (error instanceof NookCommunityAccessError) throw new ApiError(meta.errors.forbidden);
				throw error;
			}

			const pinRows = await this.db.query<Array<{ channelId: string | null; kind: string; targetId: string | null }>>(
				'SELECT "channelId", "kind", "targetId" FROM "nook_community_pin" WHERE "communityId"=$1 AND "id"=$2 LIMIT 1',
				[ps.communityId, ps.pinId],
			);
			const pin = pinRows[0];
			if (pin != null) {
				try {
					if (pin.channelId != null) {
						await requireNookCommunityChannelAccess(this.db, ps.communityId, me.id, pin.channelId);
					} else if (pin.kind === 'message' && pin.targetId != null) {
						const messageRows = await this.db.query<Array<{ channelId: string }>>(
							'SELECT "channelId" FROM "nook_community_message" WHERE "communityId"=$1 AND "id"=$2 AND "deletedAt" IS NULL LIMIT 1',
							[ps.communityId, pin.targetId],
						);
						if (messageRows[0] != null) await requireNookCommunityChannelAccess(this.db, ps.communityId, me.id, messageRows[0].channelId);
					}
				} catch (error) {
					if (error instanceof NookCommunityAccessError || error instanceof NookCommunityChannelError) throw new ApiError(meta.errors.forbidden);
					throw error;
				}
			}

			await this.db.query('DELETE FROM "nook_community_pin" WHERE "communityId"=$1 AND "id"=$2', [ps.communityId, ps.pinId]);
		});
	}
}
