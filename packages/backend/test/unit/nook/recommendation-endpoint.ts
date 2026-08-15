/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
import type { RecommendationService } from '@/core/RecommendationService.js';
import type { MiLocalUser } from '@/models/User.js';
import type { NookAccessService } from '@/nook/policy/NookAccessService.js';
import RecommendedEndpoint from '@/server/api/endpoints/notes/recommended.js';

const me = { id: 'viewer' } as MiLocalUser;

describe('notes/recommended', () => {
	test('rejects requests while recommendations are disabled', async () => {
		const getRecommendations = vi.fn();
		const evaluate = vi.fn();
		const endpoint = new RecommendedEndpoint(
			{ getRecommendations } as unknown as RecommendationService,
			{
				isFeatureEnabled: vi.fn().mockResolvedValue(false),
				evaluate,
			} as unknown as NookAccessService,
		);

		await expect(endpoint.exec({}, me, null)).rejects.toMatchObject({
			code: 'NOOK_RECOMMENDATIONS_DISABLED',
			httpStatusCode: 403,
		});
		expect(evaluate).not.toHaveBeenCalled();
		expect(getRecommendations).not.toHaveBeenCalled();
	});

	test('rejects requests denied by the Nook recommendation policy', async () => {
		const getRecommendations = vi.fn();
		const endpoint = new RecommendedEndpoint(
			{ getRecommendations } as unknown as RecommendationService,
			{
				isFeatureEnabled: vi.fn().mockResolvedValue(true),
				evaluate: vi.fn().mockResolvedValue({
					allowed: false,
					permission: 'recommendation',
					policyId: 'protected',
					reason: 'denied',
				}),
			} as unknown as NookAccessService,
		);

		await expect(endpoint.exec({}, me, null)).rejects.toMatchObject({
			code: 'RESTRICTED_BY_NOOK_POLICY',
			httpStatusCode: 403,
		});
		expect(getRecommendations).not.toHaveBeenCalled();
	});

	test('returns recommendations after feature and policy checks pass', async () => {
		const getRecommendations = vi.fn().mockResolvedValue([]);
		const evaluate = vi.fn().mockResolvedValue({
			allowed: true,
			permission: 'recommendation',
			policyId: 'default',
			reason: 'allowed',
		});
		const endpoint = new RecommendedEndpoint(
			{ getRecommendations } as unknown as RecommendationService,
			{
				isFeatureEnabled: vi.fn().mockResolvedValue(true),
				evaluate,
			} as unknown as NookAccessService,
		);

		await expect(endpoint.exec({}, me, null)).resolves.toEqual([]);
		expect(evaluate).toHaveBeenCalledWith(me, 'recommendation');
		expect(getRecommendations).toHaveBeenCalledWith(me, 20, 0);
	});

	test('forwards explicit recommendation pagination', async () => {
		const getRecommendations = vi.fn().mockResolvedValue([]);
		const endpoint = new RecommendedEndpoint(
			{ getRecommendations } as unknown as RecommendationService,
			{
				isFeatureEnabled: vi.fn().mockResolvedValue(true),
				evaluate: vi.fn().mockResolvedValue({
					allowed: true,
					permission: 'recommendation',
					policyId: 'default',
					reason: 'allowed',
				}),
			} as unknown as NookAccessService,
		);

		await endpoint.exec({ limit: 12, offset: 24 }, me, null);

		expect(getRecommendations).toHaveBeenCalledWith(me, 12, 24);
	});
});
