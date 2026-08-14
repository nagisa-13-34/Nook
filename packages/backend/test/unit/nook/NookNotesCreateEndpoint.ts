/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
import type { MiLocalUser } from '@/models/User.js';
import NotesCreateEndpoint, { meta } from '@/server/api/endpoints/notes/create.js';

const user = {
	id: 'user',
	isDeleted: false,
	isSuspended: false,
} as MiLocalUser;

function createEndpoint(options: {
	allowedPermissions?: readonly string[];
	files?: { id: string; type: string }[];
} = {}) {
	const allowedPermissions = options.allowedPermissions ?? ['create_post'];
	const driveFilesRepository = {
		find: vi.fn().mockResolvedValue(options.files ?? []),
	};
	const noteEntityService = {
		pack: vi.fn().mockResolvedValue({ id: 'packed-note' }),
	};
	const noteCreateService = {
		fetchAndCreate: vi.fn().mockResolvedValue({ id: 'note' }),
	};
	const nookAccessService = {
		evaluateMany: vi.fn().mockImplementation(async (_user, permissions: string[]) => permissions.map(permission => ({
			allowed: allowedPermissions.includes(permission),
			permission,
			policyId: allowedPermissions.includes(permission) ? 'JP_13_15' : null,
			reason: allowedPermissions.includes(permission) ? 'allowed' : 'denied',
		}))),
	};

	return {
		endpoint: new NotesCreateEndpoint(driveFilesRepository as never, noteEntityService as never, noteCreateService as never, nookAccessService as never),
		noteCreateService,
		nookAccessService,
	};
}

describe('notes/create Nook policy enforcement', () => {
	test('creates a note when the policy allows posting', async () => {
		const { endpoint, noteCreateService } = createEndpoint();

		await expect(endpoint.exec({ text: 'hello' }, user, null)).resolves.toEqual({
			createdNote: { id: 'packed-note' },
		});
		expect(noteCreateService.fetchAndCreate).toHaveBeenCalledOnce();
	});

	test('returns the permission error before creating a note when denied', async () => {
		const { endpoint, noteCreateService } = createEndpoint({ allowedPermissions: [] });

		await expect(endpoint.exec({ text: 'hello' }, user, null)).rejects.toMatchObject({
			code: meta.errors.restrictedByNookPolicy.code,
			id: meta.errors.restrictedByNookPolicy.id,
			kind: 'permission',
			httpStatusCode: 403,
		});
		expect(noteCreateService.fetchAndCreate).not.toHaveBeenCalled();
	});

	test('requires the image post permission for an attached image', async () => {
		const imageFileId = '000000000000000000000001';
		const { endpoint, noteCreateService, nookAccessService } = createEndpoint({
			files: [{ id: imageFileId, type: 'image/png' }],
		});

		await expect(endpoint.exec({ fileIds: [imageFileId] }, user, null)).rejects.toMatchObject({
			code: meta.errors.restrictedByNookPolicy.code,
		});
		expect(nookAccessService.evaluateMany).toHaveBeenCalledWith(user, ['create_post', 'create_image_post']);
		expect(noteCreateService.fetchAndCreate).not.toHaveBeenCalled();
	});

	test('requires both media permissions for mixed image and video attachments', async () => {
		const imageFileId = '000000000000000000000001';
		const videoFileId = '000000000000000000000002';
		const { endpoint, noteCreateService, nookAccessService } = createEndpoint({
			allowedPermissions: ['create_post', 'create_image_post'],
			files: [
				{ id: imageFileId, type: 'image/jpeg' },
				{ id: videoFileId, type: 'video/mp4' },
			],
		});

		await expect(endpoint.exec({ fileIds: [imageFileId, videoFileId] }, user, null)).rejects.toMatchObject({
			code: meta.errors.restrictedByNookPolicy.code,
		});
		expect(nookAccessService.evaluateMany).toHaveBeenCalledWith(user, ['create_post', 'create_image_post', 'create_video_post']);
		expect(noteCreateService.fetchAndCreate).not.toHaveBeenCalled();
	});
});
