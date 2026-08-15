/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
import { MiUserProfile } from '@/models/UserProfile.js';
import { SignupService } from '@/core/SignupService.js';
import { NookLikesPrivateByDefault1786694400000 } from '../../migration/1786694400000-NookLikesPrivateByDefault.js';

vi.mock('node:crypto', () => ({
	generateKeyPair: vi.fn((_type: string, _options: unknown, callback: (error: Error | null, publicKey: string, privateKey: string) => void) => callback(null, 'public-key', 'private-key')),
	randomBytes: vi.fn((size: number) => Buffer.alloc(size, 1)),
}));

describe('Nook likes privacy', () => {
	test('migration changes only the publicReactions database default', async () => {
		const queryRunner = { query: vi.fn().mockResolvedValue(undefined) };
		const migration = new NookLikesPrivateByDefault1786694400000();

		await migration.up(queryRunner);
		expect(queryRunner.query).toHaveBeenCalledWith('ALTER TABLE "user_profile" ALTER COLUMN "publicReactions" SET DEFAULT false');

		queryRunner.query.mockClear();
		await migration.down(queryRunner);
		expect(queryRunner.query).toHaveBeenCalledWith('ALTER TABLE "user_profile" ALTER COLUMN "publicReactions" SET DEFAULT true');
	});

	test('new local accounts are saved with reactions private', async () => {
		const saved: unknown[] = [];
		const entityManager = {
			findOneBy: vi.fn().mockResolvedValue(null),
			save: vi.fn().mockImplementation(async (entity: unknown) => {
				saved.push(entity);
				return entity;
			}),
		};
		const db = {
			transaction: vi.fn().mockImplementation(async (callback: (manager: typeof entityManager) => Promise<unknown>) => callback(entityManager)),
		};
		const meta = {
			rootUserId: 'root',
			preservedUsernames: [],
			prohibitedWordsForNameOfUser: [],
		};
		const usersRepository = { exists: vi.fn().mockResolvedValue(false) };
		const usedUsernamesRepository = { exists: vi.fn().mockResolvedValue(false) };
		const utilityService = {
			toPunyNullable: vi.fn().mockReturnValue(null),
			isKeyWordIncluded: vi.fn().mockReturnValue(false),
		};
		const userService = { notifySystemWebhook: vi.fn() };
		const userEntityService = {
			validateLocalUsername: vi.fn().mockReturnValue(true),
			validatePassword: vi.fn().mockReturnValue(true),
		};
		const idService = { gen: vi.fn().mockReturnValue('user-id') };
		const metaService = { update: vi.fn() };
		const usersChart = { update: vi.fn() };
		const service = new SignupService(
			db as any,
			meta as any,
			usersRepository as any,
			usedUsernamesRepository as any,
			utilityService as any,
			userService as any,
			userEntityService as any,
			idService as any,
			{} as any,
			metaService as any,
			usersChart as any,
		);

		await service.signup({
			username: 'alice',
			passwordHash: 'hashed-password',
			ignorePreservedUsernames: true,
		});

		const profile = saved.find(entity => entity instanceof MiUserProfile) as MiUserProfile | undefined;
		expect(profile).toBeDefined();
		expect(profile?.publicReactions).toBe(false);
	});
});
