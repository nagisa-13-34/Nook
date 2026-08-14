const MARKER_H1 = 'nook_md_h1';
const MARKER_H2 = 'nook_md_h2';
const MARKER_H3 = 'nook_md_h3';
const MARKER_LI = 'nook_md_li';
const MARKER_CONTENT = '\u200B';

const escapableMarkdownChars = new Set([
	'\\',
	'*',
	'_',
	'~',
	'>',
	'#',
	'[',
	']',
	'(',
	')',
	'`',
	'$',
	':',
	'-',
]);

type MfmLikeNode = {
	type: string;
	props?: Record<string, unknown>;
	children?: MfmLikeNode[];
};

function marker(name: string): string {
	return `$[${name} ${MARKER_CONTENT}]`;
}

function findInlineCodeEnd(text: string, start: number): number {
	return text.indexOf('`', start + 1);
}

function findMfmFunctionEnd(text: string, start: number): number {
	let depth = 1;
	for (let i = start + 2; i < text.length; i++) {
		if (text[i] === '\\') {
			i++;
			continue;
		}
		if (text[i] === '`') {
			const end = findInlineCodeEnd(text, i);
			if (end === -1) return -1;
			i = end;
			continue;
		}
		if (text[i] === '[') {
			depth++;
		} else if (text[i] === ']') {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}

function findItalicEnd(text: string, start: number): number {
	for (let i = start + 1; i < text.length; i++) {
		if (text[i] === '\\') {
			i++;
			continue;
		}
		if (text[i] === '`') {
			const end = findInlineCodeEnd(text, i);
			if (end === -1) return -1;
			i = end;
			continue;
		}
		if (text[i] === '*') {
			if (text[i - 1] === '*' || text[i + 1] === '*') continue;
			return i;
		}
	}
	return -1;
}

function transformInline(text: string): string {
	let result = '';

	for (let i = 0; i < text.length; i++) {
		const char = text[i];

		if (char === '\\' && i + 1 < text.length && escapableMarkdownChars.has(text[i + 1])) {
			result += `<plain>${text[i + 1]}</plain>`;
			i++;
			continue;
		}

		if (char === '`') {
			const end = findInlineCodeEnd(text, i);
			if (end === -1) {
				result += text.slice(i);
				break;
			}
			result += text.slice(i, end + 1);
			i = end;
			continue;
		}

		if (text.startsWith('$[', i)) {
			const end = findMfmFunctionEnd(text, i);
			if (end !== -1) {
				result += text.slice(i, end + 1);
				i = end;
				continue;
			}
		}

		if (text.startsWith('https://', i) || text.startsWith('http://', i)) {
			let end = i;
			while (end < text.length && !/\s/.test(text[end])) end++;
			result += text.slice(i, end);
			i = end - 1;
			continue;
		}

		if (char === '*' && text[i - 1] !== '*' && text[i + 1] !== '*') {
			const end = findItalicEnd(text, i);
			if (end > i + 1) {
				const inner = transformInline(text.slice(i + 1, end));
				result += `<i>${inner}</i>`;
				i = end;
				continue;
			}
		}

		result += char;
	}

	return result;
}

function transformLine(line: string): string {
	if (line.startsWith('### ') && line.length > 4) {
		return marker(MARKER_H3) + transformInline(line.slice(4));
	}
	if (line.startsWith('## ') && line.length > 3) {
		return marker(MARKER_H2) + transformInline(line.slice(3));
	}
	if (line.startsWith('# ') && line.length > 2) {
		return marker(MARKER_H1) + transformInline(line.slice(2));
	}
	if (line.startsWith('- ') && line.length > 2) {
		return marker(MARKER_LI) + transformInline(line.slice(2));
	}
	return transformInline(line);
}

function isFenceEnd(line: string): boolean {
	return line.trimEnd() === '```';
}

/**
 * Adds Nook's small Markdown-like extensions without replacing MFM itself.
 * Fenced code is copied byte-for-byte so Markdown/MFM stays inert inside it.
 * A closing fence may have trailing whitespace; only that marker is normalized
 * because mfm-js requires the closing backticks to end the line exactly.
 */
export function preprocessHybridMfm(source: string): string {
	const lines = source.split(/(\r\n|\n|\r)/);
	let inFence = false;
	let result = '';

	for (let i = 0; i < lines.length; i++) {
		const part = lines[i];
		if (part === '\r\n' || part === '\n' || part === '\r') {
			result += part;
			continue;
		}

		if (inFence) {
			if (isFenceEnd(part)) {
				result += '```';
				inFence = false;
			} else {
				result += part;
			}
			continue;
		}

		if (part.startsWith('```')) {
			result += part;
			inFence = true;
			continue;
		}

		result += transformLine(part);
	}

	return result;
}

function textNode(text: string): MfmLikeNode {
	return {
		type: 'text',
		props: { text },
	};
}

function markerName(node: MfmLikeNode | undefined): string | null {
	if (node?.type !== 'fn') return null;
	const name = node.props?.name;
	const child = node.children?.[0];
	if (node.children?.length !== 1 || child?.type !== 'text' || child.props?.text !== MARKER_CONTENT) return null;
	return typeof name === 'string' && [MARKER_H1, MARKER_H2, MARKER_H3, MARKER_LI].includes(name)
		? name
		: null;
}

function decorateLine(nodes: MfmLikeNode[]): MfmLikeNode[] {
	const name = markerName(nodes[0]);
	if (name == null) return nodes;

	const children = nodes.slice(1);
	if (name === MARKER_LI) {
		return [textNode('• '), ...children];
	}

	return [{
		type: 'bold',
		children,
	}];
}

function decorateTopLevel(nodes: MfmLikeNode[]): MfmLikeNode[] {
	const result: MfmLikeNode[] = [];
	let line: MfmLikeNode[] = [];

	const flush = () => {
		result.push(...decorateLine(line));
		line = [];
	};

	for (const node of nodes) {
		if (node.type !== 'text' || typeof node.props?.text !== 'string') {
			line.push(node);
			continue;
		}

		const text = node.props.text;
		let start = 0;
		for (const match of text.matchAll(/\r\n|\n|\r/g)) {
			const index = match.index;
			if (index > start) line.push(textNode(text.slice(start, index)));
			flush();
			result.push(textNode(match[0]));
			start = index + match[0].length;
		}
		if (start < text.length) line.push(textNode(text.slice(start)));
	}

	flush();
	return result;
}

/**
 * Parses the preprocessed source with the existing MFM parser, then converts
 * internal heading/list markers back to ordinary MFM AST nodes.
 */
export function parseHybridMfm<T>(source: string, parse: (source: string) => T[] | null): T[] {
	const parsed = parse(preprocessHybridMfm(source)) ?? [];
	return decorateTopLevel(parsed as unknown as MfmLikeNode[]) as unknown as T[];
}
