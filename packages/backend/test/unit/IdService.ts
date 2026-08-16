/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import type { Config } from '@/config.js';
import { IdService } from '@/core/IdService.js';

describe('IdService', () => {
	test.each(['aid', 'aidx', 'meid', 'meidg', 'ulid', 'objectid'] as const)(
		'genTimeUpperBound creates a boundary after the requested time for %s',
		(method) => {
			const service = new IdService({ id: method } as Config);
			const requestedTime = Date.now() + 60_000;

			const boundary = service.genTimeUpperBound(requestedTime);

			expect(service.parse(boundary).date.getTime()).toBeGreaterThan(requestedTime);
		},
	);
});
