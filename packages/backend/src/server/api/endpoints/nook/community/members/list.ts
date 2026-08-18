/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import type { DriveFilesRepository, UsersRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { DriveFileEntityService } from '@/core/entities/DriveFileEntityService.js';
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
		avatarId: { type: 'string', nullable: true },
		joinedAt: { type: 'string', format: 'date-time' },
		roleIds: { type: 'array', items: { type: 'string' } },
		username: { type: 'string' },
		name: { type: 'string', nullable: true },
		avatarUrl: { type: 'string', nullable: true },
		host: { type: 'string', nullable: true },
	}, required: ['userId', 'baseRole', 'state', 'nickname', 'avatarId', 'joinedAt', 'roleIds', 'username', 'name', 'avatarUrl', 'host'] } },
	errors: { forbidden: { message: 'You must be a community member.', code: 'FORBIDDEN', id: '4363e4ea-544a-4797-a66f-4bf7cae41abe' } },
} as const;

export const paramDef = { type: 'object', properties: { communityId: { type: 'string', format: 'misskey:id' } }, required: ['communityId'] } as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.db) private db: DataSource,
		@Inject(DI.usersRepository) private usersRepository: UsersRepository,
		@Inject(DI.driveFilesRepository) private driveFilesRepository: DriveFilesRepository,
		private driveFileEntityService: DriveFileEntityService,
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

			// Legacy/partially initialized Communities may have a valid membership
			// context for the requester without a corresponding list row yet.
			// Always include the signed-in member in the visible member list.
			if (!members.some(member => member.userId === me.id)) {
				const communityRows = await this.db.query<Array<{ createdAt: Date }>>(
					'SELECT "createdAt" FROM "channel" WHERE "id" = $1 LIMIT 1',
					[ps.communityId],
				);
				members.unshift({
					userId: me.id,
					baseRole: membership.baseRole,
					state: membership.state,
					nickname: null,
					avatarId: null,
					joinedAt: communityRows[0]?.createdAt ?? new Date(),
					roleIds: [],
				});
			}

			const userIds = [...new Set(members.map(member => member.userId))];
			const userRows = userIds.length === 0 ? [] : await this.usersRepository.findBy({ id: In(userIds) });
			const users = new Map(userRows.map(user => [user.id, user]));
			const avatarIds = [...new Set(members.flatMap(member => member.avatarId == null ? [] : [member.avatarId]))];
			const avatarFiles = avatarIds.length === 0 ? [] : await this.driveFilesRepository.findBy({ id: In(avatarIds) });
			const avatars = new Map(avatarFiles.map(file => [file.id, file]));
			const canManageRoles = membership.permissions.has('*') || membership.permissions.has('roles.manage');

			return members.map(member => {
				const user = users.get(member.userId);
				const avatar = member.avatarId == null ? null : avatars.get(member.avatarId) ?? null;
				return {
					...member,
					joinedAt: member.joinedAt.toISOString(),
					roleIds: canManageRoles ? member.roleIds : [],
					username: user?.username ?? member.userId,
					name: user?.name ?? null,
					avatarUrl: avatar != null ? this.driveFileEntityService.getPublicUrl(avatar, 'avatar') : user?.avatarUrl ?? null,
					host: user?.host ?? null,
				};
			});
		});
	}
}
