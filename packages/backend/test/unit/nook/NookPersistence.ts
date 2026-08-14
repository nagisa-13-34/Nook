/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { getMetadataArgsStorage } from 'typeorm';
import { describe, expect, test } from 'vitest';
import { MiNookFeatureFlag } from '@/models/NookFeatureFlag.js';
import { MiNookPolicy } from '@/models/NookPolicy.js';

describe('Nook persistence metadata', () => {
	test('registers policy and feature flag tables', () => {
		const tables = getMetadataArgsStorage().tables;

		expect(tables.find((table) => table.target === MiNookPolicy)?.name).toBe('nook_policy');
		expect(tables.find((table) => table.target === MiNookFeatureFlag)?.name).toBe('nook_feature_flag');
	});

	test('keeps age groups configurable instead of using a database enum', () => {
		const ageGroupColumn = getMetadataArgsStorage().columns.find((column) =>
			column.target === MiNookPolicy && column.propertyName === 'ageGroup'
		);

		expect(ageGroupColumn?.options.type).toBe('varchar');
	});
});
