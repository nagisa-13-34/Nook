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
import { assertCanGrantNookCommunityPermissions, NookCommunityAuthorizationError } from '@/nook/community/authorization.js';
import { createNookCommunityRole, NookCommunityRoleError } from '@/nook/community/roles.js';
import { ApiError } from '../../../../error.js';

export const meta = { tags: ['channels'], requireCredential: true, kind: 'write:channels', res: { type: 'object', optional: false, nullable: false, properties: { id: { type: 'string' }, communityId: { type: 'string' }, name: { type: 'string' }, color: { type: 'string', nullable: true }, position: { type: 'number' }, permissions: { type: 'array', items: { type: 'string' } } }, required: ['id', 'communityId', 'name', 'color', 'position', 'permissions'] }, errors: {
	forbidden: { message: 'You cannot manage or grant these role permissions.', code: 'FORBIDDEN', id: '16c865a4-c2dd-493a-833f-b2462c214090' }, invalidPermissions: { message: 'Invalid permissions.', code: 'INVALID_PERMISSIONS', id: '1575d00e-b6af-4f6e-b124-16a12d05e1a7' },
} } as const;
export const paramDef = { type: 'object', properties: { communityId: { type: 'string', format: 'misskey:id' }, name: { type: 'string', minLength: 1, maxLength: 64 }, color: { type: 'string', maxLength: 16, nullable: true }, position: { type: 'integer', minimum: 0, maximum: 10000 }, permissions: { type: 'array', maxItems: 64, items: { type: 'string', maxLength: 64 } } }, required: ['communityId', 'name', 'permissions'] } as const;
@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(@Inject(DI.db) private db: DataSource, private idService: IdService) { super(meta, paramDef, async (ps, me) => {
		let actor;
		try {
			actor = await requireNookCommunityPermission(this.db, ps.communityId, me.id, 'roles.manage');
			assertCanGrantNookCommunityPermissions(actor, ps.permissions);
		} catch (error) {
			if (error instanceof NookCommunityAccessError || error instanceof NookCommunityAuthorizationError) throw new ApiError(meta.errors.forbidden);
			throw error;
		}
		try { return await createNookCommunityRole(this.db, this.idService, { communityId: ps.communityId, name: ps.name, color: ps.color ?? null, position: ps.position ?? 0, permissions: ps.permissions }); } catch (error) { if (error instanceof NookCommunityRoleError && error.code === 'INVALID_PERMISSIONS') throw new ApiError(meta.errors.invalidPermissions); throw error; }
	}); }
}
