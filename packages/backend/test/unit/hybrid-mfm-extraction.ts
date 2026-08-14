/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import * as mfm from 'mfm-js';
import { extractCustomEmojisFromMfm } from '@/misc/extract-custom-emojis-from-mfm.js';
import { extractHashtags } from '@/misc/extract-hashtags.js';
import { extractMentions } from '@/misc/extract-mentions.js';
import { parseNoteTextMfm } from '@/misc/parse-note-text-mfm.js';

function hybrid(text: string): mfm.MfmNode[] {
	return parseNoteTextMfm(text, true);
}

describe('hybrid note metadata extraction', () => {
	test('extracts hashtag, mention, and custom emoji from normal hybrid text', () => {
		const nodes = hybrid('**Hello @user #tag :nook:**');

		expect(extractHashtags(nodes)).toEqual(['tag']);
		expect(extractMentions(nodes).map(mention => mention.username)).toEqual(['user']);
		expect(extractCustomEmojisFromMfm(nodes)).toEqual(['nook']);
	});

	test('escaped hashtag is not extracted', () => {
		expect(extractHashtags(hybrid('\\#tag'))).toEqual([]);
	});

	test('inline code hashtag is not extracted', () => {
		expect(extractHashtags(hybrid('`#tag`'))).toEqual([]);
	});

	test('fenced code hashtag is not extracted', () => {
		expect(extractHashtags(hybrid('```text\n#tag\n```'))).toEqual([]);
	});

	test('inline code mention is not extracted', () => {
		expect(extractMentions(hybrid('`@user`'))).toEqual([]);
	});

	test('fenced code mention is not extracted', () => {
		expect(extractMentions(hybrid('```text\n@user\n```'))).toEqual([]);
	});

	test('inline code custom emoji is not extracted', () => {
		expect(extractCustomEmojisFromMfm(hybrid('`:nook:`'))).toEqual([]);
	});

	test('fenced code custom emoji is not extracted', () => {
		expect(extractCustomEmojisFromMfm(hybrid('```text\n:nook:\n```'))).toEqual([]);
	});

	test('nookMarkdown=false uses the legacy MFM parser unchanged', () => {
		const source = '# Heading\n*italic*\n[link](https://example.com)';
		expect(parseNoteTextMfm(source, false)).toEqual(mfm.parse(source));
	});

	test('remote-note parsing stays on the same legacy MFM path', () => {
		const source = '# Heading\n*italic*\n[link](https://example.com)';
		const remoteNodes = parseNoteTextMfm(source, false);
		expect(remoteNodes).toEqual(mfm.parse(source));
	});
});
