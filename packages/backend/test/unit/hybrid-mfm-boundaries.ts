/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import * as mfm from 'mfm-js';
import { parseHybridMfm, preprocessHybridMfm } from 'misskey-js';

function parse(text: string): mfm.MfmNode[] {
	return parseHybridMfm(text, mfm.parse);
}

function walk(nodes: mfm.MfmNode[]): mfm.MfmNode[] {
	return nodes.flatMap(node => [node, ...('children' in node ? walk(node.children) : [])]);
}

describe('hybrid Markdown boundaries', () => {
	test('escaped hashtag stays literal instead of becoming a hashtag', () => {
		const nodes = parse('\\#tag');
		expect(walk(nodes).some(node => node.type === 'hashtag')).toBe(false);
	});

	test('normal fenced code closes with an exact fence', () => {
		const nodes = parse('```js\nconst value = 1;\n```');
		expect(nodes.some(node => node.type === 'blockCode')).toBe(true);
	});

	test('fenced code closing marker may have trailing whitespace', () => {
		const source = '```text\nline  \n```   ';
		const preprocessed = preprocessHybridMfm(source);
		const node = parse(source).find(node => node.type === 'blockCode');

		expect(preprocessed).toBe('```text\nline  \n```');
		expect(node?.type).toBe('blockCode');
		if (node?.type === 'blockCode') expect(node.props.code).toBe('line  ');
	});

	test('unclosed fenced code does not throw', () => {
		expect(() => parse('```text\n#tag\n@user\n:nook:')).not.toThrow();
	});
});
