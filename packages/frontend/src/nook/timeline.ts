/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { BasicTimelineType } from '@/timelines.js';

export const nookTimelineViews = ['following', 'discover', 'media'] as const;

export type NookTimelineView = typeof nookTimelineViews[number];

export type NookTimelineSource = Readonly<{
	src: BasicTimelineType;
	onlyFiles: boolean;
}>;

export function isNookDiscoverAvailable(availableTimelines: readonly BasicTimelineType[]): boolean {
	return availableTimelines.includes('local') || availableTimelines.includes('global');
}

export function resolveNookTimelineSource(view: NookTimelineView, availableTimelines: readonly BasicTimelineType[]): NookTimelineSource | null {
	const discoverSource = availableTimelines.find(timeline => timeline === 'local')
		?? availableTimelines.find(timeline => timeline === 'global');

	if (view === 'discover') {
		if (discoverSource == null) return null;
		return { src: discoverSource, onlyFiles: false };
	}

	const followingSource = availableTimelines.includes('home') ? 'home' : (availableTimelines[0] ?? 'home');
	return {
		src: followingSource,
		onlyFiles: view === 'media',
	};
}

export function detectNookTimelineView(src: string, onlyFiles: boolean): NookTimelineView | null {
	if (src === 'home') return onlyFiles ? 'media' : 'following';
	if ((src === 'local' || src === 'global') && !onlyFiles) return 'discover';
	return null;
}

export function isNookRecommendationUnavailableError(error: unknown): boolean {
	if (typeof error !== 'object' || error == null || !('code' in error)) return false;
	const code = (error as { code?: unknown }).code;
	return code === 'NOOK_RECOMMENDATIONS_DISABLED' || code === 'RESTRICTED_BY_NOOK_POLICY';
}
