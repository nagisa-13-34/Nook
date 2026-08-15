/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export type RecommendationSource = 'home-network' | 'local-discovery' | 'followed-channel';

export type RecommendationRankCandidate = {
	noteId: string;
	userId: string;
	channelId: string | null;
	createdAt: Date;
	reactionsCount: number;
	repliesCount: number;
	renoteCount: number;
	sources: ReadonlySet<RecommendationSource>;
};

export type RecommendationFeatures = {
	source: number;
	freshness: number;
	engagement: number;
	exploration: number;
};

export type ScoredRecommendationCandidate = RecommendationRankCandidate & {
	features: RecommendationFeatures;
	score: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function stableUnitInterval(seed: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < seed.length; i++) {
		hash ^= seed.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return (hash >>> 0) / 0x100000000;
}

export function recommendationFreshnessScore(createdAt: Date, snapshotAt: Date): number {
	const ageMs = Math.max(0, snapshotAt.getTime() - createdAt.getTime());
	return Math.exp(-(ageMs / DAY_MS));
}

export function recommendationEngagementScore(reactionsCount: number, repliesCount: number, renoteCount: number): number {
	const weighted = Math.max(0, reactionsCount) + Math.max(0, repliesCount) * 2 + Math.max(0, renoteCount) * 1.5;
	return Math.min(1, Math.log1p(weighted) / Math.log1p(100));
}

export function recommendationSourceScore(sources: ReadonlySet<RecommendationSource>): number {
	let score = 0;
	if (sources.has('home-network')) score += 0.32;
	if (sources.has('followed-channel')) score += 0.15;
	if (sources.has('local-discovery')) score += 0.05;
	return score;
}

export function scoreRecommendationCandidate(candidate: RecommendationRankCandidate, userId: string, snapshotAt: Date): ScoredRecommendationCandidate {
	const features: RecommendationFeatures = {
		source: recommendationSourceScore(candidate.sources),
		freshness: recommendationFreshnessScore(candidate.createdAt, snapshotAt),
		engagement: recommendationEngagementScore(candidate.reactionsCount, candidate.repliesCount, candidate.renoteCount),
		exploration: stableUnitInterval(`${userId}:${candidate.noteId}:${snapshotAt.toISOString().slice(0, 10)}`),
	};

	return {
		...candidate,
		features,
		score: features.source + features.freshness * 0.28 + features.engagement * 0.12 + features.exploration * 0.08,
	};
}

export function rankRecommendationCandidates(candidates: readonly RecommendationRankCandidate[], userId: string, snapshotAt: Date): ScoredRecommendationCandidate[] {
	return candidates
		.map(candidate => scoreRecommendationCandidate(candidate, userId, snapshotAt))
		.sort((a, b) => {
			if (a.score !== b.score) return b.score - a.score;
			if (a.createdAt.getTime() !== b.createdAt.getTime()) return b.createdAt.getTime() - a.createdAt.getTime();
			return b.noteId.localeCompare(a.noteId);
		});
}

export function selectDiverseRecommendations(
	candidates: readonly ScoredRecommendationCandidate[],
	limit: number,
	options: {
		maxPerAuthor?: number;
		maxPerChannel?: number;
	} = {},
): ScoredRecommendationCandidate[] {
	const maxPerAuthor = options.maxPerAuthor ?? 2;
	const maxPerChannel = options.maxPerChannel ?? 4;
	const authorCounts = new Map<string, number>();
	const channelCounts = new Map<string, number>();
	const selected: ScoredRecommendationCandidate[] = [];

	for (const candidate of candidates) {
		if ((authorCounts.get(candidate.userId) ?? 0) >= maxPerAuthor) continue;
		if (candidate.channelId != null && (channelCounts.get(candidate.channelId) ?? 0) >= maxPerChannel) continue;

		selected.push(candidate);
		authorCounts.set(candidate.userId, (authorCounts.get(candidate.userId) ?? 0) + 1);
		if (candidate.channelId != null) {
			channelCounts.set(candidate.channelId, (channelCounts.get(candidate.channelId) ?? 0) + 1);
		}

		if (selected.length >= limit) break;
	}

	return selected;
}
