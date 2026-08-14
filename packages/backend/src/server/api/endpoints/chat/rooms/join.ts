/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { GetterService } from '@/server/api/GetterService.js';
import { DI } from '@/di-symbols.js';
import { ChatService } from '@/core/ChatService.js';
import { UserFollowingService } from '@/core/UserFollowingService.js';
import { ApiError } from '@/server/api/error.js';
import type { ChatRoomMembershipsRepository } from '@/models/_.js';
import type { MiLocalUser } from '@/models/User.js';
import { NookAccessService } from '@/nook/policy/NookAccessService.js';

export const meta = {
	tags: ['chat'],

	requireCredential: true,

	kind: 'write:chat',

	errors: {
		noSuchRoom: {
			message: 'No such room.',
			code: 'NO_SUCH_ROOM',
			id: '84416476-5ce8-4a2c-b568-9569f1b10733',
		},
		chatDisabled: {
			message: 'Chat is currently disabled by the Nook feature flag.',
			code: 'NOOK_CHAT_DISABLED',
			id: '1dbde4e8-363d-4507-8c90-b3da6932427e',
			kind: 'permission',
			httpStatusCode: 403,
		},
		restrictedByNookPolicy: {
			message: 'You cannot join this room under the current Nook chat policy.',
			code: 'RESTRICTED_BY_NOOK_POLICY',
			id: '96b2b0c9-522e-489c-b59a-c0df7018afbd',
			kind: 'permission',
			httpStatusCode: 403,
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		roomId: { type: 'string', format: 'misskey:id' },
	},
	required: ['roomId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.chatRoomMembershipsRepository)
		private chatRoomMembershipsRepository: ChatRoomMembershipsRepository,

		private chatService: ChatService,
		private getterService: GetterService,
		private userFollowingService: UserFollowingService,
		private nookAccessService: NookAccessService,
	) {
		super(meta, paramDef, async (ps, me) => {
			if (!(await this.nookAccessService.isFeatureEnabled('chat'))) {
				throw new ApiError(meta.errors.chatDisabled);
			}
			await this.chatService.checkChatAvailability(me.id, 'write');

			const room = await this.chatService.findRoomById(ps.roomId);
			if (room == null) {
				throw new ApiError(meta.errors.noSuchRoom);
			}

			const receiveDecision = await this.nookAccessService.evaluate(me, 'receive_chat');
			if (!receiveDecision.allowed) {
				throw new ApiError(meta.errors.restrictedByNookPolicy);
			}

			const memberships = await this.chatRoomMembershipsRepository.findBy({ roomId: room.id });
			const participantIds = [room.ownerId, ...memberships.map(membership => membership.userId)];

			for (const participantId of participantIds) {
				if (participantId === me.id) continue;

				const participant = await this.getterService.getUser(participantId);
				const resolveIsMutual = () => this.userFollowingService.isMutual(me.id, participant.id);
				const participantLocal = participant.host == null ? participant as MiLocalUser : null;

				const outgoing = await this.nookAccessService.evaluateDirectChat(me, participantLocal, resolveIsMutual);
				if (
					outgoing.sender.some(decision => !decision.allowed) ||
					outgoing.senderTargetSensitive.some(decision => !decision.allowed) ||
					outgoing.recipient?.some(decision => !decision.allowed)
				) {
					throw new ApiError(meta.errors.restrictedByNookPolicy);
				}

				if (participantLocal != null) {
					const incoming = await this.nookAccessService.evaluateDirectChat(
						participantLocal,
						me,
						resolveIsMutual,
					);
					if (
						incoming.sender.some(decision => !decision.allowed) ||
						incoming.senderTargetSensitive.some(decision => !decision.allowed) ||
						incoming.recipient?.some(decision => !decision.allowed)
					) {
						throw new ApiError(meta.errors.restrictedByNookPolicy);
					}
				}
			}

			await this.chatService.joinToRoom(me.id, ps.roomId);
		});
	}
}
