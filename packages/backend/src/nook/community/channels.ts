/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { DataSource } from 'typeorm';
import type { IdService } from '@/core/IdService.js';
import { requireNookCommunityMember } from './access.js';
import { requireNookCommunityChannelReference, requireNookCommunityRoleReferences } from './references.js';

export type NookCommunityChannelKind = 'text' | 'announcement' | 'media' | 'forum' | 'voice';

export interface NookCommunityChannelRecord {
	id: string;
	communityId: string;
	parentId: string | null;
	name: string;
	topic: string | null;
	kind: NookCommunityChannelKind;
	position: number;
	allowedRoleIds: string[];
	archivedAt: Date | null;
}

export class NookCommunityChannelError extends Error {
	constructor(public readonly code: 'NO_SUCH_CHANNEL' | 'CHANNEL_FORBIDDEN') { super(code); }
}

export async function listNookCommunityChannels(db: DataSource, communityId: string, userId: string): Promise<NookCommunityChannelRecord[]> {
	const membership = await requireNookCommunityMember(db, communityId, userId);
	const rows = await db.query<NookCommunityChannelRecord[]>(
		`SELECT "id", "communityId", "parentId", "name", "topic", "kind", "position", "allowedRoleIds", "archivedAt"
		 FROM "nook_community_channel" WHERE "communityId" = $1 ORDER BY "position" ASC, "createdAt" ASC`, [communityId]);
	if (membership.permissions.has('*') || membership.permissions.has('channels.manage')) return rows;
	const roleRows = await db.query<Array<{ roleId: string }>>('SELECT "roleId" FROM "nook_community_member_role" WHERE "communityId" = $1 AND "userId" = $2', [communityId, userId]);
	const roleIds = new Set(roleRows.map(row => row.roleId));
	return rows.filter(row => !Array.isArray(row.allowedRoleIds) || row.allowedRoleIds.length === 0 || row.allowedRoleIds.some(id => roleIds.has(id)));
}

export async function requireNookCommunityChannelAccess(db: DataSource, communityId: string, userId: string, channelId: string): Promise<NookCommunityChannelRecord> {
	const membership = await requireNookCommunityMember(db, communityId, userId);
	const rows = await db.query<NookCommunityChannelRecord[]>(
		`SELECT "id", "communityId", "parentId", "name", "topic", "kind", "position", "allowedRoleIds", "archivedAt"
		 FROM "nook_community_channel" WHERE "communityId" = $1 AND "id" = $2 LIMIT 1`, [communityId, channelId]);
	const channel = rows[0];
	if (channel == null) throw new NookCommunityChannelError('NO_SUCH_CHANNEL');
	if (membership.permissions.has('*') || membership.permissions.has('channels.manage')) return channel;
	if (!Array.isArray(channel.allowedRoleIds) || channel.allowedRoleIds.length === 0) return channel;
	const roleRows = await db.query<Array<{ roleId: string }>>('SELECT "roleId" FROM "nook_community_member_role" WHERE "communityId" = $1 AND "userId" = $2', [communityId, userId]);
	if (roleRows.some(row => channel.allowedRoleIds.includes(row.roleId))) return channel;
	throw new NookCommunityChannelError('CHANNEL_FORBIDDEN');
}

export async function createNookCommunityChannel(db: DataSource, idService: IdService, input: Omit<NookCommunityChannelRecord, 'id' | 'archivedAt'>): Promise<NookCommunityChannelRecord> {
	return await db.transaction(async manager => {
		if (input.parentId != null) await requireNookCommunityChannelReference(manager, input.communityId, input.parentId);
		await requireNookCommunityRoleReferences(manager, input.communityId, input.allowedRoleIds, { lockForWrite: true });
		const rows = await manager.query<NookCommunityChannelRecord[]>(
			`INSERT INTO "nook_community_channel" ("id", "communityId", "parentId", "name", "topic", "kind", "position", "allowedRoleIds")
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
			 RETURNING "id", "communityId", "parentId", "name", "topic", "kind", "position", "allowedRoleIds", "archivedAt"`,
			[idService.gen(), input.communityId, input.parentId, input.name, input.topic, input.kind, input.position, JSON.stringify(input.allowedRoleIds)],
		);
		return rows[0];
	});
}
