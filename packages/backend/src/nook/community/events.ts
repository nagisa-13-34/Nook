/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { DataSource } from 'typeorm';
import type { IdService } from '@/core/IdService.js';
import { requireNookCommunityChannelReference } from './references.js';

export interface NookCommunityEventRecord {
	id: string;
	communityId: string;
	creatorId: string | null;
	title: string;
	description: string | null;
	location: string | null;
	startsAt: Date;
	endsAt: Date | null;
	maxAttendees: number | null;
	textChannelId: string | null;
	voiceChannelId: string | null;
	cancelledAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	goingCount: number;
	interestedCount: number;
	myResponse: string | null;
}

export async function listNookCommunityEvents(db: DataSource, communityId: string, userId: string, from: Date | null, limit: number): Promise<NookCommunityEventRecord[]> {
	return await db.query(
		`SELECT e."id", e."communityId", e."creatorId", e."title", e."description", e."location", e."startsAt", e."endsAt", e."maxAttendees", e."textChannelId", e."voiceChannelId", e."cancelledAt", e."createdAt", e."updatedAt",
		 count(*) FILTER (WHERE r."response" = 'going' AND (rm."userId" IS NOT NULL OR owner_channel."userId" = r."userId"))::int AS "goingCount",
		 count(*) FILTER (WHERE r."response" = 'interested' AND (rm."userId" IS NOT NULL OR owner_channel."userId" = r."userId"))::int AS "interestedCount",
		 max(r."response") FILTER (WHERE r."userId" = $2) AS "myResponse"
		 FROM "nook_community_event" e
		 LEFT JOIN "nook_community_event_rsvp" r ON r."eventId" = e."id"
		 LEFT JOIN "nook_community_member" rm ON rm."communityId" = e."communityId" AND rm."userId" = r."userId" AND rm."state" = 'active'
		 LEFT JOIN "channel" owner_channel ON owner_channel."id" = e."communityId"
		 WHERE e."communityId" = $1 AND ($3::timestamptz IS NULL OR e."startsAt" >= $3)
		 GROUP BY e."id", owner_channel."userId" ORDER BY e."startsAt" ASC LIMIT $4`,
		[communityId, userId, from, limit],
	);
}

export async function createNookCommunityEvent(db: DataSource, idService: IdService, input: { communityId: string; creatorId: string; title: string; description: string | null; location: string | null; startsAt: Date; endsAt: Date | null; maxAttendees: number | null; textChannelId: string | null; voiceChannelId: string | null }): Promise<string> {
	if (input.textChannelId != null) await requireNookCommunityChannelReference(db, input.communityId, input.textChannelId, { nonVoice: true });
	if (input.voiceChannelId != null) await requireNookCommunityChannelReference(db, input.communityId, input.voiceChannelId, { kind: 'voice' });
	const id = idService.gen();
	await db.query(
		`INSERT INTO "nook_community_event" ("id", "communityId", "creatorId", "title", "description", "location", "startsAt", "endsAt", "maxAttendees", "textChannelId", "voiceChannelId")
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		[id, input.communityId, input.creatorId, input.title, input.description, input.location, input.startsAt, input.endsAt, input.maxAttendees, input.textChannelId, input.voiceChannelId],
	);
	return id;
}

export async function setNookCommunityEventRsvp(db: DataSource, eventId: string, userId: string, response: 'going' | 'interested' | 'not_going'): Promise<void> {
	await db.transaction(async manager => {
		const events = await manager.query<Array<{ communityId: string; maxAttendees: number | null; cancelledAt: Date | null }>>(
			'SELECT "communityId", "maxAttendees", "cancelledAt" FROM "nook_community_event" WHERE "id"=$1 FOR UPDATE',
			[eventId],
		);
		const event = events[0];
		if (event == null || event.cancelledAt != null) throw new Error('EVENT_UNAVAILABLE');

		const membershipRows = await manager.query<Array<{ state: 'active' | 'banned' }>>(
			'SELECT "state" FROM "nook_community_member" WHERE "communityId"=$1 AND "userId"=$2 FOR SHARE',
			[event.communityId, userId],
		);
		if (membershipRows[0]?.state !== 'active') {
			const ownerRows = await manager.query<Array<{ userId: string | null }>>(
				'SELECT "userId" FROM "channel" WHERE "id"=$1 LIMIT 1',
				[event.communityId],
			);
			if (ownerRows[0]?.userId !== userId) throw new Error('EVENT_UNAVAILABLE');
		}

		if (response === 'going' && event.maxAttendees != null) {
			const countRows = await manager.query<Array<{ count: string }>>(
				`SELECT count(*)::text AS count
				 FROM "nook_community_event_rsvp" r
				 WHERE r."eventId"=$1 AND r."response"='going' AND r."userId"<>$2
				 AND (
					EXISTS (
						SELECT 1 FROM "nook_community_member" m
						WHERE m."communityId"=$3 AND m."userId"=r."userId" AND m."state"='active'
					)
					OR EXISTS (
						SELECT 1 FROM "channel" c WHERE c."id"=$3 AND c."userId"=r."userId"
					)
				 )`,
				[eventId, userId, event.communityId],
			);
			if (Number(countRows[0]?.count ?? 0) >= event.maxAttendees) throw new Error('EVENT_FULL');
		}
		await manager.query(`INSERT INTO "nook_community_event_rsvp" ("eventId", "userId", "response") VALUES ($1,$2,$3) ON CONFLICT ("eventId","userId") DO UPDATE SET "response"=EXCLUDED."response", "updatedAt"=now()`, [eventId, userId, response]);
	});
}
