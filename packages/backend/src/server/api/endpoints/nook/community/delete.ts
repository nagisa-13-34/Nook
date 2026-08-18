/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['channels'],
	requireCredential: true,
	kind: 'write:channels',
	res: { type: 'object', optional: false, nullable: false, properties: { deleted: { type: 'boolean' } }, required: ['deleted'] },
	errors: {
		forbidden: { message: 'Only the community owner can delete the community.', code: 'FORBIDDEN', id: 'd1307067-e3f8-46da-b942-c618c70f3b24' },
		noSuchCommunity: { message: 'No such community.', code: 'NO_SUCH_COMMUNITY', id: 'f16daaf6-e8db-4a35-acda-e53479334a92' },
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: { communityId: { type: 'string', format: 'misskey:id' } },
	required: ['communityId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(@Inject(DI.db) private db: DataSource) {
		super(meta, paramDef, async (ps, me) => {
			return await this.db.transaction(async manager => {
				const rows = await manager.query<Array<{ userId: string | null }>>('SELECT "userId" FROM "channel" WHERE "id" = $1 FOR UPDATE', [ps.communityId]);
				if (rows.length === 0) throw new ApiError(meta.errors.noSuchCommunity);
				if (rows[0].userId !== me.id) throw new ApiError(meta.errors.forbidden);
				await manager.query('DELETE FROM "channel" WHERE "id" = $1', [ps.communityId]);
				return { deleted: true };
			});
		});
	}
}
