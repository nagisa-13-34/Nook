/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { IdService } from '@/core/IdService.js';
import { requireNookCommunityChannelReference } from './references.js';
import type { DataSource } from 'typeorm';

export type NookEventVisibility = 'public' | 'community' | 'unlisted' | 'private';
export type NookEventParticipation = 'anyone' | 'community';
export type NookEventRsvpResponse = 'going' | 'interested' | 'not_going';

export interface NookEventRecord {
	id: string;
	communityId: string | null;
	creatorId: string | null;
	title: string;
	description: string | null;
	location: string | null;
	startsAt: Date;
	endsAt: Date | null;
	maxAttendees: number | null;
	textChannelId: string | null;
	voiceChannelId: string | null;
	visibility: NookEventVisibility;
	participation: NookEventParticipation;
	cancelledAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	goingCount: number;
	interestedCount: number;
	myResponse: NookEventRsvpResponse | null;
}

export type NookCommunityEventRecord = Omit<NookEventRecord, 'communityId'> & { communityId: string };

const eventSelect = `e."id", e."communityId", e."creatorId", e."title", e."description", e."location", e."startsAt", e."endsAt", e."maxAttendees", e."textChannelId", e."voiceChannelId", e."visibility", e."participation", e."cancelledAt", e."createdAt", e."updatedAt",
	count(*) FILTER (WHERE r."response" = 'going' AND (e."participation" = 'anyone' OR rm."userId" IS NOT NULL OR owner_channel."userId" = r."userId"))::int AS "goingCount",
	count(*) FILTER (WHERE r."response" = 'interested' AND (e."participation" = 'anyone' OR rm."userId" IS NOT NULL OR owner_channel."userId" = r."userId"))::int AS "interestedCount"`;

const eventJoins = `LEFT JOIN "nook_community_event_rsvp" r ON r."eventId" = e."id"
	LEFT JOIN "nook_community_member" rm ON rm."communityId" = e."communityId" AND rm."userId" = r."userId" AND rm."state" = 'active'
	LEFT JOIN "channel" owner_channel ON owner_channel."id" = e."communityId"`;

export async function listNookCommunityEvents(db: DataSource, communityId: string, userId: string, from: Date | null, limit: number): Promise<NookCommunityEventRecord[]> {
	return await db.query(
		`SELECT ${eventSelect},
		 max(r."response") FILTER (WHERE r."userId" = $2) AS "myResponse"
		 FROM "nook_community_event" e
		 ${eventJoins}
		 WHERE e."communityId" = $1
		 AND (e."visibility" IN ('public', 'community') OR e."creatorId" = $2)
		 AND ($3::timestamptz IS NULL OR e."startsAt" >= $3)
		 GROUP BY e."id", owner_channel."userId" ORDER BY e."startsAt" ASC LIMIT $4`,
		[communityId, userId, from, limit],
	);
}

export async function listNookEvents(db: DataSource, userId: string, from: Date | null, limit: number): Promise<NookEventRecord[]> {
	return await db.query(
		`SELECT ${eventSelect},
		 max(r."response") FILTER (WHERE r."userId" = $1) AS "myResponse"
		 FROM "nook_community_event" e
		 ${eventJoins}
		 WHERE ($2::timestamptz IS NULL OR e."startsAt" >= $2)
		 AND (
			e."visibility" = 'public'
			OR e."creatorId" = $1
			OR (e."visibility" = 'community' AND (
				owner_channel."userId" = $1
				OR EXISTS (
					SELECT 1 FROM "nook_community_member" vm
					WHERE vm."communityId" = e."communityId" AND vm."userId" = $1 AND vm."state" = 'active'
				)
			))
		 )
		 GROUP BY e."id", owner_channel."userId" ORDER BY e."startsAt" ASC LIMIT $3`,
		[userId, from, limit],
	);
}

export async function getNookEvent(db: DataSource, eventId: string, userId: string): Promise<NookEventRecord | null> {
	const rows = await db.query<NookEventRecord[]>(
		`SELECT ${eventSelect},
		 max(r."response") FILTER (WHERE r."userId" = $2) AS "myResponse"
		 FROM "nook_community_event" e
		 ${eventJoins}
		 WHERE e."id" = $1
		 AND (
			e."visibility" IN ('public', 'unlisted')
			OR e."creatorId" = $2
			OR (e."visibility" = 'community' AND (
				owner_channel."userId" = $2
				OR EXISTS (
					SELECT 1 FROM "nook_community_member" vm
					WHERE vm."communityId" = e."communityId" AND vm."userId" = $2 AND vm."state" = 'active'
				)
			))
		 )
		 GROUP BY e."id", owner_channel."userId" LIMIT 1`,
		[eventId, userId],
	);
	return rows[0] ?? null;
}

