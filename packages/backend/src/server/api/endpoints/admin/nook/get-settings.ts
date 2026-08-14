/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { NookFeatureFlagsRepository, NookPoliciesRepository } from '@/models/_.js';
import { defaultNookFeatureFlags, nookFeatureNames } from '@/nook/feature-flags/NookFeatureFlags.js';
import { nookFeatureFlagSchema, nookPolicySchema } from '@/nook/api/NookAdminSchemas.js';
import { Endpoint } from '@/server/api/endpoint-base.js';

export const meta = {
	tags: ['admin', 'nook'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'read:admin:meta',

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			policies: {
				type: 'array',
				optional: false, nullable: false,
				items: nookPolicySchema,
			},
			featureFlags: {
				type: 'array',
				optional: false, nullable: false,
				items: nookFeatureFlagSchema,
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.nookPoliciesRepository)
		private nookPoliciesRepository: NookPoliciesRepository,

		@Inject(DI.nookFeatureFlagsRepository)
		private nookFeatureFlagsRepository: NookFeatureFlagsRepository,
	) {
		super(meta, paramDef, async () => {
			const [policies, storedFeatureFlags] = await Promise.all([
				this.nookPoliciesRepository.find({ order: { priority: 'DESC', id: 'ASC' } }),
				this.nookFeatureFlagsRepository.find(),
			]);
			const storedFeatureFlagMap = new Map(storedFeatureFlags.map(flag => [flag.name, flag]));

			return {
				policies: policies.map(policy => ({
					...policy,
					createdAt: policy.createdAt.toISOString(),
					updatedAt: policy.updatedAt.toISOString(),
				})),
				featureFlags: nookFeatureNames.map(name => {
					const stored = storedFeatureFlagMap.get(name);
					return {
						name,
						enabled: stored?.enabled ?? defaultNookFeatureFlags[name],
						updatedAt: stored?.updatedAt.toISOString() ?? null,
					};
				}),
			};
		});
	}
}
