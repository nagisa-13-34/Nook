/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ensureNookCommunity } from '@/nook/community/access.js';
import { listNookCommunityRoles } from '@/nook/community/roles.js';

export const meta = { tags: ['channels'], requireCredential: false,
	res: { type: 'array', optional: false, nullable: false, items: { type: 'object', properties: { id: { type: 'string' }, communityId: { type: 'string' }, name: { type: 'string' }, color: { type: 'string', nullable: true }, position: { type: 'number' }, permissions: { type: 'array', items: { type: 'string' } } }, required: ['id', 'communityId', 'name', 'color', 'position', 'permissions'] } },
} as const;
export const paramDef = { type: 'object', properties: { communityId: { type: 'string', format: 'misskey:id' } }, required: ['communityId'] } as const;
@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(@Inject(DI.db) private db: DataSource) { super(meta, paramDef, async ps => { await ensureNookCommunity(this.db, ps.communityId); return await listNookCommunityRoles(this.db, ps.communityId); }); }
}
