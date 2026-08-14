/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * Nook's Markdown-like input is intentionally normalized into existing MFM
 * instead of adding a second renderer. This keeps historical notes and remote
 * notes on the exact same rendering path they already use.
 *
 * Most requested Markdown-like syntax is already valid MFM (`**bold**`,
 * `~~strike~~`, code, blockquotes and links). We only rewrite the small subset
 * MFM does not natively express in the same spelling: single-star italics,
 * headings and unordered-list markers.
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

		// Keep fenced code completely opaque. Language labels are preserved for
		// forward compatibility even though the current MFM renderer does not use
		// them for syntax highlighting.
		if (/^[\t ]*```(?:[A-Za-z0-9_+-]+)?[\t ]*$/.test(body)) {
			inFence = true;
			return line;
		}

		const heading = body.match(/^([\t ]{0,3})#{1,3}[\t ]+(.+)$/);
		if (heading) {
			// A compact bold heading is deliberate for timeline readability. H1-H3
			// share the same restrained presentation instead of introducing large
			// HTML heading elements into notes.
			return `${heading[1]}**${normalizeInline(heading[2])}**${cr}`;
		}

		const unorderedList = body.match(/^([\t ]{0,3})-[\t ]+(.+)$/);
		if (unorderedList) {
			return `${unorderedList[1]}• ${normalizeInline(unorderedList[2])}${cr}`;
		}

		return `${normalizeInline(body)}${cr}`;
	}).join('\n');
}

function normalizeInline(text: string): string {
	let result = '';
	let cursor = 0;

	while (cursor < text.length) {
		const char = text[cursor];

		// Keep escapes intact so the existing MFM parser remains responsible for
		// escape semantics. Most importantly, escaped Markdown markers never enter
		// the conversion logic below.
		if (char === '\\' && cursor + 1 < text.length) {
			result += text.slice(cursor, cursor + 2);
			cursor += 2;
			continue;
		}

		// Inline code is an opaque region: Markdown, MFM, mentions, hashtags and
		// custom emoji inside it must remain literal.
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

		// Existing MFM functions are also opaque to this normalizer. Their own
		// parser keeps full responsibility for nested functions and arguments.
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
				const inner = text.slice(cursor + 1, end);
				result += `<i>${normalizeInline(inner)}</i>`;
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

		if (char === '*' && isSingleStar(text, cursor) && canCloseItalic(text, cursor)) {
			return cursor;
		}

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
