/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as mfm from 'mfm-js';
import { unique } from '@/misc/prelude/array.js';

// mfm-js intentionally rejects hashtags made only of numbers (for example #123).
// Nook treats those as normal hashtags too. Because mfm-js leaves them as text
// nodes, we can recover them here without changing the upstream parser.
const numericHashtagPattern = /(^|[^A-Za-z0-9\\])#([0-9]+)(?=$|[ \u3000\t\r\n.,!?'"\/#:\[\]【】()「」（）<>])/g;

function extractNumericHashtagsFromText(text: string): string[] {
	const hashtags: string[] = [];

	for (const match of text.matchAll(numericHashtagPattern)) {
		hashtags.push(match[2]);
	}

	return hashtags;
}

function collectNumericHashtags(nodes: mfm.MfmNode[], hashtags: string[]): void {
	for (const node of nodes) {
		if (node.type === 'text') {
			hashtags.push(...extractNumericHashtagsFromText(node.props.text));
			continue;
		}

		// Hashtags inside a link label are intentionally not parsed by mfm-js,
		// so keep the same behavior for Nook's numeric-only extension.
		if (node.type === 'link') continue;

		if ('children' in node && Array.isArray(node.children)) {
			collectNumericHashtags(node.children as mfm.MfmNode[], hashtags);
		}
	}
}

export function extractHashtags(nodes: mfm.MfmNode[]): string[] {
	const hashtagNodes = mfm.extract(nodes, (node) => node.type === 'hashtag') as mfm.MfmHashtag[];
	const numericHashtags: string[] = [];
	collectNumericHashtags(nodes, numericHashtags);

	return unique([
		...hashtagNodes.map(x => x.props.hashtag),
		...numericHashtags,
	]);
}
