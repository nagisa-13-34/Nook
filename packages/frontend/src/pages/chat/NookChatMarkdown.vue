<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<template v-for="(block, index) in blocks" :key="index">
		<pre v-if="block.type === 'code'" :class="$style.codeBlock"><code>{{ block.text }}</code></pre>
		<blockquote v-else-if="block.type === 'quote'" :class="$style.quote">
			<InlineMarkdown :text="block.text"/>
		</blockquote>
		<ul v-else-if="block.type === 'list'" :class="$style.list">
			<li v-for="(item, itemIndex) in block.items" :key="itemIndex"><InlineMarkdown :text="item"/></li>
		</ul>
		<ol v-else-if="block.type === 'orderedList'" :class="$style.list">
			<li v-for="(item, itemIndex) in block.items" :key="itemIndex"><InlineMarkdown :text="item"/></li>
		</ol>
		<component :is="`h${block.level}`" v-else-if="block.type === 'heading'" :class="$style.heading">
			<InlineMarkdown :text="block.text"/>
		</component>
		<p v-else :class="$style.paragraph"><InlineMarkdown :text="block.text"/></p>
	</template>
</div>
</template>

<script lang="ts" setup>
import { computed, defineComponent, h, type PropType, type VNodeChild } from 'vue';

type Block =
	| { type: 'paragraph'; text: string }
	| { type: 'quote'; text: string }
	| { type: 'code'; text: string }
	| { type: 'heading'; text: string; level: 1 | 2 | 3 }
	| { type: 'list'; items: string[] }
	| { type: 'orderedList'; items: string[] };

const props = defineProps<{
	text: string;
}>();

function isSafeUrl(value: string): boolean {
	try {
		const parsed = new URL(value);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:';
	} catch {
		return false;
	}
}

