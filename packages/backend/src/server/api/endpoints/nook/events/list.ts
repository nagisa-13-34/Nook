/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { listNookCommunityChannels } from '@/nook/community/channels.js';
import { listNookEvents } from '@/nook/community/events.js';
import { serializeNookEvent } from '@/nook/community/serialize.js';
import { NookAccessService } from '@/nook/policy/NookAccessService.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { nookEventSchema } from './schema.js';

export const meta = {
	tags: ['channels'],
	requireCredential: true,
	kind: 'read:channels',
	res: {
		type: 'array', optional: false, nullable: false,
		items: nookEventSchema,
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		from: { type: 'string', format: 'date-time', nullable: true },
		limit: { type: 'integer', minimum: 1, maximum: 100 },
	},
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.db) private db: DataSource,
		private nookAccessService: NookAccessService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const events = await listNookEvents(this.db, me.id, ps.from == null ? null : new Date(ps.from), ps.limit ?? 50);
			const voiceEnabled = await this.nookAccessService.isFeatureEnabled('voice_call');
			const communityIds = [...new Set(events.map(event => event.communityId).filter((id): id is string => id != null))];
			const visibleChannels = new Map<string, Set<string>>();

			await Promise.all(communityIds.map(async communityId => {
				const channels = await listNookCommunityChannels(this.db, communityId, me.id).catch(() => []);
				visibleChannels.set(communityId, new Set(channels.map(channel => channel.id)));
			}));

			return events.map(event => {
				const visibleIds = event.communityId == null ? null : visibleChannels.get(event.communityId);
				return {
					...serializeNookEvent(event),
					textChannelId: event.textChannelId != null && visibleIds?.has(event.textChannelId) === true ? event.textChannelId : null,
					voiceChannelId: voiceEnabled && event.voiceChannelId != null && visibleIds?.has(event.voiceChannelId) === true ? event.voiceChannelId : null,
				};
			});
		});
	}
}
