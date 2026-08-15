/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import * as mfm from 'mfm-js';
import { normalizeNookMarkdownToMfm } from '@@/js/nook-markdown.js';

function parse(input: string): mfm.MfmNode[] {
	return mfm.parse(normalizeNookMarkdownToMfm(input));
}

function flatten(nodes: mfm.MfmNode[]): mfm.MfmNode[] {
	const result: mfm.MfmNode[] = [];
	for (const node of nodes) {
		result.push(node);
		const children = (node as mfm.MfmNode & { children?: mfm.MfmNode[] }).children;
		if (Array.isArray(children)) result.push(...flatten(children));
	}
	return result;
}

function types(input: string): string[] {
	return flatten(parse(input)).map(node => node.type);
}

function expectTypes(input: string, included: string[], excluded: string[] = []): void {
	const actual = types(input);
	for (const type of included) expect(actual).toContain(type);
	for (const type of excluded) expect(actual).not.toContain(type);
}

describe('Nook Markdown-like input', () => {
	describe('Markdown basics', () => {
		test('keeps native MFM bold syntax', () => {
			expect(normalizeNookMarkdownToMfm('**bold**')).toBe('**bold**');
			expectTypes('**bold**', ['bold']);
		});

		test('keeps native ASCII italic syntax', () => {
			expect(normalizeNookMarkdownToMfm('*italic*')).toBe('*italic*');
			expectTypes('*italic*', ['italic']);
		});

		test('extends single-star italic to Unicode text', () => {
			expect(normalizeNookMarkdownToMfm('*斜体*')).toBe('<i>斜体</i>');
			expectTypes('*斜体*', ['italic']);
		});

		test('keeps native strikethrough syntax', () => {
			expect(normalizeNookMarkdownToMfm('~~strike~~')).toBe('~~strike~~');
			expectTypes('~~strike~~', ['strike']);
		});

		test('keeps native inline code syntax', () => {
			expect(normalizeNookMarkdownToMfm('`const x = 1`')).toBe('`const x = 1`');
			expectTypes('`const x = 1`', ['inlineCode']);
		});

		test('keeps fenced code and language labels native to MFM', () => {
			const input = '```js\nconst hello = "world";\n```';
			expect(normalizeNookMarkdownToMfm(input)).toBe(input);
			const node = parse(input).find(x => x.type === 'blockCode');
			expect(node?.type).toBe('blockCode');
			if (node?.type === 'blockCode') {
				expect(node.props.code).toBe('const hello = "world";');
				expect(node.props.lang).toBe('js');
			}
		});

		test('keeps native blockquote syntax', () => {
			expect(normalizeNookMarkdownToMfm('> quoted text')).toBe('> quoted text');
			expectTypes('> quoted text', ['quote']);
		});

		test('keeps safe http(s) links on the existing MFM link parser', () => {
			const input = '[Example](https://example.com)';
			expect(normalizeNookMarkdownToMfm(input)).toBe(input);
			expectTypes(input, ['link']);
		});

		test('normalizes unordered list markers without introducing a new AST', () => {
			expect(normalizeNookMarkdownToMfm('- Apple\n- Orange\n- Banana')).toBe('• Apple\n• Orange\n• Banana');
		});

		test.each([
			['# Heading', '<b>Heading</b>'],
			['## Heading', '<b>Heading</b>'],
			['### Heading', '<b>Heading</b>'],
		])('normalizes compact heading %s', (input, expected) => {
			expect(normalizeNookMarkdownToMfm(input)).toBe(expected);
			expectTypes(input, ['bold']);
		});
	});

	describe('MFM coexistence', () => {
		test('Markdown bold can contain a Mention', () => {
			expectTypes('**Hello @user**', ['bold', 'mention']);
		});

		test('Markdown bold can contain a Hashtag', () => {
			expect(normalizeNookMarkdownToMfm('**Hello #nook**')).toBe('<b>Hello #nook</b>');
			expectTypes('**Hello #nook**', ['bold', 'hashtag']);
		});

		test('Markdown bold can contain a Custom Emoji', () => {
			expectTypes('**Hello :nook:**', ['bold', 'emojiCode']);
		});

		test('Markdown bold can contain an MFM function', () => {
			expectTypes('**Hello $[shake world]**', ['bold', 'fn']);
		});

		test('Markdown bold can contain a URL', () => {
			expectTypes('**Hello https://example.com**', ['bold', 'url']);
		});

		test('extended italic can contain Mention, Hashtag, Custom Emoji and MFM', () => {
			const input = '*Hello @user #nook :nook: $[shake world]*';
			expect(normalizeNookMarkdownToMfm(input)).toBe('<i>Hello @user #nook :nook: $[shake world]</i>');
			expectTypes(input, ['italic', 'mention', 'hashtag', 'emojiCode', 'fn']);
		});

		test('reply-style mention remains a Mention', () => {
			expectTypes('**@user@example.com hello**', ['bold', 'mention']);
		});
	});

	describe('code is opaque', () => {
		test('inline code does not execute Markdown or MFM constructs', () => {
			const input = '`**bold** $[shake test] @user #tag :nook:`';
			expect(normalizeNookMarkdownToMfm(input)).toBe(input);
			expectTypes(input, ['inlineCode'], ['bold', 'fn', 'mention', 'hashtag', 'emojiCode']);
		});

		test('fenced code does not execute Markdown or MFM constructs', () => {
			const input = '```text\n$[shake world]\n@user\n#tag\n**bold**\n- list\n```';
			expect(normalizeNookMarkdownToMfm(input)).toBe(input);
			expectTypes(input, ['blockCode'], ['bold', 'fn', 'mention', 'hashtag', 'emojiCode']);
		});
	});

	describe('escape handling', () => {
		test('escaped bold markers stay literal', () => {
			const output = normalizeNookMarkdownToMfm('\\*\\*not bold\\*\\*');
			expect(output).toContain('<plain>*</plain>');
			expectTypes('\\*\\*not bold\\*\\*', ['plain'], ['bold']);
		});

		test('escaped italic markers stay literal', () => {
			expectTypes('\\*not italic\\*', ['plain'], ['italic']);
		});

		test('escaped link stays fully literal and is not auto-linkified', () => {
			const input = '\\[Example](https://example.com)';
			expectTypes(input, ['plain'], ['link', 'url']);
		});

		test('escaped heading marker is not a heading or hashtag', () => {
			const input = '\\# Heading';
			expect(normalizeNookMarkdownToMfm(input)).toBe('<plain>#</plain> Heading');
			expectTypes(input, ['plain'], ['bold', 'hashtag']);
		});

		test('native MFM math opener is not mistaken for an escaped link', () => {
			const input = '\\[a = 1\\]';
			expect(normalizeNookMarkdownToMfm(input)).toBe(input);
		});
	});

	describe('security', () => {
		test.each([
			'<script>alert(1)</script>',
			'<img src=x onerror=alert(1)>',
			'<iframe src="..."></iframe>',
		])('does not invent executable HTML for %s', (input) => {
			expect(normalizeNookMarkdownToMfm(input)).toBe(input);
			expect(types(input)).not.toContain('link');
		});

		test.each([
			'[click](javascript:alert(1))',
			'[click](data:text/html,hello)',
			'[click](vbscript:msgbox(1))',
			'[click](file:///etc/passwd)',
		])('dangerous scheme is not accepted by the existing MFM link parser: %s', (input) => {
			expect(normalizeNookMarkdownToMfm(input)).toBe(input);
			expectTypes(input, [], ['link', 'url']);
		});

		test('malformed URL does not throw or become a link', () => {
			const input = '[click](https://)';
			expect(() => parse(input)).not.toThrow();
			expectTypes(input, [], ['link']);
		});
	});

	describe('malformed syntax', () => {
		test.each([
			'**hello',
			'*hello',
			'[hello](',
			'`hello',
			'```js\n# still code\n$[shake test]',
			'$[shake',
			'*hello $[shake*',
		])('never throws for malformed input: %s', (input) => {
			expect(() => normalizeNookMarkdownToMfm(input)).not.toThrow();
			expect(() => parse(input)).not.toThrow();
		});
	});

	describe('existing compatibility', () => {
		test.each([
			'plain text only',
			'$[shake text]',
			'@user',
			'#hashtag',
			'https://example.com',
			':nook:',
			'**existing bold**',
			'~~existing strike~~',
			'> existing quote',
			'[existing link](https://example.com)',
			'foo*bar*baz',
			'<plain>**literal** #tag @user</plain>',
		])('leaves existing MFM/plain input unchanged: %s', (input) => {
			expect(normalizeNookMarkdownToMfm(input)).toBe(input);
		});
	});
});
