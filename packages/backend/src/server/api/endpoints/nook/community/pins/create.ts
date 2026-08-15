/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { requireNookCommunityPermission, NookCommunityAccessError } from '@/nook/community/access.js';
import { requireNookCommunityChannelAccess, NookCommunityChannelError } from '@/nook/community/channels.js';
import { requireNookCommunityPinReferences, NookCommunityReferenceError } from '@/nook/community/references.js';
import { ApiError } from '../../../../error.js';

const pinSchema = { type: 'object', properties: { id: { type: 'string' }, communityId: { type: 'string' }, channelId: { type: 'string', nullable: true }, kind: { type: 'string' }, targetId: { type: 'string', nullable: true }, url: { type: 'string', nullable: true }, label: { type: 'string', nullable: true }, createdBy: { type: 'string', nullable: true }, createdAt: { type: 'string', format: 'date-time' } }, required: ['id', 'communityId', 'channelId', 'kind', 'targetId', 'url', 'label', 'createdBy', 'createdAt'] } as const;
export const meta = { tags: ['channels'], requireCredential: true, kind: 'write:channels', res: pinSchema, errors: { forbidden: { message: 'You cannot manage pins.', code: 'FORBIDDEN', id: '48fa201c-d108-45d9-a7ed-111d6fe8c75e' }, invalidTarget: { message: 'Pin target must belong to an accessible part of this community.', code: 'INVALID_TARGET', id: '76b0fb8a-95fa-450a-814a-cc1a6274719b' } } } as const;
export const paramDef = { type: 'object', properties: { communityId: { type: 'string', format: 'misskey:id' }, channelId: { type: 'string', format: 'misskey:id', nullable: true }, kind: { type: 'string', enum: ['message', 'note', 'announcement', 'event', 'url'] }, targetId: { type: 'string', maxLength: 64, nullable: true }, url: { type: 'string', maxLength: 2048, nullable: true }, label: { type: 'string', maxLength: 160, nullable: true } }, required: ['communityId', 'kind'] } as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(@Inject(DI.db) private db: DataSource, private idService: IdService) {
		super(meta, paramDef, async (ps, me) => {
			try {
				await requireNookCommunityPermission(this.db, ps.communityId, me.id, 'pins.manage');
				if (ps.channelId != null) await requireNookCommunityChannelAccess(this.db, ps.communityId, me.id, ps.channelId);
				if (ps.kind === 'message' && ps.targetId != null) {
					const messageRows = await this.db.query<Array<{ channelId: string }>>(
						'SELECT "channelId" FROM "nook_community_message" WHERE "communityId"=$1 AND "id"=$2 AND "deletedAt" IS NULL LIMIT 1',
						[ps.communityId, ps.targetId],
					);
					if (messageRows[0] == null) throw new ApiError(meta.errors.invalidTarget);
					await requireNookCommunityChannelAccess(this.db, ps.communityId, me.id, messageRows[0].channelId);
				}
			} catch (error) {
				if (error instanceof ApiError) throw error;
				if (error instanceof NookCommunityAccessError) throw new ApiError(meta.errors.forbidden);
				if (error instanceof NookCommunityChannelError) throw new ApiError(meta.errors.invalidTarget);
				throw error;
			}

			if (ps.kind === 'url') {
				if (ps.url == null || !/^https?:\/\//i.test(ps.url)) throw new ApiError(meta.errors.invalidTarget);
			} else if (ps.targetId == null) {
				throw new ApiError(meta.errors.invalidTarget);
			}

			try {
				await requireNookCommunityPinReferences(this.db, ps.communityId, {
					channelId: ps.channelId ?? null,
					kind: ps.kind,
					targetId: ps.targetId ?? null,
				});
			} catch (error) {
				if (error instanceof NookCommunityReferenceError) throw new ApiError(meta.errors.invalidTarget);
				throw error;
			}
			const rows = await this.db.query(`INSERT INTO "nook_community_pin" ("id", "communityId", "channelId", "kind", "targetId", "url", "label", "createdBy") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING "id", "communityId", "channelId", "kind", "targetId", "url", "label", "createdBy", "createdAt"`, [this.idService.gen(), ps.communityId, ps.channelId ?? null, ps.kind, ps.targetId ?? null, ps.url ?? null, ps.label ?? null, me.id]);
			return rows[0];
		});
	}
}
