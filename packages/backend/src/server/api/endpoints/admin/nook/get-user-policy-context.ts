/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { UserProfilesRepository, UsersRepository } from '@/models/_.js';
import { nookUserPolicyContextSchema } from '@/nook/api/NookAdminSchemas.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '@/server/api/error.js';

export const meta = {
	tags: ['admin', 'nook'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'read:admin:roles',

	errors: {
		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: '252033f6-115a-4798-983b-8e830ee24513',
		},
		localUserRequired: {
			message: 'A local user is required.',
			code: 'LOCAL_USER_REQUIRED',
			id: 'fa0ebba8-6beb-4f5c-837b-44208e84720b',
		},
	},

	res: nookUserPolicyContextSchema,
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		userId: { type: 'string', format: 'misskey:id' },
	},
	required: ['userId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,
	) {
		super(meta, paramDef, async (ps) => {
			const user = await this.usersRepository.findOne({
				where: { id: ps.userId },
				select: { id: true, host: true },
			});
			if (user == null) throw new ApiError(meta.errors.noSuchUser);
			if (user.host != null) throw new ApiError(meta.errors.localUserRequired);

			const profile = await this.userProfilesRepository.findOne({
				where: { userId: user.id },
				select: {
					userId: true,
					nookCountryCode: true,
					nookVerifiedAgeGroup: true,
					nookPolicyId: true,
				},
			});
			if (profile == null) throw new ApiError(meta.errors.noSuchUser);

			return {
				userId: user.id,
				country: profile.nookCountryCode,
				verifiedAgeGroup: profile.nookVerifiedAgeGroup,
				policyId: profile.nookPolicyId,
			};
		});
	}
}
