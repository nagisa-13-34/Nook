/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import ms from 'ms';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import { DI } from '@/di-symbols.js';
import { MiNookPolicy } from '@/models/NookPolicy.js';
import { MiUser } from '@/models/User.js';
import { MiUserProfile } from '@/models/UserProfile.js';
import { nookUserPolicyContextSchema } from '@/nook/api/NookAdminSchemas.js';
import { nookAgeGroups } from '@/nook/policy/PolicyTypes.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '@/server/api/error.js';
import type { DataSource } from 'typeorm';

export const meta = {
	tags: ['admin', 'nook'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'write:admin:roles',
	limit: {
		duration: ms('1hour'),
		max: 120,
	},

	errors: {
		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: '830ff568-422b-429e-9b84-c00051754b4e',
		},
		localUserRequired: {
			message: 'A local user is required.',
			code: 'LOCAL_USER_REQUIRED',
			id: '499f80c8-482b-4ac4-83d8-ce62bec2957b',
		},
		noSuchPolicy: {
			message: 'No such Nook policy.',
			code: 'NO_SUCH_NOOK_POLICY',
			id: '211cc6f5-ae64-4e3d-8813-0909534e6302',
		},
	},

	res: nookUserPolicyContextSchema,
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		userId: { type: 'string', format: 'misskey:id' },
		country: { type: 'string', nullable: true, pattern: '^[A-Z]{2}$' },
		verifiedAgeGroup: { type: 'string', nullable: true, enum: [null, ...nookAgeGroups] },
		policyId: { type: 'string', nullable: true, minLength: 1, maxLength: 64, pattern: '^[A-Z0-9_*\\-]+$' },
	},
	required: ['userId', 'country', 'verifiedAgeGroup', 'policyId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.db)
		private db: DataSource,

		private moderationLogService: ModerationLogService,
	) {
		super(meta, paramDef, async (ps, me) => {
			return await this.db.transaction(async entityManager => {
				const usersRepository = entityManager.getRepository(MiUser);
				const profilesRepository = entityManager.getRepository(MiUserProfile);
				const policiesRepository = entityManager.getRepository(MiNookPolicy);
				const user = await usersRepository.findOne({
					where: { id: ps.userId },
					select: { id: true, host: true },
				});
				if (user == null) throw new ApiError(meta.errors.noSuchUser);
				if (user.host != null) throw new ApiError(meta.errors.localUserRequired);

				const profile = await profilesRepository.findOne({
					where: { userId: user.id },
					select: {
						userId: true,
						nookCountryCode: true,
						nookVerifiedAgeGroup: true,
						nookPolicyId: true,
					},
				});
				if (profile == null) throw new ApiError(meta.errors.noSuchUser);
				if (ps.policyId != null && !await policiesRepository.existsBy({ id: ps.policyId, enabled: true })) {
					throw new ApiError(meta.errors.noSuchPolicy);
				}

				const before = {
					userId: user.id,
					country: profile.nookCountryCode,
					verifiedAgeGroup: profile.nookVerifiedAgeGroup,
					policyId: profile.nookPolicyId,
				};
				const after = {
					userId: user.id,
					country: ps.country,
					verifiedAgeGroup: ps.verifiedAgeGroup,
					policyId: ps.policyId,
				};

				await profilesRepository.update({ userId: user.id }, {
					nookCountryCode: after.country,
					nookVerifiedAgeGroup: after.verifiedAgeGroup,
					nookPolicyId: after.policyId,
				});
				await this.moderationLogService.log(me, 'updateServerSettings', {
					before: { nookUserPolicyContext: before },
					after: { nookUserPolicyContext: after },
				}, entityManager);

				return after;
			});
		});
	}
}
