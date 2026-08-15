/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { RecommendationService } from '@/core/RecommendationService.js';
import { NookAccessService } from '@/nook/policy/NookAccessService.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '@/server/api/error.js';

export const meta = {
	tags: ['notes'],
	requireCredential: true,
	kind: 'read:account',
	res: {
		type: 'array', optional: false, nullable: false,
		items: {
			type: 'object', optional: false, nullable: false,
			ref: 'Note',
		},
	},
	errors: {
		recommendationsDisabled: {
			message: 'Recommendations are currently disabled by the Nook feature flag.',
			code: 'NOOK_RECOMMENDATIONS_DISABLED',
			id: 'e98be4f9-ec63-4c29-a8a4-5ef0eef15b87',
			kind: 'permission',
			httpStatusCode: 403,
		},
		restrictedByNookPolicy: {
			message: 'You are not allowed to use recommendations under the current Nook policy.',
			code: 'RESTRICTED_BY_NOOK_POLICY',
			id: '305ec417-5428-4016-b224-92ea48f34957',
			kind: 'permission',
			httpStatusCode: 403,
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		limit: { type: 'integer', minimum: 1, maximum: 400, default: 20 },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private recommendationService: RecommendationService,
		private nookAccessService: NookAccessService,
	) {
		super(meta, paramDef, async (ps, me) => {
			if (!(await this.nookAccessService.isFeatureEnabled('recommendations'))) {
				throw new ApiError(meta.errors.recommendationsDisabled);
			}

			const policyDecision = await this.nookAccessService.evaluate(me, 'recommendation');
			if (!policyDecision.allowed) {
				throw new ApiError(meta.errors.restrictedByNookPolicy);
			}

			return await this.recommendationService.getRecommendations(me, ps.limit);
		});
	}
}
