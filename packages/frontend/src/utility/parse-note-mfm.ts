/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as mfm from 'mfm-js';
import { parseHybridMfm } from 'misskey-js';
import type * as Misskey from 'misskey-js';

type NookMarkdownNote = Misskey.entities.Note & {
	nookMarkdown?: boolean;
};

export function parseNoteMfm(note: Misskey.entities.Note): mfm.MfmNode[] | null {
	if (note.text == null || note.text === '') return null;

	return (note as NookMarkdownNote).nookMarkdown === true
		? parseHybridMfm(note.text, mfm.parse)
		: mfm.parse(note.text);
}