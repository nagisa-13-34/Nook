/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { requireNookCommunityPermission, NookCommunityAccessError } from '@/nook/community/access.js';
import { listNookCommunityRoles } from '@/nook/community/roles.js';
import { ApiError } from '../../../../error.js';

export const meta = { tags: ['channels'], requireCredential: true, kind: 'read:channels',
	res: { type: 'array', optional: false, nullable: false, items: { type: 'object', properties: { id: { type: 'string' }, communityId: { type: 'string' }, name: { type: 'string' }, color: { type: 'string', nullable: true }, position: { type: 'number' }, permissions: { type: 'array', items: { type: 'string' } } }, required: ['id', 'communityId', 'name', 'color', 'position', 'permissions'] } },
	errors: { forbidden: { message: 'You cannot manage roles.', code: 'FORBIDDEN', id: '03b59256-3ea0-483a-a35b-b6fcb99e7e1a' } },
} as const;
export const paramDef = { type: 'object', properties: { communityId: { type: 'string', format: 'misskey:id' } }, required: ['communityId'] } as const;
@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(@Inject(DI.db) private db: DataSource) { super(meta, paramDef, async (ps, me) => { try { await requireNookCommunityPermission(this.db, ps.communityId, me.id, 'roles.manage'); } catch (error) { if (error instanceof NookCommunityAccessError) throw new ApiError(meta.errors.forbidden); throw error; } return await listNookCommunityRoles(this.db, ps.communityId); }); }
}
