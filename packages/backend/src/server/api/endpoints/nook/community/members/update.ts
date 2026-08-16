/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import type { UsersRepository } from '@/models/_.js';
import type { MiLocalUser } from '@/models/User.js';
import { DI } from '@/di-symbols.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { NookAccessService } from '@/nook/policy/NookAccessService.js';
import { requireNookCommunityPermission, NookCommunityAccessError } from '@/nook/community/access.js';
import { assertCanAssignNookCommunityBaseRole, requireManageableNookCommunityMember, NookCommunityAuthorizationError } from '@/nook/community/authorization.js';
import { updateNookCommunityMember, NookCommunityMemberError } from '@/nook/community/members.js';
import { ApiError } from '../../../../error.js';

export const meta = { tags: ['channels'], requireCredential: true, kind: 'write:channels', errors: {
	forbidden: { message: 'You cannot manage this member or assign that role.', code: 'FORBIDDEN', id: 'a986aaf1-12fa-423c-9d48-6ac1662f0cc0' },
	ownerImmutable: { message: 'The community owner cannot be changed here.', code: 'OWNER_IMMUTABLE', id: 'ce738f4b-6a0a-4e78-a18e-21711f49714a' },
	noSuchMember: { message: 'No such member.', code: 'NO_SUCH_MEMBER', id: '5cfd2d9b-c28f-4f4f-a671-481efbc98b69' },
} } as const;
export const paramDef = { type: 'object', properties: {
	communityId: { type: 'string', format: 'misskey:id' }, userId: { type: 'string', format: 'misskey:id' }, baseRole: { type: 'string', enum: ['admin', 'moderator', 'member'], nullable: true }, state: { type: 'string', enum: ['active', 'banned'], nullable: true }, nickname: { type: 'string', maxLength: 64, nullable: true },
}, required: ['communityId', 'userId'] } as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(@Inject(DI.db) private db: DataSource, @Inject(DI.usersRepository) private usersRepository: UsersRepository, private nookAccessService: NookAccessService) {
		super(meta, paramDef, async (ps, me) => {
			try {
				const actor = await requireNookCommunityPermission(this.db, ps.communityId, me.id, 'members.manage');
				await requireManageableNookCommunityMember(this.db, ps.communityId, actor, ps.userId);
				if (ps.baseRole != null) assertCanAssignNookCommunityBaseRole(actor, ps.baseRole);
			} catch (error) {
				if (error instanceof NookCommunityAccessError) throw new ApiError(meta.errors.forbidden);
				if (error instanceof NookCommunityAuthorizationError) {
					if (error.code === 'NO_SUCH_MEMBER') throw new ApiError(meta.errors.noSuchMember);
					throw new ApiError(meta.errors.forbidden);
				}
				throw error;
			}
			try {
				await updateNookCommunityMember(this.db, ps.communityId, ps.userId, {
					...(ps.baseRole != null ? { baseRole: ps.baseRole } : {}),
					...(ps.state != null ? { state: ps.state } : {}),
					...(ps.nickname !== undefined ? { nickname: ps.nickname } : {}),
				}, ps.state === 'active' ? async () => {
					const target = await this.usersRepository.findOneBy({ id: ps.userId, host: IsNull() });
					if (target == null || !(await this.nookAccessService.evaluate(target as MiLocalUser, 'join_community')).allowed) throw new ApiError(meta.errors.forbidden);
				} : undefined);
			} catch (error) {
				if (error instanceof NookCommunityMemberError && error.code === 'OWNER_IMMUTABLE') throw new ApiError(meta.errors.ownerImmutable);
				if (error instanceof NookCommunityMemberError && error.code === 'NO_SUCH_MEMBER') throw new ApiError(meta.errors.noSuchMember);
				if (error instanceof NookCommunityMemberError && (error.code === 'AGE_MODE_RESTRICTED' || error.code === 'ADULT_BOUNDARY_RESTRICTED')) throw new ApiError(meta.errors.forbidden);
				throw error;
			}
		});
	}
}
