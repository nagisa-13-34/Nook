/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { h } from 'vue';
import type { SetupContext, VNodeChild } from 'vue';
import * as mfm from 'mfm-js';
import type * as Misskey from 'misskey-js';
import type { MkABehavior } from '@/components/global/MkA.vue';
import MfmCore from '@/components/global/MkMfm.js';

type MfmProps = {
	text: string;
	plain?: boolean;
	nowrap?: boolean;
	author?: Misskey.entities.UserLite;
	isNote?: boolean;
	emojiUrls?: Record<string, string>;
	rootScale?: number;
	nyaize?: boolean | 'respect';
	parsedNodes?: mfm.MfmNode[] | null;
	enableEmojiMenu?: boolean;
	enableEmojiMenuReaction?: boolean;
	linkNavigationBehavior?: MkABehavior;
};

type MfmEvents = {
	clickEv(id: string): void;
};

type MarkdownBlock =
	| { type: 'paragraph'; text: string }
	| { type: 'heading'; level: 1 | 2 | 3; text: string }
	| { type: 'unorderedList'; items: string[] }
	| { type: 'orderedList'; items: string[] }
	| { type: 'code'; text: string }
	| { type: 'hr' };

function isMarkdownBlockStart(line: string): boolean {
	return /^(#{1,3})\s+/.test(line)
		|| /^[-+*]\s+/.test(line)
		|| /^\d+\.\s+/.test(line)
		|| /^```/.test(line.trimStart())
		|| /^\s*(?:---|___)\s*$/.test(line);
}

function hasMarkdownBlocks(text: string): boolean {
	return text
		.replace(/\r\n?/g, '\n')
		.split('\n')
		.some(isMarkdownBlockStart);
}

function parseMarkdownBlocks(source: string): MarkdownBlock[] {
	const lines = source.replace(/\r\n?/g, '\n').split('\n');
	const blocks: MarkdownBlock[] = [];
	let index = 0;

	while (index < lines.length) {
		const line = lines[index];

		if (line.trim() === '') {
			index++;
			continue;
		}

		if (line.trimStart().startsWith('```')) {
			index++;
			const codeLines: string[] = [];
			while (index < lines.length && !lines[index].trimStart().startsWith('```')) {
				codeLines.push(lines[index]);
				index++;
			}
			if (index < lines.length) index++;
			blocks.push({ type: 'code', text: codeLines.join('\n') });
			continue;
		}

		const heading = /^(#{1,3})\s+(.+)$/.exec(line);
		if (heading) {
			blocks.push({
				type: 'heading',
				level: heading[1].length as 1 | 2 | 3,
				text: heading[2],
			});
			index++;
			continue;
		}

		if (/^\s*(?:---|___)\s*$/.test(line)) {
			blocks.push({ type: 'hr' });
			index++;
			continue;
		}

		if (/^[-+*]\s+/.test(line)) {
			const items: string[] = [];
			while (index < lines.length && /^[-+*]\s+/.test(lines[index])) {
				items.push(lines[index].replace(/^[-+*]\s+/, ''));
				index++;
			}
			blocks.push({ type: 'unorderedList', items });
			continue;
		}

		if (/^\d+\.\s+/.test(line)) {
			const items: string[] = [];
			while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
				items.push(lines[index].replace(/^\d+\.\s+/, ''));
				index++;
			}
			blocks.push({ type: 'orderedList', items });
			continue;
		}

		const paragraph: string[] = [];
		while (index < lines.length) {
			const current = lines[index];
			if (current.trim() === '') break;
			if (paragraph.length > 0 && isMarkdownBlockStart(current)) break;
			paragraph.push(current);
			index++;
		}
		blocks.push({ type: 'paragraph', text: paragraph.join('\n') });
	}

	return blocks;
}

// Nook keeps MFM compatibility and adds Markdown block syntax on top.
// Inline Markdown that overlaps with MFM (bold, italic, strike, quote, code and links)
// continues to be handled by the existing MFM parser.
// eslint-disable-next-line import/no-default-export
export default function (props: MfmProps, { emit }: { emit: SetupContext<MfmEvents>['emit'] }): VNodeChild {
	if (props.text == null || props.text === '') return;

	const forwardClick = (id: string) => emit('clickEv', id);

	if (props.plain || props.nowrap || !hasMarkdownBlocks(props.text)) {
		return h(MfmCore, {
			...props,
			onClickEv: forwardClick,
		});
	}

	const renderMfm = (text: string) => h(MfmCore, {
		...props,
		text,
		plain: false,
		nowrap: false,
		parsedNodes: undefined,
		onClickEv: forwardClick,
	});

	const blocks = parseMarkdownBlocks(props.text);
	const children = blocks.map((block, index) => {
		switch (block.type) {
			case 'heading': {
				const sizes = { 1: '1.35em', 2: '1.2em', 3: '1.08em' } as const;
				return h(`h${block.level}`, {
					key: index,
					style: `margin: 0.45em 0 0.25em; font-size: ${sizes[block.level]}; line-height: 1.35; font-weight: 800;`,
				}, [renderMfm(block.text)]);
			}

			case 'unorderedList':
				return h('ul', {
					key: index,
					style: 'margin: 0.4em 0; padding-left: 1.6em;',
				}, block.items.map((item, itemIndex) => h('li', { key: itemIndex }, [renderMfm(item)])));

			case 'orderedList':
				return h('ol', {
					key: index,
					style: 'margin: 0.4em 0; padding-left: 1.8em;',
				}, block.items.map((item, itemIndex) => h('li', { key: itemIndex }, [renderMfm(item)])));

			case 'code':
				return h('pre', {
					key: index,
					style: 'max-width: 100%; margin: 0.5em 0; padding: 10px 12px; overflow-x: auto; border: 1px solid var(--MI_THEME-divider); border-radius: 8px; background: color(from var(--MI_THEME-fg) srgb r g b / 0.06); font: 0.9em/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: pre;',
				}, [h('code', block.text)]);

			case 'hr':
				return h('hr', {
					key: index,
					style: 'margin: 0.75em 0; border: 0; border-top: 1px solid var(--MI_THEME-divider);',
				});

			case 'paragraph':
			default:
				return h('div', {
					key: index,
					style: 'margin: 0.25em 0;',
				}, [renderMfm(block.text)]);
		}
	});

	return h('div', {
		class: 'nook-markdown-mfm',
		style: 'min-width: 0;',
	}, children);
}
