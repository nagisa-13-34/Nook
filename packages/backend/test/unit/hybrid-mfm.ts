/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import * as mfm from 'mfm-js';
import { parseHybridMfm, preprocessHybridMfm } from 'misskey-js';

type Node = mfm.MfmNode;

function parse(text: string): Node[] {
	return parseHybridMfm(text, mfm.parse);
}

function walk(nodes: Node[]): Node[] {
	const result: Node[] = [];
	for (const node of nodes) {
		result.push(node);
		if ('children' in node) result.push(...walk(node.children));
	}
	return result;
}

function types(text: string): string[] {
	return walk(parse(text)).map(node => node.type);
}

function textOf(nodes: Node[]): string {
	return walk(nodes)
		.map(node => {
			if (node.type === 'text') return node.props.text;
			if (node.type === 'plain') return node.props.text;
			return '';
		})
		.join('');
}

describe('hybrid Markdown + MFM', () => {
	describe('Markdown basics', () => {
		test('bold uses the existing MFM bold parser', () => {
			expect(types('**bold**')).toContain('bold');
		});

		test('single-star italic supports non-ASCII text', () => {
			expect(types('*斜体*')).toContain('italic');
		});

		test('strikethrough uses the existing MFM strike parser', () => {
			expect(types('~~strike~~')).toContain('strike');
		});

		test('inline code uses the existing MFM code node', () => {
			expect(types('`code`')).toContain('inlineCode');
		});

		test('fenced code keeps its language and body', () => {
			const node = parse('```js\nconst hello = "world";\n```').find(node => node.type === 'blockCode');
			expect(node?.type).toBe('blockCode');
			if (node?.type === 'blockCode') {
				expect(node.props.lang).toBe('js');
				expect(node.props.code).toContain('const hello = "world";');
			}
		});

		test('blockquote uses the existing MFM quote node', () => {
			expect(types('> quoted text')).toContain('quote');
		});

		test('https Markdown link uses the existing MFM link node', () => {
			const node = parse('[Example](https://example.com)').find(node => node.type === 'link');
			expect(node?.type).toBe('link');
			if (node?.type === 'link') expect(node.props.url).toBe('https://example.com');
		});

		test('unordered list becomes a plain bullet plus normal MFM content', () => {
			const nodes = parse('- Apple\n- Orange');
			expect(textOf(nodes)).toContain('• Apple');
			expect(textOf(nodes)).toContain('• Orange');
		});

		test.each(['# Heading', '## Heading', '### Heading'])('heading %s becomes subdued bold AST', source => {
			const nodes = parse(source);
			expect(nodes[0]?.type).toBe('bold');
			expect(textOf(nodes)).toContain('Heading');
			expect(textOf(nodes)).not.toContain('#');
		});
	});

	describe('MFM coexistence', () => {
		test('Markdown + Mention', () => {
			expect(types('**Hello @user**')).toContain('mention');
		});

		test('Markdown + Hashtag', () => {
			expect(types('**Hello #tag**')).toContain('hashtag');
		});

		test('Markdown + Custom Emoji', () => {
			expect(types('**Hello :nook:**')).toContain('emojiCode');
		});

		test('Markdown + MFM function', () => {
			const fn = walk(parse('**Hello $[shake world]**')).find(node => node.type === 'fn');
			expect(fn?.type).toBe('fn');
			if (fn?.type === 'fn') expect(fn.props.name).toBe('shake');
		});

		test('Markdown + URL', () => {
			expect(types('**https://example.com**')).toContain('url');
		});

		test('reply-style mention is still parsed as a mention', () => {
			expect(types('@user **reply**')).toContain('mention');
		});

		test('existing MFM function contents are not rewritten by the Markdown extension', () => {
			expect(preprocessHybridMfm('$[shake *日本語*]')).toBe('$[shake *日本語*]');
		});
	});

	describe('code isolation', () => {
		test('inline code does not expand Markdown, MFM, Mention, Hashtag, or Emoji', () => {
			const nodes = parse('`**bold** $[shake test] @user #tag :nook:`');
			expect(nodes).toHaveLength(1);
			expect(nodes[0]?.type).toBe('inlineCode');
		});

		test('fenced code does not expand Markdown, MFM, Mention, or Hashtag', () => {
			const nodes = parse('```text\n$[shake world]\n@user\n#tag\n**bold**\n```');
			const allTypes = walk(nodes).map(node => node.type);
			expect(allTypes).toContain('blockCode');
			expect(allTypes).not.toContain('fn');
			expect(allTypes).not.toContain('mention');
			expect(allTypes).not.toContain('hashtag');
			expect(allTypes).not.toContain('bold');
		});
	});

	describe('escape', () => {
		test('escaped bold stays literal', () => {
			const nodes = parse('\\*\\*not bold\\*\\*');
			expect(types('\\*\\*not bold\\*\\*')).not.toContain('bold');
			expect(textOf(nodes)).toContain('**not bold**');
		});

		test('escaped italic stays literal', () => {
			const nodes = parse('\\*not italic\\*');
			expect(types('\\*not italic\\*')).not.toContain('italic');
			expect(textOf(nodes)).toContain('*not italic*');
		});

		test('escaped link stays literal', () => {
			expect(types('\\[Example\\](https://example.com)')).not.toContain('link');
		});

		test('escaped heading stays literal', () => {
			const nodes = parse('\\# Heading');
			expect(nodes[0]?.type).not.toBe('bold');
			expect(textOf(nodes)).toContain('# Heading');
		});
	});

	describe('security', () => {
		test.each([
			'[click](javascript:alert(1))',
			'[click](data:text/html,hello)',
			'[click](vbscript:msgbox(1))',
			'[click](file:///tmp/test)',
			'[click](not a url)',
		])('unsafe or malformed URL is not a link: %s', source => {
			expect(types(source)).not.toContain('link');
		});

		test.each([
			'<script>alert(1)</script>',
			'<img src=x onerror=alert(1)>',
			'<iframe src="https://example.com"></iframe>',
			'<div>hello</div>',
		])('raw HTML remains text/MFM-safe nodes: %s', source => {
			const allTypes = types(source);
			expect(allTypes).not.toContain('link');
			expect(allTypes).not.toContain('fn');
			expect(textOf(parse(source))).toContain(source);
		});
	});

	describe('malformed syntax', () => {
		test.each([
			'**hello',
			'*hello',
			'[hello](',
			'`hello',
			'```text\nhello',
			'$[shake',
			'**hello $[shake',
		])('does not throw: %s', source => {
			expect(() => parse(source)).not.toThrow();
		});
	});

	describe('MFM compatibility', () => {
		test('legacy MFM parsing is unchanged unless the note opts into hybrid parsing', () => {
			expect(mfm.parse('# Heading')[0]?.type).not.toBe('bold');
			expect(parse('# Heading')[0]?.type).toBe('bold');
		});

		test.each([
			'plain text only',
			'@user',
			'#hashtag',
			'https://example.com',
			':nook:',
			'$[shake world]',
			'**bold** ~~strike~~ `code`',
		])('keeps existing MFM constructs parseable: %s', source => {
			expect(() => parse(source)).not.toThrow();
		});
	});
});