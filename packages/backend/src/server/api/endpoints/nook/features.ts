/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { NookAccessService } from '@/nook/policy/NookAccessService.js';
import { Endpoint } from '@/server/api/endpoint-base.js';

export const meta = {
	tags: ['meta'],
	requireCredential: false,
	res: {
		type: 'object', optional: false, nullable: false,
		properties: {
			community: { type: 'boolean' },
			voiceCall: { type: 'boolean' },
		},
		required: ['community', 'voiceCall'],
	},
} as const;

export const paramDef = { type: 'object', properties: {} } as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(private nookAccessService: NookAccessService) {
		super(meta, paramDef, async () => {
			const [community, voiceCall] = await Promise.all([
				this.nookAccessService.isFeatureEnabled('community'),
				this.nookAccessService.isFeatureEnabled('voice_call'),
			]);
			return { community, voiceCall };
		});
	}
}
