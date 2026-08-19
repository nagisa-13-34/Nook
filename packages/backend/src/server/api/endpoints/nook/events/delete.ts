/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { NookCommunityAccessError, requireNookCommunityPermission } from '@/nook/community/access.js';
import { purgeNookTranslationCache } from '@/nook/translation/NookTranslationService.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['channels'],
	requireCredential: true,
	kind: 'write:channels',
	errors: {
		forbidden: {
			message: 'You cannot manage this event.',
			code: 'FORBIDDEN',
			id: 'f81099d3-35d9-4326-9e3e-cafed296dad2',
		},
		noSuchEvent: {
			message: 'No such event.',
			code: 'NO_SUCH_EVENT',
			id: '1b5d4af9-70c9-4c38-8e15-c67dc2dc260b',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		eventId: { type: 'string', format: 'misskey:id' },
	},
	required: ['eventId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(@Inject(DI.db) private db: DataSource) {
		super(meta, paramDef, async (ps, me) => {
			const rows = await this.db.query<Array<{ communityId: string | null; creatorId: string | null }>>(
				'SELECT "communityId", "creatorId" FROM "nook_community_event" WHERE "id"=$1 LIMIT 1',
				[ps.eventId],
			);
			const event = rows[0];
			if (event == null) throw new ApiError(meta.errors.noSuchEvent);

			if (event.communityId != null) {
				try {
					await requireNookCommunityPermission(this.db, event.communityId, me.id, 'events.manage');
				} catch (error) {
					if (error instanceof NookCommunityAccessError) throw new ApiError(meta.errors.forbidden);
					throw error;
				}
			} else if (event.creatorId !== me.id) {
				throw new ApiError(meta.errors.forbidden);
			}

			await this.db.query('DELETE FROM "nook_community_event" WHERE "id"=$1', [ps.eventId]);
			await purgeNookTranslationCache(this.db, 'communityEvent', ps.eventId);
		});
	}
}
