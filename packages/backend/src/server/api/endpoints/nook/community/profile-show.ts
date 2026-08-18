/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { DriveFilesRepository, UsersRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { DriveFileEntityService } from '@/core/entities/DriveFileEntityService.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { requireNookCommunityMember, NookCommunityAccessError } from '@/nook/community/access.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['channels'],
	requireCredential: true,
	kind: 'read:channels',
	res: {
		type: 'object', optional: false, nullable: false,
		properties: {
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
		},
		required: ['userId', 'baseRole', 'state', 'nickname', 'avatarId', 'joinedAt', 'roleIds', 'username', 'name', 'avatarUrl', 'host'],
	},
	errors: {
		forbidden: { message: 'You must be an active community member.', code: 'FORBIDDEN', id: '783db463-5b1c-41df-9e7a-53f971388c18' },
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: { communityId: { type: 'string', format: 'misskey:id' } },
	required: ['communityId'],
} as const;

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

			const [memberRows, user] = await Promise.all([
				this.db.query<Array<{ nickname: string | null; avatarId: string | null; joinedAt: Date }>>(
					'SELECT "nickname", "avatarId", "joinedAt" FROM "nook_community_member" WHERE "communityId" = $1 AND "userId" = $2 LIMIT 1',
					[ps.communityId, me.id],
				),
				this.usersRepository.findOneBy({ id: me.id }),
			]);
			const row = memberRows[0];
			const avatar = row?.avatarId == null ? null : await this.driveFilesRepository.findOneBy({ id: row.avatarId });
			const joinedAt = row?.joinedAt == null ? new Date() : (row.joinedAt instanceof Date ? row.joinedAt : new Date(row.joinedAt));

			return {
				userId: me.id,
				baseRole: membership.baseRole,
				state: membership.state,
				nickname: row?.nickname ?? null,
				avatarId: row?.avatarId ?? null,
				joinedAt: joinedAt.toISOString(),
				roleIds: [],
				username: user?.username ?? me.id,
				name: user?.name ?? null,
				avatarUrl: avatar != null ? this.driveFileEntityService.getPublicUrl(avatar, 'avatar') : user?.avatarUrl ?? null,
				host: user?.host ?? null,
			};
		});
	}
}
