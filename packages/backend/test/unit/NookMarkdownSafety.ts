/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import * as mfm from 'mfm-js';
import { MfmService } from '@/core/MfmService.js';
import type { Config } from '@/config.js';

const mfmService = new MfmService({
	url: 'https://example.com',
} as Config);

describe('Nook Markdown safety through the existing MFM HTML renderer', () => {
	test.each([
		['<script>alert(1)</script>', '&lt;script&gt;alert(1)&lt;/script&gt;'],
		['<img src=x onerror=alert(1)>', '&lt;img src=x onerror=alert(1)&gt;'],
		['<iframe src="..."></iframe>', '&lt;iframe src=&quot;...&quot;&gt;&lt;/iframe&gt;'],
	])('escapes raw HTML instead of rendering it: %s', (input, expected) => {
		expect(mfmService.toHtml(mfm.parse(input))).toBe(expected);
	});

	test.each([
		'[click](javascript:alert(1))',
		'[click](data:text/html,hello)',
		'[click](vbscript:msgbox(1))',
		'[click](file:///etc/passwd)',
	])('does not generate an anchor for a non-http(s) Markdown link: %s', (input) => {
		expect(mfmService.toHtml(mfm.parse(input))).not.toContain('<a ');
	});

	test('keeps code content escaped and inert', () => {
		const input = '```text\n<img src=x onerror=alert(1)>\n$[shake test]\n@user\n#tag\n```';
		const output = mfmService.toHtml(mfm.parse(input));
		expect(output).toContain('<pre><code>');
		expect(output).toContain('&lt;img src=x onerror=alert(1)&gt;');
		expect(output).toContain('$[shake test]');
		expect(output).toContain('@user');
		expect(output).toContain('#tag');
		expect(output).not.toContain('<img ');
	});
});
