/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { requireNookCommunityMember, NookCommunityAccessError } from '@/nook/community/access.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['channels'],
	requireCredential: true,
	kind: 'write:channels',
	errors: {
		forbidden: { message: 'You must be an active community member.', code: 'FORBIDDEN', id: 'ed83b027-9c98-4a1e-a209-5dc50eeb696a' },
		noSuchAvatar: { message: 'No such avatar file.', code: 'NO_SUCH_AVATAR', id: 'daf2fe13-e92f-4c25-ad92-5321d4450de4' },
		avatarNotAnImage: { message: 'The selected avatar is not an image.', code: 'AVATAR_NOT_AN_IMAGE', id: 'dcb102fc-ec31-4532-a609-343819061d22' },
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		communityId: { type: 'string', format: 'misskey:id' },
		nickname: { type: 'string', maxLength: 64, nullable: true },
		avatarId: { type: 'string', format: 'misskey:id', nullable: true },
	},
	required: ['communityId', 'nickname', 'avatarId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(@Inject(DI.db) private db: DataSource) {
		super(meta, paramDef, async (ps, me) => {
			let membership;
			try {
				membership = await requireNookCommunityMember(this.db, ps.communityId, me.id);
			} catch (error) {
				if (error instanceof NookCommunityAccessError) throw new ApiError(meta.errors.forbidden);
				throw error;
			}

			if (ps.avatarId != null) {
				const files = await this.db.query<Array<{ id: string; userId: string | null; type: string }>>(
					'SELECT "id", "userId", "type" FROM "drive_file" WHERE "id" = $1 LIMIT 1',
					[ps.avatarId],
				);
				const avatar = files[0];
				if (avatar == null || avatar.userId !== me.id) throw new ApiError(meta.errors.noSuchAvatar);
				if (!avatar.type.startsWith('image/')) throw new ApiError(meta.errors.avatarNotAnImage);
			}

			const nickname = ps.nickname?.trim() || null;
			await this.db.query(
				`INSERT INTO "nook_community_member" ("communityId", "userId", "baseRole", "state", "nickname", "avatarId")
				 VALUES ($1, $2, $3, 'active', $4, $5)
				 ON CONFLICT ("communityId", "userId") DO UPDATE SET
				 "nickname" = EXCLUDED."nickname", "avatarId" = EXCLUDED."avatarId"`,
				[ps.communityId, me.id, membership.baseRole, nickname, ps.avatarId],
			);
		});
	}
}
