/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import {
	defaultNookFeatureFlags,
	NookFeatureFlags,
} from '@/nook/feature-flags/NookFeatureFlags.js';

describe(NookFeatureFlags, () => {
	test('初期値では拡張機能をすべて停止する', () => {
		const flags = new NookFeatureFlags();

		expect(Object.values(flags.snapshot()).every((enabled) => !enabled)).toBe(true);
	});

	test('管理データ相当の新しい設定へ一括置換できる', () => {
		const flags = new NookFeatureFlags();

		flags.replace({ ...defaultNookFeatureFlags, chat: true });

		expect(flags.isEnabled('chat')).toBe(true);
		expect(flags.isEnabled('video_call')).toBe(false);
	});

	test('snapshotの変更が内部状態へ影響しない', () => {
		const flags = new NookFeatureFlags();
		const snapshot = flags.snapshot() as Record<string, boolean>;

		snapshot.chat = true;

		expect(flags.isEnabled('chat')).toBe(false);
	});
});
