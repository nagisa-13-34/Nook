/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
import ChatRoomJoinEndpoint from '@/server/api/endpoints/chat/rooms/join.js';
import type { MiLocalUser } from '@/models/User.js';

function localUser(id: string): MiLocalUser {
	return {
		id,
		host: null,
		isDeleted: false,
		isSuspended: false,
	} as MiLocalUser;
}

function allowed(permission: string) {
	return { allowed: true, permission, policyId: 'policy', reason: 'allowed' as const };
}

function denied(permission: string) {
	return { allowed: false, permission, policyId: 'policy', reason: 'denied' as const };
}

function createQueryBuilder(followings: readonly { followerId: string; followeeId: string }[]) {
	const builder = {
		select: vi.fn(),
		where: vi.fn(),
		orWhere: vi.fn(),
		getMany: vi.fn().mockResolvedValue(followings),
	};
	builder.select.mockReturnValue(builder);
	builder.where.mockReturnValue(builder);
	builder.orWhere.mockReturnValue(builder);
	return builder;
}

describe('chat/rooms/join Nook policy', () => {
	test('rejects joining when only the reverse local pair is denied', async () => {
		const me = localUser('me');
		const participant = localUser('participant');
		const chatService = {
			checkChatAvailability: vi.fn().mockResolvedValue(undefined),
			findRoomById: vi.fn().mockResolvedValue({ id: 'room', ownerId: participant.id }),
			joinToRoom: vi.fn().mockResolvedValue(undefined),
		};
		const chatRoomMembershipsRepository = {
			findBy: vi.fn().mockResolvedValue([]),
		};
		const usersRepository = {
			findBy: vi.fn().mockResolvedValue([participant]),
		};
		const queryBuilder = createQueryBuilder([
			{ followerId: me.id, followeeId: participant.id },
			{ followerId: participant.id, followeeId: me.id },
		]);
		const followingsRepository = {
			createQueryBuilder: vi.fn().mockReturnValue(queryBuilder),
		};
		const nookAccessService = {
			isFeatureEnabled: vi.fn().mockResolvedValue(true),
			evaluate: vi.fn().mockResolvedValue(allowed('receive_chat')),
			evaluateDirectChatPairs: vi.fn().mockResolvedValue([
				{ sender: [allowed('send_chat')], senderTargetSensitive: [], recipient: [allowed('receive_chat')] },
				{ sender: [denied('send_chat')], senderTargetSensitive: [], recipient: [allowed('receive_chat')] },
			]),
		};
		const endpoint = new ChatRoomJoinEndpoint(
			chatRoomMembershipsRepository as any,
			usersRepository as any,
			followingsRepository as any,
			chatService as any,
			nookAccessService as any,
		);

		await expect(endpoint.exec({ roomId: 'room' }, me, null)).rejects.toMatchObject({
			code: 'RESTRICTED_BY_NOOK_POLICY',
		});
		expect(nookAccessService.evaluateDirectChatPairs).toHaveBeenCalledWith([
			{ sender: me, recipient: participant, isMutual: true },
			{ sender: participant, recipient: me, isMutual: true },
		]);
		expect(chatService.joinToRoom).not.toHaveBeenCalled();
	});

	test('represents a remote participant as a one-way unknown recipient pair', async () => {
		const me = localUser('me');
		const remoteParticipant = { ...localUser('remote'), host: 'remote.example' };
		const chatService = {
			checkChatAvailability: vi.fn().mockResolvedValue(undefined),
			findRoomById: vi.fn().mockResolvedValue({ id: 'room', ownerId: remoteParticipant.id }),
			joinToRoom: vi.fn().mockResolvedValue(undefined),
		};
		const chatRoomMembershipsRepository = {
			findBy: vi.fn().mockResolvedValue([]),
		};
		const usersRepository = {
			findBy: vi.fn().mockResolvedValue([remoteParticipant]),
		};
		const followingsRepository = {
			createQueryBuilder: vi.fn().mockReturnValue(createQueryBuilder([])),
		};
		const nookAccessService = {
			isFeatureEnabled: vi.fn().mockResolvedValue(true),
			evaluate: vi.fn().mockResolvedValue(allowed('receive_chat')),
			evaluateDirectChatPairs: vi.fn().mockResolvedValue([
				{ sender: [allowed('send_chat'), allowed('chat_with_stranger')], senderTargetSensitive: [], recipient: null },
			]),
		};
		const endpoint = new ChatRoomJoinEndpoint(
			chatRoomMembershipsRepository as any,
			usersRepository as any,
			followingsRepository as any,
			chatService as any,
			nookAccessService as any,
		);

		await endpoint.exec({ roomId: 'room' }, me, null);

		expect(nookAccessService.evaluateDirectChatPairs).toHaveBeenCalledWith([
			{ sender: me, recipient: null, isMutual: false },
		]);
		expect(chatService.joinToRoom).toHaveBeenCalledWith(me.id, 'room');
	});
});
