/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { DataSource } from 'typeorm';
import type { IdService } from '@/core/IdService.js';

export interface NookCommunityRuleRecord {
	id: string;
	communityId: string;
	position: number;
	title: string;
	body: string;
}

export async function listNookCommunityRules(db: DataSource, communityId: string): Promise<NookCommunityRuleRecord[]> {
	return await db.query('SELECT "id", "communityId", "position", "title", "body" FROM "nook_community_rule" WHERE "communityId" = $1 ORDER BY "position" ASC, "createdAt" ASC', [communityId]);
}

export async function createNookCommunityRule(db: DataSource, idService: IdService, communityId: string, title: string, body: string, position: number): Promise<NookCommunityRuleRecord> {
	const rows = await db.query<NookCommunityRuleRecord[]>(
		`INSERT INTO "nook_community_rule" ("id", "communityId", "position", "title", "body") VALUES ($1, $2, $3, $4, $5)
		 RETURNING "id", "communityId", "position", "title", "body"`,
		[idService.gen(), communityId, position, title, body],
	);
	return rows[0];
}

export async function updateNookCommunityRule(db: DataSource, communityId: string, ruleId: string, input: { title?: string; body?: string; position?: number }): Promise<NookCommunityRuleRecord | null> {
	const rows = await db.query<NookCommunityRuleRecord[]>(
		`UPDATE "nook_community_rule" SET "title" = COALESCE($3, "title"), "body" = COALESCE($4, "body"), "position" = COALESCE($5, "position"), "updatedAt" = now()
		 WHERE "communityId" = $1 AND "id" = $2 RETURNING "id", "communityId", "position", "title", "body"`,
		[communityId, ruleId, input.title ?? null, input.body ?? null, input.position ?? null],
	);
	return rows[0] ?? null;
}

export async function deleteNookCommunityRule(db: DataSource, communityId: string, ruleId: string): Promise<void> {
	await db.query('DELETE FROM "nook_community_rule" WHERE "communityId" = $1 AND "id" = $2', [communityId, ruleId]);
}
