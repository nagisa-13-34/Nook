/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import { DI } from '@/di-symbols.js';
import { MiNookFeatureFlag } from '@/models/NookFeatureFlag.js';
import { defaultNookFeatureFlags, nookFeatureNames } from '@/nook/feature-flags/NookFeatureFlags.js';
import { nookUpdatedFeatureFlagSchema } from '@/nook/api/NookAdminSchemas.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { DataSource } from 'typeorm';

export const meta = {
	tags: ['admin', 'nook'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'write:admin:meta',

	res: nookUpdatedFeatureFlagSchema,
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		name: { type: 'string', enum: nookFeatureNames },
		enabled: { type: 'boolean' },
	},
	required: ['name', 'enabled'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.db)
		private db: DataSource,

		private moderationLogService: ModerationLogService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const featureFlag = await this.db.transaction(async entityManager => {
				const repository = entityManager.getRepository(MiNookFeatureFlag);
				const before = await repository.findOneBy({ name: ps.name });
				const saved = await repository.save({
					name: ps.name,
					enabled: ps.enabled,
					updatedAt: new Date(),
				});

				await this.moderationLogService.log(me, 'updateServerSettings', {
					before: {
						nookFeatureFlag: {
							name: ps.name,
							enabled: before?.enabled ?? defaultNookFeatureFlags[ps.name],
						},
					},
					after: { nookFeatureFlag: saved },
				}, entityManager);

				return saved;
			});

			return {
				...featureFlag,
				updatedAt: featureFlag.updatedAt.toISOString(),
			};
		});
	}
}
