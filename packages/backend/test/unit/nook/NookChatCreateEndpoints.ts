/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
import type { MiLocalUser } from '@/models/User.js';
import CreateToRoomEndpoint, { meta as roomMeta } from '@/server/api/endpoints/chat/messages/create-to-room.js';
import CreateToUserEndpoint, { meta as userMeta } from '@/server/api/endpoints/chat/messages/create-to-user.js';

const sender = {
	id: 'sender',
	host: null,
	isDeleted: false,
	isSuspended: false,
} as MiLocalUser;

const recipient = {
	id: 'recipient',
	host: null,
	isDeleted: false,
	isSuspended: false,
} as MiLocalUser;

function decision(permission: string, allowed: boolean) {
	return {
		allowed,
		permission,
		policyId: allowed ? 'JP_13_15' : null,
		reason: allowed ? 'allowed' : 'denied',
	};
}

describe('chat create endpoints Nook policy enforcement', () => {
	test('does not create a direct message when the sender cannot send chat', async () => {
		const chatService = {
			checkChatAvailability: vi.fn().mockResolvedValue(undefined),
			createMessageToUser: vi.fn(),
		};
		const nookAccessService = {
			evaluate: vi.fn().mockResolvedValue(decision('send_chat', false)),
		};
		const endpoint = new CreateToUserEndpoint(
			{ findOneBy: vi.fn() } as never,
			{ getUser: vi.fn() } as never,
			chatService as never,
			nookAccessService as never,
		);

		await expect(endpoint.exec({ toUserId: recipient.id, text: 'hello' }, sender, null)).rejects.toMatchObject({
			code: userMeta.errors.restrictedByNookPolicy.code,
			httpStatusCode: 403,
		});
		expect(chatService.createMessageToUser).not.toHaveBeenCalled();
	});

	test('does not create a direct message when the local recipient cannot receive chat', async () => {
		const chatService = {
			checkChatAvailability: vi.fn().mockResolvedValue(undefined),
			createMessageToUser: vi.fn(),
		};
		const nookAccessService = {
			evaluate: vi.fn()
				.mockResolvedValueOnce(decision('send_chat', true))
				.mockResolvedValueOnce(decision('receive_chat', false)),
		};
		const endpoint = new CreateToUserEndpoint(
			{ findOneBy: vi.fn() } as never,
			{ getUser: vi.fn().mockResolvedValue(recipient) } as never,
			chatService as never,
			nookAccessService as never,
		);

		await expect(endpoint.exec({ toUserId: recipient.id, text: 'hello' }, sender, null)).rejects.toMatchObject({
			code: userMeta.errors.noSuchUser.code,
		});
		expect(nookAccessService.evaluate).toHaveBeenNthCalledWith(2, recipient, 'receive_chat');
		expect(chatService.createMessageToUser).not.toHaveBeenCalled();
	});

	test('creates a direct message when both local policies allow it', async () => {
		const packedMessage = { id: 'message' };
		const chatService = {
			checkChatAvailability: vi.fn().mockResolvedValue(undefined),
			createMessageToUser: vi.fn().mockResolvedValue(packedMessage),
		};
		const nookAccessService = {
			evaluate: vi.fn()
				.mockResolvedValueOnce(decision('send_chat', true))
				.mockResolvedValueOnce(decision('receive_chat', true)),
		};
		const endpoint = new CreateToUserEndpoint(
			{ findOneBy: vi.fn() } as never,
			{ getUser: vi.fn().mockResolvedValue(recipient) } as never,
			chatService as never,
			nookAccessService as never,
		);

		await expect(endpoint.exec({ toUserId: recipient.id, text: 'hello' }, sender, null)).resolves.toEqual(packedMessage);
		expect(chatService.createMessageToUser).toHaveBeenCalledOnce();
	});

	test('skips recipient policy evaluation for a remote recipient', async () => {
		const remoteRecipient = { ...recipient, host: 'remote.example' };
		const chatService = {
			checkChatAvailability: vi.fn().mockResolvedValue(undefined),
			createMessageToUser: vi.fn().mockResolvedValue({ id: 'message' }),
		};
		const nookAccessService = {
			evaluate: vi.fn().mockResolvedValue(decision('send_chat', true)),
		};
		const endpoint = new CreateToUserEndpoint(
			{ findOneBy: vi.fn() } as never,
			{ getUser: vi.fn().mockResolvedValue(remoteRecipient) } as never,
			chatService as never,
			nookAccessService as never,
		);

		await endpoint.exec({ toUserId: remoteRecipient.id, text: 'hello' }, sender, null);
		expect(nookAccessService.evaluate).toHaveBeenCalledTimes(1);
		expect(nookAccessService.evaluate).toHaveBeenCalledWith(sender, 'send_chat');
	});

	test('does not create a room message when the sender cannot send chat', async () => {
		const chatService = {
			checkChatAvailability: vi.fn().mockResolvedValue(undefined),
			findRoomById: vi.fn(),
			createMessageToRoom: vi.fn(),
		};
		const endpoint = new CreateToRoomEndpoint(
			{ findOneBy: vi.fn() } as never,
			{} as never,
			chatService as never,
			{ evaluate: vi.fn().mockResolvedValue(decision('send_chat', false)) } as never,
		);

		await expect(endpoint.exec({ toRoomId: 'room', text: 'hello' }, sender, null)).rejects.toMatchObject({
			code: roomMeta.errors.restrictedByNookPolicy.code,
			httpStatusCode: 403,
		});
		expect(chatService.findRoomById).not.toHaveBeenCalled();
		expect(chatService.createMessageToRoom).not.toHaveBeenCalled();
	});

	test('creates a room message when the sender policy allows it', async () => {
		const room = { id: 'room' };
		const packedMessage = { id: 'message' };
		const chatService = {
			checkChatAvailability: vi.fn().mockResolvedValue(undefined),
			findRoomById: vi.fn().mockResolvedValue(room),
			createMessageToRoom: vi.fn().mockResolvedValue(packedMessage),
		};
		const endpoint = new CreateToRoomEndpoint(
			{ findOneBy: vi.fn() } as never,
			{} as never,
			chatService as never,
			{ evaluate: vi.fn().mockResolvedValue(decision('send_chat', true)) } as never,
		);

		await expect(endpoint.exec({ toRoomId: 'room', text: 'hello' }, sender, null)).resolves.toEqual(packedMessage);
		expect(chatService.createMessageToRoom).toHaveBeenCalledOnce();
	});
});
