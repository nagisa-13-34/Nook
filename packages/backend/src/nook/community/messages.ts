/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { DataSource } from 'typeorm';
import type { IdService } from '@/core/IdService.js';

export interface NookCommunityMessageRecord {
	id: string;
	communityId: string;
	channelId: string;
	userId: string | null;
	botId: string | null;
	replyToId: string | null;
	body: string;
	createdAt: Date;
	editedAt: Date | null;
}

export async function listNookCommunityMessages(db: DataSource, communityId: string, channelId: string, limit: number, before: Date | null): Promise<NookCommunityMessageRecord[]> {
	const rows = await db.query<NookCommunityMessageRecord[]>(
		`SELECT "id", "communityId", "channelId", "userId", "botId", "replyToId", "body", "createdAt", "editedAt"
		 FROM "nook_community_message"
		 WHERE "communityId" = $1 AND "channelId" = $2 AND "deletedAt" IS NULL AND ($3::timestamptz IS NULL OR "createdAt" < $3)
		 ORDER BY "createdAt" DESC LIMIT $4`, [communityId, channelId, before, limit]);
	return rows.reverse();
}

export async function createNookCommunityMessage(db: DataSource, idService: IdService, input: { communityId: string; channelId: string; userId: string; body: string; replyToId: string | null }): Promise<NookCommunityMessageRecord> {
	const rows = await db.query<NookCommunityMessageRecord[]>(
		`INSERT INTO "nook_community_message" ("id", "communityId", "channelId", "userId", "body", "replyToId")
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING "id", "communityId", "channelId", "userId", "botId", "replyToId", "body", "createdAt", "editedAt"`,
		[idService.gen(), input.communityId, input.channelId, input.userId, input.body, input.replyToId],
	);
	return rows[0];
}
