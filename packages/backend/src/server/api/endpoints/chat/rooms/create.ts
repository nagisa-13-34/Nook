/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import ms from 'ms';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '@/server/api/error.js';
import { ChatService } from '@/core/ChatService.js';
import { ChatEntityService } from '@/core/entities/ChatEntityService.js';
import { NookAccessService } from '@/nook/policy/NookAccessService.js';

export const meta = {
	tags: ['chat'],

	requireCredential: true,

	prohibitMoved: true,

	kind: 'write:chat',

	limit: {
		duration: ms('1day'),
		max: 10,
	},

	res: {
		type: 'object',
		optional: false, nullable: false,
		ref: 'ChatRoom',
	},

	errors: {
		chatDisabled: {
			message: 'Chat is currently disabled by the Nook feature flag.',
			code: 'NOOK_CHAT_DISABLED',
			id: 'bbbe5c04-f3e7-4973-807b-46efc34ddd6f',
			kind: 'permission',
			httpStatusCode: 403,
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		name: { type: 'string', maxLength: 256 },
		description: { type: 'string', maxLength: 1024 },
	},
	required: ['name'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private chatService: ChatService,
		private chatEntityService: ChatEntityService,
		private nookAccessService: NookAccessService,
	) {
		super(meta, paramDef, async (ps, me) => {
			if (!(await this.nookAccessService.isFeatureEnabled('chat'))) {
				throw new ApiError(meta.errors.chatDisabled);
			}
			await this.chatService.checkChatAvailability(me.id, 'write');

			const room = await this.chatService.createRoom(me, {
				name: ps.name,
				description: ps.description ?? '',
			});
			return await this.chatEntityService.packRoom(room);
		});
	}
}
