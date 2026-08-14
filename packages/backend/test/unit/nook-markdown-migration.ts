/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { AddNookMarkdownToNote1786711020000 } from '../../migration/1786711020000-add-nook-markdown-to-note.js';

describe('nookMarkdown migration', () => {
	test('adds only a false-default column and no insert trigger', async () => {
		const queries: string[] = [];
		const queryRunner = {
			query: async (sql: string) => {
				queries.push(sql);
			},
		};

		await new AddNookMarkdownToNote1786711020000().up(queryRunner);

		expect(queries).toEqual([
			'ALTER TABLE "note" ADD "nookMarkdown" boolean NOT NULL DEFAULT false',
		]);
		expect(queries.some(sql => sql.includes('TRIGGER') || sql.includes('FUNCTION'))).toBe(false);
	});
});
