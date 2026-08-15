/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { DataSource } from 'typeorm';

type NookCommunityQueryExecutor = Pick<DataSource, 'query'>;

export type NookCommunityReferenceErrorCode =
	| 'CHANNEL_NOT_IN_COMMUNITY'
	| 'INVALID_CHANNEL_KIND'
	| 'ROLE_NOT_IN_COMMUNITY'
	| 'MESSAGE_NOT_IN_COMMUNITY'
	| 'TARGET_NOT_IN_COMMUNITY';

export class NookCommunityReferenceError extends Error {
	constructor(public readonly code: NookCommunityReferenceErrorCode) {
		super(code);
	}
}

export interface NookCommunityChannelReference {
	id: string;
	communityId: string;
	kind: 'text' | 'announcement' | 'media' | 'forum' | 'voice';
	archivedAt: Date | null;
}

export async function requireNookCommunityChannelReference(
	db: NookCommunityQueryExecutor,
	communityId: string,
	channelId: string,
	options: { kind?: NookCommunityChannelReference['kind']; nonVoice?: boolean } = {},
): Promise<NookCommunityChannelReference> {
	const rows = await db.query<NookCommunityChannelReference[]>(
		'SELECT "id","communityId","kind","archivedAt" FROM "nook_community_channel" WHERE "id"=$1 AND "communityId"=$2 LIMIT 1',
		[channelId, communityId],
	);
	const channel = rows[0];
	if (channel == null) throw new NookCommunityReferenceError('CHANNEL_NOT_IN_COMMUNITY');
	if (options.kind != null && channel.kind !== options.kind) throw new NookCommunityReferenceError('INVALID_CHANNEL_KIND');
	if (options.nonVoice === true && channel.kind === 'voice') throw new NookCommunityReferenceError('INVALID_CHANNEL_KIND');
	return channel;
}

export async function requireNookCommunityRoleReferences(
	db: NookCommunityQueryExecutor,
	communityId: string,
	roleIds: readonly string[],
	options: { lockForWrite?: boolean } = {},
): Promise<void> {
	const unique = [...new Set(roleIds)];
	if (unique.length === 0) return;
	const lockClause = options.lockForWrite === true ? ' FOR KEY SHARE' : '';
	const rows = await db.query<Array<{ id: string }>>(
		`SELECT "id" FROM "nook_community_role" WHERE "communityId"=$1 AND "id" = ANY($2::varchar[])${lockClause}`,
		[communityId, unique],
	);
	if (rows.length !== unique.length) throw new NookCommunityReferenceError('ROLE_NOT_IN_COMMUNITY');
}

export async function requireNookCommunityReplyReference(
	db: NookCommunityQueryExecutor,
	communityId: string,
	channelId: string,
	replyToId: string | null,
): Promise<void> {
	if (replyToId == null) return;
	const rows = await db.query<Array<{ id: string }>>(
		'SELECT "id" FROM "nook_community_message" WHERE "id"=$1 AND "communityId"=$2 AND "channelId"=$3 AND "deletedAt" IS NULL LIMIT 1',
		[replyToId, communityId, channelId],
	);
	if (rows[0] == null) throw new NookCommunityReferenceError('MESSAGE_NOT_IN_COMMUNITY');
}

export async function requireNookCommunityPinReferences(
	db: NookCommunityQueryExecutor,
	communityId: string,
	input: { channelId: string | null; kind: 'message' | 'note' | 'announcement' | 'event' | 'url'; targetId: string | null },
): Promise<void> {
	if (input.channelId != null) await requireNookCommunityChannelReference(db, communityId, input.channelId);
	if (input.targetId == null || input.kind === 'note' || input.kind === 'url') return;

	if (input.kind === 'message') {
		const rows = await db.query<Array<{ channelId: string }>>(
			'SELECT "channelId" FROM "nook_community_message" WHERE "id"=$1 AND "communityId"=$2 AND "deletedAt" IS NULL LIMIT 1',
			[input.targetId, communityId],
		);
		const message = rows[0];
		if (message == null || (input.channelId != null && message.channelId !== input.channelId)) {
			throw new NookCommunityReferenceError('TARGET_NOT_IN_COMMUNITY');
		}
		return;
	}

	const table = input.kind === 'announcement' ? 'nook_community_announcement' : 'nook_community_event';
	const rows = await db.query<Array<{ id: string }>>(
		`SELECT "id" FROM "${table}" WHERE "id"=$1 AND "communityId"=$2 LIMIT 1`,
		[input.targetId, communityId],
	);
	if (rows[0] == null) throw new NookCommunityReferenceError('TARGET_NOT_IN_COMMUNITY');
}
