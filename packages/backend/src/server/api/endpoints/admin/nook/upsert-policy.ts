/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import { DI } from '@/di-symbols.js';
import { MiNookPolicy } from '@/models/NookPolicy.js';
import { nookAccountStates, nookAgeGroups, nookPermissions } from '@/nook/policy/PolicyTypes.js';
import { nookPermissionsParamSchema, nookPolicySchema } from '@/nook/api/NookAdminSchemas.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { DataSource } from 'typeorm';

export const meta = {
	tags: ['admin', 'nook'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'write:admin:roles',

	res: nookPolicySchema,
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		id: { type: 'string', minLength: 1, maxLength: 64, pattern: '^[A-Z0-9_*\\-]+$' },
		country: { type: 'string', pattern: '^(\\*|[A-Z]{2})$' },
		ageGroup: { type: 'string', enum: nookAgeGroups },
		accountStates: {
			type: 'array',
			minItems: 1,
			uniqueItems: true,
			items: { type: 'string', enum: nookAccountStates },
		},
		permissions: nookPermissionsParamSchema,
		priority: { type: 'integer', minimum: -100000, maximum: 100000 },
		enabled: { type: 'boolean' },
	},
	required: ['id', 'country', 'ageGroup', 'accountStates', 'permissions', 'priority', 'enabled'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.db)
		private db: DataSource,

		private moderationLogService: ModerationLogService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const policy = await this.db.transaction(async entityManager => {
				const repository = entityManager.getRepository(MiNookPolicy);
				const before = await repository.findOneBy({ id: ps.id });
				const now = new Date();
				const saved = await repository.save({
					id: ps.id,
					country: ps.country,
					ageGroup: ps.ageGroup,
					accountStates: [...ps.accountStates],
					permissions: Object.fromEntries(nookPermissions.map(permission => [permission, ps.permissions[permission]])),
					priority: ps.priority,
					enabled: ps.enabled,
					createdAt: before?.createdAt ?? now,
					updatedAt: now,
				});

				await this.moderationLogService.log(me, 'updateServerSettings', {
					before: before == null ? null : { nookPolicy: before },
					after: { nookPolicy: saved },
				}, entityManager);

				return saved;
			});

			return {
				...policy,
				createdAt: policy.createdAt.toISOString(),
				updatedAt: policy.updatedAt.toISOString(),
			};
		});
	}
}
