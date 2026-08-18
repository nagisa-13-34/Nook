/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { requireNookCommunityMember, NookCommunityAccessError } from '@/nook/community/access.js';
import { listNookCommunityMembers } from '@/nook/community/members.js';
import { ApiError } from '../../../../error.js';

export const meta = { tags: ['channels'], requireCredential: true, kind: 'read:channels',
	res: { type: 'array', optional: false, nullable: false, items: { type: 'object', properties: {
		userId: { type: 'string' },
		baseRole: { type: 'string' },
		state: { type: 'string' },
		nickname: { type: 'string', nullable: true },
		joinedAt: { type: 'string', format: 'date-time' },
		roleIds: { type: 'array', items: { type: 'string' } },
		username: { type: 'string' },
		name: { type: 'string', nullable: true },
		avatarUrl: { type: 'string', nullable: true },
		host: { type: 'string', nullable: true },
	}, required: ['userId', 'baseRole', 'state', 'nickname', 'joinedAt', 'roleIds', 'username', 'name', 'avatarUrl', 'host'] } },
	errors: { forbidden: { message: 'You must be a community member.', code: 'FORBIDDEN', id: '4363e4ea-544a-4797-a66f-4bf7cae41abe' } },
} as const;

export const paramDef = { type: 'object', properties: { communityId: { type: 'string', format: 'misskey:id' } }, required: ['communityId'] } as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.db) private db: DataSource,
		private userEntityService: UserEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			let membership;
			try {
				membership = await requireNookCommunityMember(this.db, ps.communityId, me.id);
			} catch (error) {
				if (error instanceof NookCommunityAccessError) throw new ApiError(meta.errors.forbidden);
				throw error;
			}

			const members = await listNookCommunityMembers(this.db, ps.communityId);
			const packedUsers = await this.userEntityService.packMany(members.map(member => member.userId), me, { schema: 'UserLite' });
			const users = new Map(packedUsers.map(user => [user.id, user]));
			const canManageRoles = membership.permissions.has('*') || membership.permissions.has('roles.manage');

			return members.map(member => {
				const user = users.get(member.userId);
				return {
					...member,
					joinedAt: member.joinedAt.toISOString(),
					roleIds: canManageRoles ? member.roleIds : [],
					username: user?.username ?? member.userId,
					name: user?.name ?? null,
					avatarUrl: user?.avatarUrl ?? null,
					host: user?.host ?? null,
				};
			});
		});
	}
}
