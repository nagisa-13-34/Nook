/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { NookCommunityAccessError, requireNookCommunityPermission } from '@/nook/community/access.js';
import type { NookEventParticipation, NookEventVisibility } from '@/nook/community/events.js';
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
			id: '77e0318f-857f-4828-bac5-fcbf33b2c3a4',
		},
		noSuchEvent: {
			message: 'No such event.',
			code: 'NO_SUCH_EVENT',
			id: '6f86b7d6-284d-4cf2-8f7e-2b750be76108',
		},
		invalidSchedule: {
			message: 'Invalid event schedule.',
			code: 'INVALID_SCHEDULE',
			id: 'bdc54014-1790-4f98-b504-a593b33157c1',
		},
		invalidScope: {
			message: 'This visibility or participation mode requires a community.',
			code: 'INVALID_EVENT_SCOPE',
			id: '5c35d5e3-d012-4b78-9db2-2eb37ad353cc',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		eventId: { type: 'string', format: 'misskey:id' },
		title: { type: 'string', minLength: 1, maxLength: 160 },
		description: { type: 'string', maxLength: 12000, nullable: true },
		location: { type: 'string', maxLength: 256, nullable: true },
		startsAt: { type: 'string', format: 'date-time', nullable: true },
		endsAt: { type: 'string', format: 'date-time', nullable: true },
		maxAttendees: { type: 'integer', minimum: 1, maximum: 100000, nullable: true },
		visibility: { type: 'string', enum: ['public', 'community', 'unlisted', 'private'] },
		participation: { type: 'string', enum: ['anyone', 'community'] },
		cancelled: { type: 'boolean', nullable: true },
	},
	required: ['eventId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(@Inject(DI.db) private db: DataSource) {
		super(meta, paramDef, async (ps, me) => {
			const rows = await this.db.query<Array<{
				communityId: string | null;
				creatorId: string | null;
				startsAt: Date;
				endsAt: Date | null;
				visibility: NookEventVisibility;
				participation: NookEventParticipation;
			}>>(
				'SELECT "communityId", "creatorId", "startsAt", "endsAt", "visibility", "participation" FROM "nook_community_event" WHERE "id"=$1 LIMIT 1',
				[ps.eventId],
			);
			const current = rows[0];
			if (current == null) throw new ApiError(meta.errors.noSuchEvent);

			if (current.communityId != null) {
				try {
					await requireNookCommunityPermission(this.db, current.communityId, me.id, 'events.manage');
				} catch (error) {
					if (error instanceof NookCommunityAccessError) throw new ApiError(meta.errors.forbidden);
					throw error;
				}
			} else if (current.creatorId !== me.id) {
				throw new ApiError(meta.errors.forbidden);
			}

			const visibility = ps.visibility ?? current.visibility;
			const participation = ps.participation ?? current.participation;
			if (current.communityId == null && (visibility === 'community' || participation === 'community')) throw new ApiError(meta.errors.invalidScope);

			const startsAt = ps.startsAt == null ? new Date(current.startsAt) : new Date(ps.startsAt);
			const endsAt = ps.endsAt === undefined ? current.endsAt : ps.endsAt == null ? null : new Date(ps.endsAt);
			if (endsAt != null && new Date(endsAt) <= startsAt) throw new ApiError(meta.errors.invalidSchedule);

			await this.db.query(
				`UPDATE "nook_community_event" SET
				 "title"=COALESCE($2,"title"),
				 "description"=CASE WHEN $3::boolean THEN $4 ELSE "description" END,
				 "location"=CASE WHEN $5::boolean THEN $6 ELSE "location" END,
				 "startsAt"=$7,
				 "endsAt"=$8,
				 "maxAttendees"=CASE WHEN $9::boolean THEN $10 ELSE "maxAttendees" END,
				 "visibility"=$11,
				 "participation"=$12,
				 "cancelledAt"=CASE WHEN $13::boolean IS NULL THEN "cancelledAt" WHEN $13 THEN COALESCE("cancelledAt",now()) ELSE NULL END,
				 "updatedAt"=now()
				 WHERE "id"=$1`,
				[ps.eventId, ps.title ?? null, ps.description !== undefined, ps.description ?? null, ps.location !== undefined, ps.location ?? null, startsAt, endsAt, ps.maxAttendees !== undefined, ps.maxAttendees ?? null, visibility, participation, ps.cancelled ?? null],
			);

			if (ps.description !== undefined) await purgeNookTranslationCache(this.db, 'communityEvent', ps.eventId);
		});
	}
}
