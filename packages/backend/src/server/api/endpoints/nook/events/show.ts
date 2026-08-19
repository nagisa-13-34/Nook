/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { listNookCommunityChannels } from '@/nook/community/channels.js';
import { getNookEvent } from '@/nook/community/events.js';
import { serializeNookEvent } from '@/nook/community/serialize.js';
import { NookAccessService } from '@/nook/policy/NookAccessService.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '../../../error.js';
import { nookEventSchema } from './schema.js';

export const meta = {
	tags: ['channels'],
	requireCredential: true,
	kind: 'read:channels',
	res: { ...nookEventSchema, optional: false, nullable: false },
	errors: {
		eventUnavailable: {
			message: 'The event is unavailable.',
			code: 'EVENT_UNAVAILABLE',
			id: 'afc5f107-d5cf-40e0-a775-892706d48e63',
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
	constructor(
		@Inject(DI.db) private db: DataSource,
		private nookAccessService: NookAccessService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const event = await getNookEvent(this.db, ps.eventId, me.id);
			if (event == null) throw new ApiError(meta.errors.eventUnavailable);

			const voiceEnabled = await this.nookAccessService.isFeatureEnabled('voice_call');
			const visibleIds = event.communityId == null
				? new Set<string>()
				: new Set((await listNookCommunityChannels(this.db, event.communityId, me.id).catch(() => [])).map(channel => channel.id));

			return {
				...serializeNookEvent(event),
				textChannelId: event.textChannelId != null && visibleIds.has(event.textChannelId) ? event.textChannelId : null,
				voiceChannelId: voiceEnabled && event.voiceChannelId != null && visibleIds.has(event.voiceChannelId) ? event.voiceChannelId : null,
			};
		});
	}
}
