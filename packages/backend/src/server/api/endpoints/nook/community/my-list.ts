/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { Endpoint } from '@/server/api/endpoint-base.js';

export const meta = {
	tags: ['channels'],
	requireCredential: true,
	kind: 'read:channels',
	res: {
		type: 'array', optional: false, nullable: false,
		items: {
			type: 'object', optional: false, nullable: false,
			properties: {
				communityId: { type: 'string' },
				name: { type: 'string' },
			},
			required: ['communityId', 'name'],
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
	constructor(@Inject(DI.db) private db: DataSource) {
		super(meta, paramDef, async (_ps, me) => {
		return await this.db.query<Array<{ communityId: string; name: string }>>(
			`SELECT DISTINCT c."id" AS "communityId", c."name" AS "name"
			 FROM "channel" c
			 LEFT JOIN "nook_community_member" m
			   ON m."communityId" = c."id"
			  AND m."userId" = $1
			  AND m."state" = 'active'
			 WHERE m."userId" IS NOT NULL OR c."userId" = $1
			 ORDER BY c."name" ASC, c."id" ASC`,
			[me.id],
		);
	});
	}
}
