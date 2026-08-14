/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as mfm from 'mfm-js';
import { parseHybridMfm } from 'misskey-js';

export function parseNoteTextMfm(text: string | null | undefined, nookMarkdown: boolean): mfm.MfmNode[] {
	if (text == null || text === '') return [];

	return nookMarkdown
		? parseHybridMfm(text, mfm.parse)
		: mfm.parse(text);
}
