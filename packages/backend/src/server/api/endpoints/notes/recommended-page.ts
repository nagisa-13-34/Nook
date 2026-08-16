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
		type: 'object', optional: false, nullable: false,
		properties: {
			notes: {
				type: 'array', optional: false, nullable: false,
				items: {
					type: 'object', optional: false, nullable: false,
					ref: 'Note',
				},
			},
			cursor: { type: 'string', optional: false, nullable: true },
		},
		required: ['notes', 'cursor'],
	},
	errors: {
		recommendationsDisabled: {
			message: 'Recommendations are currently disabled by the Nook feature flag.',
			code: 'NOOK_RECOMMENDATIONS_DISABLED',
			id: '1e2a4587-c187-4293-84d4-6b6022af45cf',
			kind: 'permission',
			httpStatusCode: 403,
		},
		restrictedByNookPolicy: {
			message: 'You are not allowed to use recommendations under the current Nook policy.',
			code: 'RESTRICTED_BY_NOOK_POLICY',
			id: '81f9d9e5-45fb-475b-b17b-c3414f550852',
			kind: 'permission',
			httpStatusCode: 403,
		},
		invalidCursor: {
			message: 'The recommendation cursor is invalid or has expired.',
			code: 'INVALID_RECOMMENDATION_CURSOR',
			id: '435ec64f-3716-4367-bcb0-5831ddf45ebf',
			httpStatusCode: 400,
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		limit: { type: 'integer', minimum: 1, maximum: 40, default: 20 },
		cursor: { type: 'string', minLength: 1, maxLength: 64 },
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

			const page = await this.recommendationService.getRecommendationPage(me, ps.limit, ps.cursor);
			if (page == null) {
				throw new ApiError(meta.errors.invalidCursor);
			}
			return page;
		});
	}
}
