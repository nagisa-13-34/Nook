/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export const nookVideoTabs = ['shorts', 'videos'] as const;

export type NookVideoTab = typeof nookVideoTabs[number];

export type NookVideoFile = Readonly<{
	type: string;
	properties?: Readonly<{
		width?: number;
		height?: number;
	}> | null;
}>;

export type NookVideoNote = Readonly<{
	files: readonly NookVideoFile[];
}>;

export function classifyNookVideoFile(file: NookVideoFile): NookVideoTab | null {
	if (!file.type.startsWith('video/')) return null;

	const width = file.properties?.width;
	const height = file.properties?.height;

	// Unknown dimensions and square video stay in the regular Videos view.
	// Shorts is intentionally limited to media that is known to be portrait.
	if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) return 'videos';
	return height > width ? 'shorts' : 'videos';
}

export function noteMatchesNookVideoTab(note: NookVideoNote, tab: NookVideoTab): boolean {
	return note.files.some(file => classifyNookVideoFile(file) === tab);
}

export function hasNookVideo(note: NookVideoNote): boolean {
	return note.files.some(file => classifyNookVideoFile(file) != null);
}
