/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * Nook's post composer accepts a small Markdown-like superset of MFM.
 *
 * mfm-js already understands the requested bold, italic, strike, inline code,
 * fenced code (including a language label), blockquote and http(s) link
 * syntaxes. This normalizer therefore only fills the two missing block-level
 * conveniences (headings and unordered lists) and Markdown-style escapes.
 *
 * It is intentionally run only for newly submitted local input. Historical and
 * remote note text is never passed through this function.
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

		// mfm-js already supports a language label on fenced code. Keep the full
		// fence untouched and make its body opaque to all Nook normalization.
		if (/^[\t ]*```(?:[^\r\n`]*)$/.test(body)) {
			inFence = true;
			return line;
		}

		const heading = body.match(/^([\t ]{0,3})(#{1,3})[\t ]+(.+)$/);
		if (heading) {
			// SNS headings intentionally stay compact: all three Markdown heading
			// levels use the existing MFM bold node instead of large HTML headings.
			return `${heading[1]}**${normalizeEscapes(heading[3])}**${cr}`;
		}

		const listItem = body.match(/^([\t ]{0,3})-[\t ]+(.+)$/);
		if (listItem) {
			return `${listItem[1]}• ${normalizeEscapes(listItem[2])}${cr}`;
		}

		return `${normalizeEscapes(body)}${cr}`;
	}).join('\n');
}

function normalizeEscapes(text: string): string {
	let result = '';
	let cursor = 0;

	while (cursor < text.length) {
		const char = text[cursor];

		// Existing MFM inline code is opaque. Escapes inside it are code text, not
		// Markdown escapes.
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

		// <plain> is itself existing MFM syntax whose contents must remain literal.
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
			// escape only when it is clearly escaping a link opener.
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
