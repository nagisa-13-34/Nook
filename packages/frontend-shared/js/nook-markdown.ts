/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
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

		if (/^[\t ]*```(?:[A-Za-z0-9_+-]+)?[\t ]*$/.test(body)) {
			inFence = true;
			return line;
		}

		const heading = body.match(/^([\t ]{0,3})#{1,3}[\t ]+(.+)$/);
		if (heading) return `${heading[1]}**${normalizeInline(heading[2])}**${cr}`;

		const listItem = body.match(/^([\t ]{0,3})-[\t ]+(.+)$/);
		if (listItem) return `${listItem[1]}• ${normalizeInline(listItem[2])}${cr}`;

		return `${normalizeInline(body)}${cr}`;
	}).join('\n');
}

function normalizeInline(text: string): string {
	let result = '';
	let cursor = 0;

	while (cursor < text.length) {
		const char = text[cursor];

		if (char === '\\' && cursor + 1 < text.length) {
			result += text.slice(cursor, cursor + 2);
			cursor += 2;
			continue;
		}

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

		if (char === '*' && isSingleStar(text, cursor) && canOpenItalic(text, cursor)) {
			const end = findClosingItalic(text, cursor + 1);
			if (end !== -1) {
				result += `<i>${normalizeInline(text.slice(cursor + 1, end))}</i>`;
				cursor = end + 1;
				continue;
			}
		}

		result += char;
		cursor++;
	}

	return result;
}

function findClosingItalic(text: string, start: number): number {
	let cursor = start;

	while (cursor < text.length) {
		const char = text[cursor];

		if (char === '\\') {
			cursor += 2;
			continue;
		}

		if (char === '`') {
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

		if (char === '*' && isSingleStar(text, cursor) && canCloseItalic(text, cursor)) return cursor;
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
