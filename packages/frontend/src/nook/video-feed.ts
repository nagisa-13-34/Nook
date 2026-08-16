/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { BasicTimelineType } from '@/timelines.js';

export const nookVideoTabs = ['shorts', 'videos'] as const;

export type NookVideoTab = typeof nookVideoTabs[number];
export type NookVideoTimelineSource = 'local' | 'global';

export type NookVideoFile = Readonly<{
	type: string;
	properties?: Readonly<{
		width?: number;
		height?: number;
	}> | null;
}>;

export type NookVideoNote = Readonly<{
	files?: readonly NookVideoFile[] | null;
}>;

export function resolveNookVideoTimelineSource(availableTimelines: readonly BasicTimelineType[]): NookVideoTimelineSource | null {
	if (availableTimelines.includes('local')) return 'local';
	if (availableTimelines.includes('global')) return 'global';
	return null;
}

export function isNookVideoFeedAvailable(availableTimelines: readonly BasicTimelineType[]): boolean {
	return resolveNookVideoTimelineSource(availableTimelines) != null;
}

export function classifyNookVideoFile(file: NookVideoFile): NookVideoTab | null {
	if (!file.type.startsWith('video/')) return null;

	const width = file.properties?.width;
	const height = file.properties?.height;

	// Unknown dimensions and square video stay in the regular Videos view.
	// Shorts is intentionally limited to media that is known to be portrait.
	if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) return 'videos';
	return height > width ? 'shorts' : 'videos';
}

export function classifyNookVideoNote(note: NookVideoNote): NookVideoTab | null {
	const primaryVideo = note.files?.find(file => file.type.startsWith('video/'));
	return primaryVideo == null ? null : classifyNookVideoFile(primaryVideo);
}

export function noteMatchesNookVideoTab(note: NookVideoNote, tab: NookVideoTab): boolean {
	return classifyNookVideoNote(note) === tab;
}

export function hasNookVideo(note: NookVideoNote): boolean {
	return classifyNookVideoNote(note) != null;
}
