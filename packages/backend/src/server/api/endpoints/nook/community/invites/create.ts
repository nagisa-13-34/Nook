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
import { createNookCommunityInvite } from '@/nook/community/membership.js';
import { ApiError } from '../../../../error.js';

export const meta = {
	tags: ['channels'], requireCredential: true, kind: 'write:channels',
	res: { type: 'object', optional: false, nullable: false, properties: { id: { type: 'string' }, token: { type: 'string' } }, required: ['id', 'token'] },
	errors: { forbidden: { message: 'You cannot create invites.', code: 'FORBIDDEN', id: '677148a6-96f3-4466-b41d-9c5e736f84b7' } },
} as const;
export const paramDef = { type: 'object', properties: {
	communityId: { type: 'string', format: 'misskey:id' },
	maxUses: { type: 'integer', minimum: 1, maximum: 100000, nullable: true },
	expiresAt: { type: 'string', format: 'date-time', nullable: true },
}, required: ['communityId'] } as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(@Inject(DI.db) private db: DataSource, private idService: IdService) {
		super(meta, paramDef, async (ps, me) => {
			try { await requireNookCommunityPermission(this.db, ps.communityId, me.id, 'members.invite'); } catch (error) { if (error instanceof NookCommunityAccessError) throw new ApiError(meta.errors.forbidden); throw error; }
			return await createNookCommunityInvite(this.db, this.idService, ps.communityId, me.id, { maxUses: ps.maxUses ?? null, expiresAt: ps.expiresAt == null ? null : new Date(ps.expiresAt) });
		});
	}
}
