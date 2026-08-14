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

function createEndpoint(allowed: boolean) {
	const noteEntityService = {
		pack: vi.fn().mockResolvedValue({ id: 'packed-note' }),
	};
	const noteCreateService = {
		fetchAndCreate: vi.fn().mockResolvedValue({ id: 'note' }),
	};
	const nookAccessService = {
		evaluate: vi.fn().mockResolvedValue({
			allowed,
			permission: 'create_post',
			policyId: allowed ? 'JP_13_15' : null,
			reason: allowed ? 'allowed' : 'denied',
		}),
	};

	return {
		endpoint: new NotesCreateEndpoint(noteEntityService as never, noteCreateService as never, nookAccessService as never),
		noteCreateService,
	};
}

describe('notes/create Nook policy enforcement', () => {
	test('creates a note when the policy allows posting', async () => {
		const { endpoint, noteCreateService } = createEndpoint(true);

		await expect(endpoint.exec({ text: 'hello' }, user, null)).resolves.toEqual({
			createdNote: { id: 'packed-note' },
		});
		expect(noteCreateService.fetchAndCreate).toHaveBeenCalledOnce();
	});

	test('returns the permission error before creating a note when denied', async () => {
		const { endpoint, noteCreateService } = createEndpoint(false);

		await expect(endpoint.exec({ text: 'hello' }, user, null)).rejects.toMatchObject({
			code: meta.errors.restrictedByNookPolicy.code,
			id: meta.errors.restrictedByNookPolicy.id,
			kind: 'permission',
			httpStatusCode: 403,
		});
		expect(noteCreateService.fetchAndCreate).not.toHaveBeenCalled();
	});
});
