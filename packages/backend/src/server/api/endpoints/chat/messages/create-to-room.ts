/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Brackets, In } from 'typeorm';
import ms from 'ms';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '@/server/api/error.js';
import { ChatService } from '@/core/ChatService.js';
import type { ChatRoomMembershipsRepository, DriveFilesRepository, FollowingsRepository, UsersRepository } from '@/models/_.js';
import type { MiLocalUser } from '@/models/User.js';
import { NookAccessService } from '@/nook/policy/NookAccessService.js';

export const meta = {
	tags: ['chat'],

	requireCredential: true,

	prohibitMoved: true,

	kind: 'write:chat',

	limit: {
		duration: ms('1hour'),
		max: 500,
	},

	res: {
		type: 'object',
		optional: false, nullable: false,
		ref: 'ChatMessageLiteForRoom',
	},

	errors: {
		noSuchRoom: {
			message: 'No such room.',
			code: 'NO_SUCH_ROOM',
			id: '8098520d-2da5-4e8f-8ee1-df78b55a4ec6',
		},

		noSuchFile: {
			message: 'No such file.',
			code: 'NO_SUCH_FILE',
			id: 'b6accbd3-1d7b-4d9f-bdb7-eb185bac06db',
		},

		contentRequired: {
			message: 'Content required. You need to set text or fileId.',
			code: 'CONTENT_REQUIRED',
			id: '340517b7-6d04-42c0-bac1-37ee804e3594',
		},

		chatDisabled: {
			message: 'Chat is currently disabled by the Nook feature flag.',
			code: 'NOOK_CHAT_DISABLED',
			id: '5166bfc4-c95f-40e0-9301-2513cc678da0',
			kind: 'permission',
			httpStatusCode: 403,
		},

		restrictedByNookPolicy: {
			message: 'You are not allowed to send chat messages under the current Nook policy.',
			code: 'RESTRICTED_BY_NOOK_POLICY',
			id: '79200258-b80b-43e9-a6f4-9bc707796185',
			kind: 'permission',
			httpStatusCode: 403,
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		text: { type: 'string', nullable: true, maxLength: 2000 },
		fileId: { type: 'string', format: 'misskey:id' },
		toRoomId: { type: 'string', format: 'misskey:id' },
	},
	required: ['toRoomId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.driveFilesRepository)
		private driveFilesRepository: DriveFilesRepository,

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
			const senderDecision = await this.nookAccessService.evaluate(me, 'send_chat');
			if (!senderDecision.allowed) {
				throw new ApiError(meta.errors.restrictedByNookPolicy);
			}

			const room = await this.chatService.findRoomById(ps.toRoomId);
			if (room == null) {
				throw new ApiError(meta.errors.noSuchRoom);
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

				const policyEvaluations = await this.nookAccessService.evaluateDirectChats(
					me,
					participants.map(participant => ({
						recipient: participant.host == null ? participant as MiLocalUser : null,
						isMutual: followDirectionCount.get(participant.id) === 2,
					})),
				);

				if (policyEvaluations.some(policyEvaluation =>
					policyEvaluation.sender.some(decision => !decision.allowed) ||
					policyEvaluation.senderTargetSensitive.some(decision => !decision.allowed) ||
					policyEvaluation.recipient?.some(decision => !decision.allowed),
				)) {
					throw new ApiError(meta.errors.restrictedByNookPolicy);
				}
			}

			let file = null;
			if (ps.fileId != null) {
				file = await this.driveFilesRepository.findOneBy({
					id: ps.fileId,
					userId: me.id,
				});

				if (file == null) {
					throw new ApiError(meta.errors.noSuchFile);
				}
			}

			if (ps.text == null && file == null) {
				throw new ApiError(meta.errors.contentRequired);
			}

			return await this.chatService.createMessageToRoom(me, room, {
				text: ps.text,
				file: file,
			});
		});
	}
}