export async function createNookEvent(db: DataSource, idService: IdService, input: {
	communityId: string | null;
	creatorId: string;
	title: string;
	description: string | null;
	location: string | null;
	startsAt: Date;
	endsAt: Date | null;
	maxAttendees: number | null;
	textChannelId: string | null;
	voiceChannelId: string | null;
	visibility: NookEventVisibility;
	participation: NookEventParticipation;
}): Promise<string> {
	if (input.communityId == null) {
		if (input.visibility === 'community' || input.participation === 'community' || input.textChannelId != null || input.voiceChannelId != null) throw new Error('INVALID_EVENT_SCOPE');
	} else {
		if (input.textChannelId != null) await requireNookCommunityChannelReference(db, input.communityId, input.textChannelId, { nonVoice: true });
		if (input.voiceChannelId != null) await requireNookCommunityChannelReference(db, input.communityId, input.voiceChannelId, { kind: 'voice' });
	}

	const id = idService.gen();
	await db.query(
		`INSERT INTO "nook_community_event" ("id", "communityId", "creatorId", "title", "description", "location", "startsAt", "endsAt", "maxAttendees", "textChannelId", "voiceChannelId", "visibility", "participation")
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
		[id, input.communityId, input.creatorId, input.title, input.description, input.location, input.startsAt, input.endsAt, input.maxAttendees, input.textChannelId, input.voiceChannelId, input.visibility, input.participation],
	);
	return id;
}

export async function createNookCommunityEvent(db: DataSource, idService: IdService, input: { communityId: string; creatorId: string; title: string; description: string | null; location: string | null; startsAt: Date; endsAt: Date | null; maxAttendees: number | null; textChannelId: string | null; voiceChannelId: string | null }): Promise<string> {
	return await createNookEvent(db, idService, {
		...input,
		visibility: 'community',
		participation: 'community',
	});
}

export async function setNookEventRsvp(db: DataSource, eventId: string, userId: string, response: NookEventRsvpResponse): Promise<void> {
	await db.transaction(async manager => {
		const events = await manager.query<Array<{
			communityId: string | null;
			creatorId: string | null;
			visibility: NookEventVisibility;
			participation: NookEventParticipation;
			maxAttendees: number | null;
			cancelledAt: Date | null;
		}>>(
			'SELECT "communityId", "creatorId", "visibility", "participation", "maxAttendees", "cancelledAt" FROM "nook_community_event" WHERE "id"=$1 FOR UPDATE',
			[eventId],
		);
		const event = events[0];
		if (event == null || event.cancelledAt != null) throw new Error('EVENT_UNAVAILABLE');

		let communityEligible = false;
		if (event.communityId != null) {
			const accessRows = await manager.query<Array<{ allowed: boolean }>>(
				`SELECT (
					EXISTS (
						SELECT 1 FROM "nook_community_member" m
						WHERE m."communityId"=$1 AND m."userId"=$2 AND m."state"='active'
					)
					OR EXISTS (
						SELECT 1 FROM "channel" c WHERE c."id"=$1 AND c."userId"=$2
					)
				) AS allowed`,
				[event.communityId, userId],
			);
			communityEligible = accessRows[0]?.allowed === true;
		}

		const canView = event.visibility === 'public'
			|| event.visibility === 'unlisted'
			|| event.creatorId === userId
			|| (event.visibility === 'community' && communityEligible);
		if (!canView) throw new Error('EVENT_UNAVAILABLE');
		if (event.participation === 'community' && !communityEligible) throw new Error('EVENT_UNAVAILABLE');

		if (response === 'going' && event.maxAttendees != null) {
			let countRows: Array<{ count: string }>;
			if (event.participation === 'anyone') {
				countRows = await manager.query<Array<{ count: string }>>(
					'SELECT count(*)::text AS count FROM "nook_community_event_rsvp" WHERE "eventId"=$1 AND "response"=\'going\' AND "userId"<>$2',
					[eventId, userId],
				);
			} else {
				countRows = await manager.query<Array<{ count: string }>>(
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
			}
			if (Number(countRows[0]?.count ?? 0) >= event.maxAttendees) throw new Error('EVENT_FULL');
		}

		await manager.query('INSERT INTO "nook_community_event_rsvp" ("eventId", "userId", "response") VALUES ($1,$2,$3) ON CONFLICT ("eventId","userId") DO UPDATE SET "response"=EXCLUDED."response", "updatedAt"=now()', [eventId, userId, response]);
	});
}

export async function setNookCommunityEventRsvp(db: DataSource, eventId: string, userId: string, response: NookEventRsvpResponse): Promise<void> {
	await setNookEventRsvp(db, eventId, userId, response);
}
