/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * Nook's post composer accepts a small Markdown-like superset of MFM.
 *
 * mfm-js already understands bold, ASCII single-star italic, strike, inline
 * code, fenced code (including a language label), blockquotes and http(s)
 * links. This normalizer only fills the remaining Markdown-like gaps while
 * leaving existing MFM syntax on the existing parser/renderer path.
 *
 * Historical and remote note text is never passed through this function.
 */
export function normalizeNookMarkdownToMfm(text: string): string {
	let inFence = false;

	return text.split('\n').map((line) => {
		const hasCr = line.endsWith('\r');
		const body = hasCr ? line.slice(0, -1) : line;
		const cr = hasCr ? '\r' : '';

		if (inFence) {
			if (/^[\t ]*```[\t ]*$/.test(body)) inFence = false;
			return line;
		}

		// mfm-js 0.26.0 already supports a language label on fenced code. Keep
		// the full fence untouched and make its body opaque to normalization.
		if (/^[\t ]*```(?:[^\r\n`]*)$/.test(body)) {
			inFence = true;
			return line;
		}

		const heading = body.match(/^([\t ]{0,3})(#{1,3})[\t ]+(.+)$/);
		if (heading) {
			// Timeline headings deliberately stay compact: H1-H3 use the existing
			// MFM bold node instead of introducing large HTML heading elements.
			return `${heading[1]}**${normalizeInline(heading[3])}**${cr}`;
		}

		const listItem = body.match(/^([\t ]{0,3})-[\t ]+(.+)$/);
		if (listItem) {
			return `${listItem[1]}• ${normalizeInline(listItem[2])}${cr}`;
		}

		return `${normalizeInline(body)}${cr}`;
	}).join('\n');
}

function normalizeInline(text: string): string {
	let result = '';
	let cursor = 0;

	while (cursor < text.length) {
		const char = text[cursor];

		// Existing MFM inline code is opaque. Escapes and MFM-looking strings in
		// code remain literal code text.
		if (char === '`') {
			const end = findUnescaped(text, '`', cursor + 1);
			if (end === -1) {
				result += text.slice(cursor);
				break;
			}
			result += text.slice(cursor, end + 1);
			cursor = end + 1;
			continue;
		}

		// Preserve existing MFM functions byte-for-byte, including nested ones.
		if (text.startsWith('$[', cursor)) {
			const end = findMfmFunctionEnd(text, cursor);
			if (end === -1) {
				result += text.slice(cursor);
				break;
			}
			result += text.slice(cursor, end + 1);
			cursor = end + 1;
			continue;
		}

		// <plain> is existing MFM syntax whose contents must remain literal.
		if (text.startsWith('<plain>', cursor)) {
			const end = text.indexOf('</plain>', cursor + 7);
			if (end === -1) {
				result += text.slice(cursor);
				break;
			}
			result += text.slice(cursor, end + 8);
			cursor = end + 8;
			continue;
		}

		if (char === '\\' && cursor + 1 < text.length) {
			const next = text[cursor + 1];

			// `\[` is also native MFM block-math syntax. Treat it as a Markdown
			// escape only when it clearly prefixes a Markdown link.
			if (next === '[' && looksLikeMarkdownLink(text, cursor + 1)) {
				result += '<plain>[</plain>';
				cursor += 2;
				continue;
			}

			if (isEscapableMarkdownMarker(next)) {
				result += `<plain>${next}</plain>`;
				cursor += 2;
				continue;
			}
		}

		// mfm-js's native `*italic*` intentionally accepts only ASCII
		// alphanumerics/spaces. Convert only the extended Markdown cases (Unicode
		// text, mentions, hashtags, emoji, nested MFM, punctuation...) to the
		// existing MFM <i> form. Plain ASCII italics remain byte-for-byte intact.
		if (char === '*' && isSingleStar(text, cursor) && canOpenItalic(text, cursor)) {
			const end = findClosingItalic(text, cursor + 1);
			if (end !== -1) {
				const inner = text.slice(cursor + 1, end);
				if (!/^[A-Za-z0-9 \t]+$/.test(inner)) {
					result += `<i>${normalizeInline(inner)}</i>`;
					cursor = end + 1;
					continue;
				}
			}
		}

		result += char;
		cursor++;
	}

	return result;
}

function isEscapableMarkdownMarker(char: string): boolean {
	return ['\\', '*', '_', '~', '`', '>', '#', '-', '$', ':', '@'].includes(char);
}

function looksLikeMarkdownLink(text: string, openBracket: number): boolean {
	const closeBracket = findUnescaped(text, ']', openBracket + 1);
	if (closeBracket === -1 || text[closeBracket + 1] !== '(') return false;

	let depth = 1;
	for (let cursor = closeBracket + 2; cursor < text.length; cursor++) {
		if (text[cursor] === '\\') {
			cursor++;
			continue;
		}
		if (text[cursor] === '(') depth++;
		if (text[cursor] === ')') {
			depth--;
			if (depth === 0) return true;
		}
	}

	return false;
}

function findClosingItalic(text: string, start: number): number {
	let cursor = start;

	while (cursor < text.length) {
		if (text[cursor] === '\\') {
			cursor += 2;
			continue;
		}
		if (text[cursor] === '`') {
			const end = findUnescaped(text, '`', cursor + 1);
			if (end === -1) return -1;
			cursor = end + 1;
			continue;
		}
		if (text.startsWith('$[', cursor)) {
			const end = findMfmFunctionEnd(text, cursor);
			if (end === -1) return -1;
			cursor = end + 1;
			continue;
		}
		if (text[cursor] === '*' && isSingleStar(text, cursor) && canCloseItalic(text, cursor)) return cursor;
		cursor++;
	}

	return -1;
}

function findUnescaped(text: string, target: string, start: number): number {
	for (let cursor = start; cursor < text.length; cursor++) {
		if (text[cursor] === '\\') {
			cursor++;
			continue;
		}
		if (text.startsWith(target, cursor)) return cursor;
	}
	return -1;
}

function findMfmFunctionEnd(text: string, start: number): number {
	let depth = 1;

	for (let cursor = start + 2; cursor < text.length; cursor++) {
		if (text[cursor] === '\\') {
			cursor++;
			continue;
		}
		if (text.startsWith('$[', cursor)) {
			depth++;
			cursor++;
			continue;
		}
		if (text[cursor] === ']') {
			depth--;
			if (depth === 0) return cursor;
		}
	}

	return -1;
}

function isSingleStar(text: string, index: number): boolean {
	return text[index - 1] !== '*' && text[index + 1] !== '*';
}

function canOpenItalic(text: string, index: number): boolean {
	const previous = text[index - 1];
	const next = text[index + 1];
	if (next == null || /\s/u.test(next)) return false;
	return previous == null || !/[\p{L}\p{N}]/u.test(previous);
}

function canCloseItalic(text: string, index: number): boolean {
	const previous = text[index - 1];
	const next = text[index + 1];
	if (previous == null || /\s/u.test(previous)) return false;
	return next == null || !/[\p{L}\p{N}]/u.test(next);
}
