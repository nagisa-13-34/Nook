/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import {
	rankRecommendationCandidates,
	recommendationEngagementScore,
	recommendationFreshnessScore,
	selectDiverseRecommendations,
	stableUnitInterval,
	type RecommendationRankCandidate,
	type RecommendationSource,
} from '@/core/recommendation/RecommendationRanking.js';

const snapshotAt = new Date('2026-08-15T12:00:00.000Z');

function candidate(
	noteId: string,
	userId: string,
	channelId: string | null,
	sources: RecommendationSource[] = ['local-discovery'],
): RecommendationRankCandidate {
	return {
		noteId,
		userId,
		channelId,
		createdAt: new Date('2026-08-15T11:00:00.000Z'),
		reactionsCount: 0,
		repliesCount: 0,
		renoteCount: 0,
		sources: new Set(sources),
	};
}

describe('Nook recommendation ranking', () => {
	test('exploration is deterministic for the same seed', () => {
		const first = stableUnitInterval('user:note:2026-08-15');
		const second = stableUnitInterval('user:note:2026-08-15');

		expect(first).toBe(second);
		expect(first).toBeGreaterThanOrEqual(0);
		expect(first).toBeLessThan(1);
	});

	test('freshness decays smoothly instead of expiring at a hard cutoff', () => {
		const fresh = recommendationFreshnessScore(snapshotAt, snapshotAt);
		const oneDayOld = recommendationFreshnessScore(new Date(snapshotAt.getTime() - 24 * 60 * 60 * 1000), snapshotAt);
		const twoDaysOld = recommendationFreshnessScore(new Date(snapshotAt.getTime() - 48 * 60 * 60 * 1000), snapshotAt);

		expect(fresh).toBe(1);
		expect(oneDayOld).toBeGreaterThan(twoDaysOld);
		expect(oneDayOld).toBeCloseTo(Math.exp(-1));
	});

	test('engagement is monotonic but logarithmically compressed', () => {
		const small = recommendationEngagementScore(10, 0, 0);
		const medium = recommendationEngagementScore(50, 0, 0);
		const huge = recommendationEngagementScore(10_000, 0, 0);

		expect(medium).toBeGreaterThan(small);
		expect(huge).toBe(1);
		expect(medium - small).toBeLessThan(0.5);
	});

	test('home-network and followed-channel signals outrank an otherwise identical discovery candidate', () => {
		const discovery = candidate('note-discovery', 'author-a', null, ['local-discovery']);
		const network = candidate('note-network', 'author-b', null, ['home-network', 'local-discovery']);
		const followedChannel = candidate('note-channel', 'author-c', 'channel-a', ['local-discovery', 'followed-channel']);
		const ranked = rankRecommendationCandidates([discovery, network, followedChannel], 'viewer', snapshotAt);

		expect(ranked[0]?.noteId).toBe('note-network');
		expect(ranked.find(item => item.noteId === 'note-channel')!.score).toBeGreaterThan(ranked.find(item => item.noteId === 'note-discovery')!.score);
	});

	test('selection limits repeated authors to two notes', () => {
		const ranked = rankRecommendationCandidates([
			candidate('a-1', 'author-a', 'channel-1', ['home-network']),
			candidate('a-2', 'author-a', 'channel-2', ['home-network']),
			candidate('a-3', 'author-a', 'channel-3', ['home-network']),
			candidate('b-1', 'author-b', 'channel-4', ['local-discovery']),
			candidate('c-1', 'author-c', 'channel-5', ['local-discovery']),
		], 'viewer', snapshotAt);
		const selected = selectDiverseRecommendations(ranked, 5);

		expect(selected.filter(item => item.userId === 'author-a')).toHaveLength(2);
	});

	test('selection limits a single channel to four notes', () => {
		const ranked = rankRecommendationCandidates([
			candidate('n-1', 'author-1', 'channel-a'),
			candidate('n-2', 'author-2', 'channel-a'),
			candidate('n-3', 'author-3', 'channel-a'),
			candidate('n-4', 'author-4', 'channel-a'),
			candidate('n-5', 'author-5', 'channel-a'),
			candidate('n-6', 'author-6', 'channel-a'),
		], 'viewer', snapshotAt);
		const selected = selectDiverseRecommendations(ranked, 6);

		expect(selected).toHaveLength(4);
		expect(selected.every(item => item.channelId === 'channel-a')).toBe(true);
	});
});
