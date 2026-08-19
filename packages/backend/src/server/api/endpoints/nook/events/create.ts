/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IdService } from '@/core/IdService.js';
import { DI } from '@/di-symbols.js';
import { NookCommunityAccessError, requireNookCommunityPermission } from '@/nook/community/access.js';
import { NookCommunityChannelError, requireNookCommunityChannelAccess } from '@/nook/community/channels.js';
import { createNookEvent } from '@/nook/community/events.js';
import { NookCommunityReferenceError } from '@/nook/community/references.js';
import { NookAccessService } from '@/nook/policy/NookAccessService.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['channels'],
	requireCredential: true,
	kind: 'write:channels',
	res: {
		type: 'object', optional: false, nullable: false,
		properties: { id: { type: 'string' } },
		required: ['id'],
	},
	errors: {
		forbidden: {
			message: 'You cannot manage events in this community.',
			code: 'FORBIDDEN',
			id: '61ed7655-c2b1-487b-968a-6f88c45dcd6b',
		},
		voiceDisabled: {
			message: 'Voice calls are disabled.',
			code: 'NOOK_VOICE_CALL_DISABLED',
			id: 'd5439c47-1393-407b-b553-9dcafac137a7',
			kind: 'permission',
			httpStatusCode: 403,
		},
		invalidSchedule: {
			message: 'Invalid event schedule.',
			code: 'INVALID_SCHEDULE',
			id: '0731659c-b976-4175-a865-6eaaa7478068',
		},
		invalidChannel: {
			message: 'Event channels must be visible to you, belong to the selected community, and match their expected type.',
			code: 'INVALID_CHANNEL',
			id: 'a6b81c73-4bc9-48a5-993f-45901e2fc4c2',
		},
		invalidScope: {
			message: 'This visibility or participation mode requires a community.',
			code: 'INVALID_EVENT_SCOPE',
			id: 'eaecc646-ed34-47d0-b281-cac7f9b3cbc5',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		communityId: { type: 'string', format: 'misskey:id', nullable: true },
		title: { type: 'string', minLength: 1, maxLength: 160 },
		description: { type: 'string', maxLength: 12000, nullable: true },
		location: { type: 'string', maxLength: 256, nullable: true },
		startsAt: { type: 'string', format: 'date-time' },
		endsAt: { type: 'string', format: 'date-time', nullable: true },
		maxAttendees: { type: 'integer', minimum: 1, maximum: 100000, nullable: true },
		textChannelId: { type: 'string', format: 'misskey:id', nullable: true },
		voiceChannelId: { type: 'string', format: 'misskey:id', nullable: true },
		visibility: { type: 'string', enum: ['public', 'community', 'unlisted', 'private'] },
		participation: { type: 'string', enum: ['anyone', 'community'] },
	},
	required: ['title', 'startsAt'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.db) private db: DataSource,
		private idService: IdService,
		private nookAccessService: NookAccessService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const communityId = ps.communityId ?? null;
			const visibility = ps.visibility ?? (communityId == null ? 'public' : 'community');
			const participation = ps.participation ?? (communityId == null ? 'anyone' : 'community');

			if (communityId == null && (visibility === 'community' || participation === 'community' || ps.textChannelId != null || ps.voiceChannelId != null)) {
				throw new ApiError(meta.errors.invalidScope);
			}

			if (communityId != null) {
				try {
					await requireNookCommunityPermission(this.db, communityId, me.id, 'events.manage');
				} catch (error) {
					if (error instanceof NookCommunityAccessError) throw new ApiError(meta.errors.forbidden);
					throw error;
				}
			}

			if (ps.voiceChannelId != null && !(await this.nookAccessService.isFeatureEnabled('voice_call'))) throw new ApiError(meta.errors.voiceDisabled);

			if (communityId != null) {
				try {
					if (ps.textChannelId != null) await requireNookCommunityChannelAccess(this.db, communityId, me.id, ps.textChannelId);
					if (ps.voiceChannelId != null) await requireNookCommunityChannelAccess(this.db, communityId, me.id, ps.voiceChannelId);
				} catch (error) {
					if (error instanceof NookCommunityAccessError || error instanceof NookCommunityChannelError) throw new ApiError(meta.errors.invalidChannel);
					throw error;
				}
			}

			const startsAt = new Date(ps.startsAt);
			const endsAt = ps.endsAt == null ? null : new Date(ps.endsAt);
			if (endsAt != null && endsAt <= startsAt) throw new ApiError(meta.errors.invalidSchedule);

			try {
				const id = await createNookEvent(this.db, this.idService, {
					communityId,
					creatorId: me.id,
					title: ps.title,
					description: ps.description ?? null,
					location: ps.location ?? null,
					startsAt,
					endsAt,
					maxAttendees: ps.maxAttendees ?? null,
					textChannelId: ps.textChannelId ?? null,
					voiceChannelId: ps.voiceChannelId ?? null,
					visibility,
					participation,
				});
				return { id };
			} catch (error) {
				if (error instanceof NookCommunityReferenceError) throw new ApiError(meta.errors.invalidChannel);
				if (error instanceof Error && error.message === 'INVALID_EVENT_SCOPE') throw new ApiError(meta.errors.invalidScope);
				throw error;
			}
		});
	}
}
