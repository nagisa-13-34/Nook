/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Brackets, In } from 'typeorm';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import { ChatService } from '@/core/ChatService.js';
import { ApiError } from '@/server/api/error.js';
import type { ChatRoomMembershipsRepository, FollowingsRepository, UsersRepository } from '@/models/_.js';
import type { MiLocalUser } from '@/models/User.js';
import { NookAccessService, type NookDirectChatPair } from '@/nook/policy/NookAccessService.js';

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

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.followingsRepository)
		private followingsRepository: FollowingsRepository,

		private chatService: ChatService,
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
			const participantIds = [...new Set([room.ownerId, ...memberships.map(membership => membership.userId)])]
				.filter(participantId => participantId !== me.id);

			if (participantIds.length > 0) {
				const [participants, followings] = await Promise.all([
					this.usersRepository.findBy({ id: In(participantIds) }),
					this.followingsRepository.createQueryBuilder('following')
						.select(['following.followerId', 'following.followeeId'])
						.where(new Brackets(qb => {
							qb.where('following.followerId = :meId', { meId: me.id })
								.andWhere('following.followeeId IN (:...participantIds)', { participantIds });
						}))
						.orWhere(new Brackets(qb => {
							qb.where('following.followeeId = :meId', { meId: me.id })
								.andWhere('following.followerId IN (:...participantIds)', { participantIds });
						}))
						.getMany(),
				]);

				if (participants.length !== participantIds.length) {
					throw new ApiError(meta.errors.noSuchRoom);
				}

				const followDirectionCount = new Map<string, number>();
				for (const following of followings) {
					const otherId = following.followerId === me.id ? following.followeeId : following.followerId;
					followDirectionCount.set(otherId, (followDirectionCount.get(otherId) ?? 0) + 1);
				}

				const pairs: NookDirectChatPair[] = participants.flatMap(participant => {
					const participantLocal = participant.host == null ? participant as MiLocalUser : null;
					const isMutual = followDirectionCount.get(participant.id) === 2;
					return participantLocal == null
						? [{ sender: me, recipient: null, isMutual }]
						: [
							{ sender: me, recipient: participantLocal, isMutual },
							{ sender: participantLocal, recipient: me, isMutual },
						];
				});

				const policyEvaluations = await this.nookAccessService.evaluateDirectChatPairs(pairs);
				if (policyEvaluations.some(policyEvaluation =>
					policyEvaluation.sender.some(decision => !decision.allowed) ||
					policyEvaluation.senderTargetSensitive.some(decision => !decision.allowed) ||
					policyEvaluation.recipient?.some(decision => !decision.allowed),
				)) {
					throw new ApiError(meta.errors.restrictedByNookPolicy);
				}
			}

			await this.chatService.joinToRoom(me.id, ps.roomId);
		});
	}
}
