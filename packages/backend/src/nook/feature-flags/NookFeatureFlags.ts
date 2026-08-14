/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export const nookFeatureNames = [
	'video',
	'chat',
	'voice_call',
	'video_call',
	'community',
	'spaces',
	'recommendations',
	'external_links',
	'migration',
	'federation',
] as const;

export type NookFeatureName = typeof nookFeatureNames[number];
export type NookFeatureFlagSet = Readonly<Record<NookFeatureName, boolean>>;

export const defaultNookFeatureFlags: NookFeatureFlagSet = Object.freeze({
	video: false,
	chat: false,
	voice_call: false,
	video_call: false,
	community: false,
	spaces: false,
	recommendations: false,
	external_links: false,
	migration: false,
	federation: false,
});

export class NookFeatureFlags {
	private flags: NookFeatureFlagSet;

	public constructor(flags: NookFeatureFlagSet = defaultNookFeatureFlags) {
		this.flags = { ...flags };
	}

	public isEnabled(feature: NookFeatureName): boolean {
		return this.flags[feature];
	}

	public replace(flags: NookFeatureFlagSet): void {
		this.flags = { ...flags };
	}

	public snapshot(): NookFeatureFlagSet {
		return { ...this.flags };
	}
}