function renderInline(text: string): VNodeChild[] {
	type Candidate = {
		index: number;
		length: number;
		priority: number;
		render: () => VNodeChild;
	};

	const result: VNodeChild[] = [];
	let rest = text;

	while (rest.length > 0) {
		const candidates: Candidate[] = [];

		const code = /`([^`\n]+)`/.exec(rest);
		if (code) candidates.push({
			index: code.index,
			length: code[0].length,
			priority: 0,
			render: () => h('code', { class: 'nookChatMarkdownInlineCode' }, code[1]),
		});

		const markdownLink = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/.exec(rest);
		if (markdownLink && isSafeUrl(markdownLink[2])) candidates.push({
			index: markdownLink.index,
			length: markdownLink[0].length,
			priority: 1,
			render: () => h('a', {
				href: markdownLink[2],
				target: '_blank',
				rel: 'noopener noreferrer nofollow',
			}, markdownLink[1]),
		});

		const bold = /\*\*([^*\n]+)\*\*/.exec(rest);
		if (bold) candidates.push({
			index: bold.index,
			length: bold[0].length,
			priority: 2,
			render: () => h('strong', null, renderInline(bold[1])),
		});

		const strike = /~~([^~\n]+)~~/.exec(rest);
		if (strike) candidates.push({
			index: strike.index,
			length: strike[0].length,
			priority: 3,
			render: () => h('s', null, renderInline(strike[1])),
		});

		const italic = /\*([^*\n]+)\*/.exec(rest);
		if (italic) candidates.push({
			index: italic.index,
			length: italic[0].length,
			priority: 4,
			render: () => h('em', null, renderInline(italic[1])),
		});

		const bareUrl = /https?:\/\/[^\s<>()]+/.exec(rest);
		if (bareUrl && isSafeUrl(bareUrl[0])) candidates.push({
			index: bareUrl.index,
			length: bareUrl[0].length,
			priority: 5,
			render: () => h('a', {
				href: bareUrl[0],
				target: '_blank',
				rel: 'noopener noreferrer nofollow',
			}, bareUrl[0]),
		});

		if (candidates.length === 0) {
			result.push(rest);
			break;
		}

		candidates.sort((a, b) => a.index - b.index || a.priority - b.priority);
		const candidate = candidates[0];

		if (candidate.index > 0) result.push(rest.slice(0, candidate.index));
		result.push(candidate.render());
		rest = rest.slice(candidate.index + candidate.length);
	}

	return result;
}

const InlineMarkdown = defineComponent({
	name: 'NookChatInlineMarkdown',
	props: {
		text: {
			type: String as PropType<string>,
			required: true,
		},
	},
	setup(inlineProps) {
		return () => h('span', { class: 'nookChatMarkdownInline' }, renderInline(inlineProps.text));
	},
});

function parseBlocks(source: string): Block[] {
	const lines = source.replace(/\r\n?/g, '\n').split('\n');
	const output: Block[] = [];
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
			output.push({ type: 'code', text: codeLines.join('\n') });
			continue;
		}

		const heading = /^(#{1,3})\s+(.+)$/.exec(line);
		if (heading) {
			output.push({ type: 'heading', level: heading[1].length as 1 | 2 | 3, text: heading[2] });
			index++;
			continue;
		}

		if (/^>\s?/.test(line)) {
			const quoteLines: string[] = [];
			while (index < lines.length && /^>\s?/.test(lines[index])) {
				quoteLines.push(lines[index].replace(/^>\s?/, ''));
				index++;
			}
			output.push({ type: 'quote', text: quoteLines.join('\n') });
			continue;
		}

		if (/^[-+*]\s+/.test(line)) {
			const items: string[] = [];
			while (index < lines.length && /^[-+*]\s+/.test(lines[index])) {
				items.push(lines[index].replace(/^[-+*]\s+/, ''));
				index++;
			}
			output.push({ type: 'list', items });
			continue;
		}

		if (/^\d+\.\s+/.test(line)) {
			const items: string[] = [];
			while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
				items.push(lines[index].replace(/^\d+\.\s+/, ''));
				index++;
			}
			output.push({ type: 'orderedList', items });
			continue;
		}

		const paragraph: string[] = [];
		while (index < lines.length) {
			const current = lines[index];
			if (current.trim() === '') break;
			if (paragraph.length > 0 && (
				current.trimStart().startsWith('```') ||
				/^(#{1,3})\s+/.test(current) ||
				/^>\s?/.test(current) ||
				/^[-+*]\s+/.test(current) ||
				/^\d+\.\s+/.test(current)
			)) break;
			paragraph.push(current);
			index++;
		}
		output.push({ type: 'paragraph', text: paragraph.join('\n') });
	}

	return output;
}

const blocks = computed(() => parseBlocks(props.text));
</script>

<style lang="scss" module>
.root {
	display: grid;
	gap: 6px;
	min-width: 0;
	white-space: normal;
}

.paragraph,
.heading,
.quote,
.codeBlock,
.list {
	margin: 0;
}

.paragraph {
	white-space: pre-wrap;
}

.heading {
	font-size: 1em;
	font-weight: 850;
	line-height: 1.35;
}

.quote {
	padding-left: 10px;
	border-left: 3px solid currentColor;
	opacity: 0.86;
	white-space: pre-wrap;
}

.list {
	padding-left: 22px;
}

.codeBlock {
	max-width: 100%;
	padding: 9px 10px;
	overflow-x: auto;
	background: color(from currentColor srgb r g b / 0.08);
	border: 1px solid color(from currentColor srgb r g b / 0.14);
	border-radius: 8px;
	font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
	white-space: pre;
}

.root :global(.nookChatMarkdownInlineCode) {
	padding: 1px 5px;
	background: color(from currentColor srgb r g b / 0.1);
	border-radius: 5px;
	font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
	font-size: 0.92em;
}

.root :global(a) {
	color: inherit;
	font-weight: 700;
	text-decoration: underline;
	text-underline-offset: 2px;
}
</style>
