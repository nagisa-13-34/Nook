/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { requireNookCommunityPermission, NookCommunityAccessError } from '@/nook/community/access.js';
import { assertCanGrantNookCommunityPermissions, requireGrantableNookCommunityRole, NookCommunityAuthorizationError } from '@/nook/community/authorization.js';
import { updateNookCommunityRole, NookCommunityRoleError } from '@/nook/community/roles.js';
import { ApiError } from '../../../../error.js';

export const meta = { tags: ['channels'], requireCredential: true, kind: 'write:channels', res: { type: 'object', optional: false, nullable: false, properties: { id: { type: 'string' }, communityId: { type: 'string' }, name: { type: 'string' }, color: { type: 'string', nullable: true }, position: { type: 'number' }, permissions: { type: 'array', items: { type: 'string' } } }, required: ['id', 'communityId', 'name', 'color', 'position', 'permissions'] }, errors: {
	forbidden: { message: 'You cannot manage or grant these role permissions.', code: 'FORBIDDEN', id: '4c146961-dd17-49c5-95e1-16afb2807f1c' }, noSuchRole: { message: 'No such role.', code: 'NO_SUCH_ROLE', id: '450bc131-6684-4bc5-ac7a-0a658c353762' }, invalidPermissions: { message: 'Invalid permissions.', code: 'INVALID_PERMISSIONS', id: 'f0888bfb-1cb0-4ac4-b73e-457b07ee5440' },
} } as const;
export const paramDef = { type: 'object', properties: { communityId: { type: 'string', format: 'misskey:id' }, roleId: { type: 'string', format: 'misskey:id' }, name: { type: 'string', minLength: 1, maxLength: 64, nullable: true }, color: { type: 'string', maxLength: 16, nullable: true }, position: { type: 'integer', minimum: 0, maximum: 10000, nullable: true }, permissions: { type: 'array', maxItems: 64, items: { type: 'string', maxLength: 64 }, nullable: true } }, required: ['communityId', 'roleId'] } as const;
@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(@Inject(DI.db) private db: DataSource) {
		super(meta, paramDef, async (ps, me) => {
			try {
				const actor = await requireNookCommunityPermission(this.db, ps.communityId, me.id, 'roles.manage');
				await requireGrantableNookCommunityRole(this.db, ps.communityId, actor, ps.roleId);
				if (ps.permissions != null) assertCanGrantNookCommunityPermissions(actor, ps.permissions);
			} catch (error) {
				if (error instanceof NookCommunityAccessError) throw new ApiError(meta.errors.forbidden);
				if (error instanceof NookCommunityAuthorizationError) {
					if (error.code === 'NO_SUCH_ROLE') throw new ApiError(meta.errors.noSuchRole);
					throw new ApiError(meta.errors.forbidden);
				}
				throw error;
			}
			try { return await updateNookCommunityRole(this.db, { communityId: ps.communityId, roleId: ps.roleId, ...(ps.name != null ? { name: ps.name } : {}), ...(ps.color !== undefined ? { color: ps.color } : {}), ...(ps.position != null ? { position: ps.position } : {}), ...(ps.permissions != null ? { permissions: ps.permissions } : {}) }); } catch (error) { if (error instanceof NookCommunityRoleError && error.code === 'NO_SUCH_ROLE') throw new ApiError(meta.errors.noSuchRole); if (error instanceof NookCommunityRoleError && error.code === 'INVALID_PERMISSIONS') throw new ApiError(meta.errors.invalidPermissions); throw error; }
		}); 
	}
}
