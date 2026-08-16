/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
import type { RecommendationService } from '@/core/RecommendationService.js';
import type { MiLocalUser } from '@/models/User.js';
import type { NookAccessService } from '@/nook/policy/NookAccessService.js';
import RecommendedPageEndpoint from '@/server/api/endpoints/notes/recommended-page.js';
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
		expect(getRecommendations).toHaveBeenCalledWith(me, 20, {
			snapshotAt: undefined,
			excludeNoteIds: [],
		});
	});

	test('passes snapshot and displayed note ids to the legacy recommendation page', async () => {
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
		const snapshotAt = Date.parse('2026-08-15T12:00:00.000Z');

		await endpoint.exec({
			limit: 20,
			snapshotAt,
			excludeNoteIds: ['n1', 'n2'],
		}, me, null);

		expect(getRecommendations).toHaveBeenCalledWith(me, 20, {
			snapshotAt: new Date(snapshotAt),
			excludeNoteIds: ['n1', 'n2'],
		});
	});
});

describe('notes/recommended-page', () => {
	const allowedAccess = {
		isFeatureEnabled: vi.fn().mockResolvedValue(true),
		evaluate: vi.fn().mockResolvedValue({
			allowed: true,
			permission: 'recommendation',
			policyId: 'default',
			reason: 'allowed',
		}),
	} as unknown as NookAccessService;

	test('starts a server recommendation session without a client timestamp', async () => {
		const getRecommendationPage = vi.fn().mockResolvedValue({ notes: [], cursor: 'cursor-1' });
		const endpoint = new RecommendedPageEndpoint(
			{ getRecommendationPage } as unknown as RecommendationService,
			allowedAccess,
		);

		await expect(endpoint.exec({ limit: 20 }, me, null)).resolves.toEqual({ notes: [], cursor: 'cursor-1' });
		expect(getRecommendationPage).toHaveBeenCalledWith(me, 20, undefined);
	});

	test('passes only the opaque cursor when loading the next page', async () => {
		const getRecommendationPage = vi.fn().mockResolvedValue({ notes: [], cursor: null });
		const endpoint = new RecommendedPageEndpoint(
			{ getRecommendationPage } as unknown as RecommendationService,
			allowedAccess,
		);

		await endpoint.exec({ limit: 20, cursor: 'cursor-1' }, me, null);
		expect(getRecommendationPage).toHaveBeenCalledWith(me, 20, 'cursor-1');
	});

	test('rejects an expired or invalid server cursor', async () => {
		const getRecommendationPage = vi.fn().mockResolvedValue(null);
		const endpoint = new RecommendedPageEndpoint(
			{ getRecommendationPage } as unknown as RecommendationService,
			allowedAccess,
		);

		await expect(endpoint.exec({ cursor: 'expired' }, me, null)).rejects.toMatchObject({
			code: 'INVALID_RECOMMENDATION_CURSOR',
			httpStatusCode: 400,
		});
	});
});
