/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { DataSource } from 'typeorm';
import { isNookAdultAgeGroup } from '@/nook/policy/PolicyTypes.js';
import type { NookAgeGroup } from '@/nook/policy/PolicyTypes.js';
import type { NookCommunityAgeMode } from './types.js';

type NookCommunityQueryExecutor = Pick<DataSource, 'query'>;

export class NookCommunityAgeError extends Error {
	constructor(public readonly code: 'AGE_MODE_RESTRICTED' | 'AGE_MODE_CONFLICT' | 'NO_SUCH_COMMUNITY') {
		super(code);
	}
}

export function isNookCommunityAgeModeAllowed(ageMode: NookCommunityAgeMode, ageGroup: NookAgeGroup): boolean {
	if (ageMode === 'mixed') return true;
	if (ageGroup === 'UNKNOWN') return false;
	if (ageMode === 'adults_only') return isNookAdultAgeGroup(ageGroup);
	return !isNookAdultAgeGroup(ageGroup);
}

async function getEffectiveAgeGroup(db: NookCommunityQueryExecutor, userId: string): Promise<NookAgeGroup> {
	const rows = await db.query<Array<{ host: string | null; nookVerifiedAgeGroup: NookAgeGroup | null }>>(
		`SELECT u."host", up."nookVerifiedAgeGroup"
		 FROM "user" u
		 LEFT JOIN "user_profile" up ON up."userId" = u."id"
		 WHERE u."id" = $1 LIMIT 1`,
		[userId],
	);
	const user = rows[0];
	if (user == null || user.host != null) return 'UNKNOWN';
	return user.nookVerifiedAgeGroup ?? 'UNKNOWN';
}

export async function assertNookCommunityAgeModeForUser(
	db: NookCommunityQueryExecutor,
	ageMode: NookCommunityAgeMode,
	userId: string,
): Promise<void> {
	if (ageMode === 'mixed') return;
	const ageGroup = await getEffectiveAgeGroup(db, userId);
	if (!isNookCommunityAgeModeAllowed(ageMode, ageGroup)) {
		throw new NookCommunityAgeError('AGE_MODE_RESTRICTED');
	}
}

export async function lockNookCommunityAgeMode(
	db: NookCommunityQueryExecutor,
	communityId: string,
): Promise<NookCommunityAgeMode> {
	const rows = await db.query<Array<{ ageMode: NookCommunityAgeMode }>>(
		'SELECT "ageMode" FROM "nook_community" WHERE "channelId" = $1 FOR UPDATE',
		[communityId],
	);
	const row = rows[0];
	if (row == null) throw new NookCommunityAgeError('NO_SUCH_COMMUNITY');
	return row.ageMode;
}

export async function assertNookCommunityAgeModeForAllMembers(
	db: NookCommunityQueryExecutor,
	communityId: string,
	ageMode: NookCommunityAgeMode,
): Promise<void> {
	if (ageMode === 'mixed') return;
	const members = await db.query<Array<{ userId: string; host: string | null; nookVerifiedAgeGroup: NookAgeGroup | null }>>(
		`SELECT members."userId", u."host", up."nookVerifiedAgeGroup"
		 FROM (
			SELECT "userId" FROM "nook_community_member" WHERE "communityId" = $1 AND "state" = 'active'
			UNION
			SELECT "userId" FROM "channel" WHERE "id" = $1 AND "userId" IS NOT NULL
		 ) members
		 LEFT JOIN "user" u ON u."id" = members."userId"
		 LEFT JOIN "user_profile" up ON up."userId" = members."userId"`,
		[communityId],
	);
	for (const member of members) {
		const ageGroup: NookAgeGroup = member.host == null ? member.nookVerifiedAgeGroup ?? 'UNKNOWN' : 'UNKNOWN';
		if (!isNookCommunityAgeModeAllowed(ageMode, ageGroup)) {
			throw new NookCommunityAgeError('AGE_MODE_CONFLICT');
		}
	}
}
