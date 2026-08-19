/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { setNookEventRsvp } from '@/nook/community/events.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['channels'],
	requireCredential: true,
	kind: 'write:channels',
	errors: {
		eventUnavailable: {
			message: 'The event is unavailable.',
			code: 'EVENT_UNAVAILABLE',
			id: '110c81eb-70c4-4a10-919f-d6731011fbf9',
		},
		eventFull: {
			message: 'The event is full.',
			code: 'EVENT_FULL',
			id: 'fbe00be9-174c-47ba-8e24-1db862cd3041',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		eventId: { type: 'string', format: 'misskey:id' },
		response: { type: 'string', enum: ['going', 'interested', 'not_going'] },
	},
	required: ['eventId', 'response'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(@Inject(DI.db) private db: DataSource) {
		super(meta, paramDef, async (ps, me) => {
			try {
				await setNookEventRsvp(this.db, ps.eventId, me.id, ps.response);
			} catch (error) {
				if (error instanceof Error && error.message === 'EVENT_FULL') throw new ApiError(meta.errors.eventFull);
				if (error instanceof Error && error.message === 'EVENT_UNAVAILABLE') throw new ApiError(meta.errors.eventUnavailable);
				throw error;
			}
		});
	}
}
