/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

process.env.NODE_ENV = 'test';

import * as assert from 'node:assert';
import { afterEach, beforeAll, describe, test } from 'vitest';
import type { Repository } from 'typeorm';
import { MiDriveFile } from '@/models/DriveFile.js';
import { MiNookFeatureFlag } from '@/models/NookFeatureFlag.js';
import { MiNookPolicy } from '@/models/NookPolicy.js';
import { MiUserProfile } from '@/models/UserProfile.js';
import { nookPermissions, type NookPermissionSet } from '@/nook/policy/PolicyTypes.js';
import { api, castAsError, initTestDb, signup, uploadFile } from '../utils.js';
import type * as misskey from 'misskey-js';

function permissions(overrides: Partial<NookPermissionSet>): NookPermissionSet {
	return Object.fromEntries(nookPermissions.map(permission => [
		permission,
		overrides[permission] ?? false,
	])) as NookPermissionSet;
}

describe('Nook runtime policy enforcement', () => {
	let NookFeatureFlags: Repository<MiNookFeatureFlag>;
	let NookPolicies: Repository<MiNookPolicy>;
	let UserProfiles: Repository<MiUserProfile>;
	let DriveFiles: Repository<MiDriveFile>;
	let alice: misskey.entities.SignupResponse;
	let bob: misskey.entities.SignupResponse;
	const policyIds = ['TEST_IMAGE_DENY', 'TEST_VIDEO_DENY', 'TEST_CHAT_ALLOW', 'TEST_CHAT_DENY', 'TEST_ADULT_ALLOW'];

	beforeAll(async () => {
		const connection = await initTestDb(true);
		NookFeatureFlags = connection.getRepository(MiNookFeatureFlag);
		NookPolicies = connection.getRepository(MiNookPolicy);
		UserProfiles = connection.getRepository(MiUserProfile);
		DriveFiles = connection.getRepository(MiDriveFile);
		alice = await signup({ username: 'nook-policy-alice' });
		bob = await signup({ username: 'nook-policy-bob' });
	}, 1000 * 60 * 2);

	afterEach(async () => {
		await NookFeatureFlags.delete({ name: 'policy_enforcement' });
		await NookPolicies.delete(policyIds);
		await UserProfiles.update({ userId: alice.id }, {
			nookCountryCode: null,
			nookVerifiedAgeGroup: null,
			nookPolicyId: null,
		});
		await UserProfiles.update({ userId: bob.id }, {
			nookCountryCode: null,
			nookVerifiedAgeGroup: null,
			nookPolicyId: null,
		});
	});

	async function enablePolicy(userId: string, id: string, policyPermissions: NookPermissionSet, ageGroup: '13_15' | '18_PLUS' = '13_15'): Promise<void> {
		const now = new Date();
		await NookPolicies.save({
			id,
			createdAt: now,
			updatedAt: now,
			country: 'JP',
			ageGroup,
			accountStates: ['active'],
			permissions: policyPermissions,
			priority: 100,
			enabled: true,
		});
		await UserProfiles.update({ userId }, {
			nookCountryCode: 'JP',
			nookVerifiedAgeGroup: ageGroup,
			nookPolicyId: id,
		});
		await NookFeatureFlags.save({
			name: 'policy_enforcement',
			enabled: true,
			updatedAt: now,
		});
	}

	test('画像権限がない場合は画像付き投稿を拒否する', async () => {
		const upload = await uploadFile(alice, { path: '192.jpg' });
		assert.ok(upload.body);
		await enablePolicy(alice.id, 'TEST_IMAGE_DENY', permissions({ create_post: true }));

		const response = await api('notes/create', { fileIds: [upload.body.id] }, alice);

		assert.strictEqual(response.status, 403);
		assert.strictEqual(castAsError(response.body).error.code, 'RESTRICTED_BY_NOOK_POLICY');
	});

	test('動画権限がない場合は動画付き投稿を拒否する', async () => {
		const upload = await uploadFile(alice, { path: '192.jpg' });
		assert.ok(upload.body);
		await DriveFiles.update({ id: upload.body.id }, { type: 'video/mp4' });
		await enablePolicy(alice.id, 'TEST_VIDEO_DENY', permissions({ create_post: true, create_image_post: true }));

		const response = await api('notes/create', { fileIds: [upload.body.id] }, alice);

		assert.strictEqual(response.status, 403);
		assert.strictEqual(castAsError(response.body).error.code, 'RESTRICTED_BY_NOOK_POLICY');
	});

	test('送信権限がない場合は1対1 Chatを拒否する', async () => {
		await enablePolicy(alice.id, 'TEST_CHAT_DENY', permissions({}));

		const response = await api('chat/messages/create-to-user', { toUserId: bob.id, text: 'hello' }, alice);

		assert.strictEqual(response.status, 403);
		assert.strictEqual(castAsError(response.body).error.code, 'RESTRICTED_BY_NOOK_POLICY');
	});

	test('相互フォローでない相手とのChat権限がない場合は拒否する', async () => {
		await enablePolicy(alice.id, 'TEST_CHAT_DENY', permissions({ send_chat: true }));

		const response = await api('chat/messages/create-to-user', { toUserId: bob.id, text: 'hello' }, alice);

		assert.strictEqual(response.status, 403);
		assert.strictEqual(castAsError(response.body).error.code, 'RESTRICTED_BY_NOOK_POLICY');
	});

	test('保護対象ユーザーに成人とのChat権限がない場合は拒否する', async () => {
		await enablePolicy(alice.id, 'TEST_CHAT_DENY', permissions({ send_chat: true, chat_with_stranger: true }));
		await enablePolicy(bob.id, 'TEST_ADULT_ALLOW', permissions({ receive_chat: true, chat_with_stranger: true }), '18_PLUS');

		const response = await api('chat/messages/create-to-user', { toUserId: bob.id, text: 'hello' }, alice);

		assert.strictEqual(response.status, 400);
		assert.strictEqual(castAsError(response.body).error.code, 'NO_SUCH_USER');
	});

	test('受信者のPolicy状態を送信者へ公開しない', async () => {
		await enablePolicy(alice.id, 'TEST_CHAT_ALLOW', permissions({ send_chat: true, chat_with_stranger: true }));
		await enablePolicy(bob.id, 'TEST_CHAT_DENY', permissions({}));

		const response = await api('chat/messages/create-to-user', { toUserId: bob.id, text: 'hello' }, alice);

		assert.strictEqual(response.status, 400);
		assert.strictEqual(castAsError(response.body).error.code, 'NO_SUCH_USER');
	});

	test('送信権限がない場合はRoom ChatをRoom検索前に拒否する', async () => {
		await enablePolicy(alice.id, 'TEST_CHAT_DENY', permissions({}));

		const response = await api('chat/messages/create-to-room', {
			toRoomId: '000000000000000000000000',
			text: 'hello',
		}, alice);

		assert.strictEqual(response.status, 403);
		assert.strictEqual(castAsError(response.body).error.code, 'RESTRICTED_BY_NOOK_POLICY');
	});
});
