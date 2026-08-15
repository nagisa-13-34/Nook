/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { RecommendationService } from '@/core/RecommendationService.js';
import { Endpoint } from '@/server/api/endpoint-base.js';

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
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		limit: { type: 'integer', minimum: 1, maximum: 40, default: 20 },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(private recommendationService: RecommendationService) {
		super(meta, paramDef, async (ps, me) => {
			return await this.recommendationService.getRecommendations(me, ps.limit);
		});
	}
}
