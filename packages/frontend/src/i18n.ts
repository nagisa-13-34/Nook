/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { markRaw } from 'vue';
import { I18n } from '@@/js/i18n.js';
import { lang } from '@@/js/config.js';
import { locale } from '@@/js/locale.js';
import type { Locale } from 'i18n';

const nookLocale = lang === 'ja-JP'
	? {
		nookBookmarks: 'ブックマーク',
		nookBookmarksEmpty: '保存した投稿はここに表示されます。',
	} as const
	: {
		nookBookmarks: 'Bookmarks',
		nookBookmarksEmpty: 'Posts you save will appear here.',
	} as const;

type NookLocale = Locale & typeof nookLocale;

export const i18n = markRaw(new I18n<NookLocale>(Object.assign(locale, nookLocale), _DEV_));

// test 以外では使わないこと。インライン化されてるのでだいたい意味がない
export function updateI18n(newLocale: Locale) {
	i18n.locale = Object.assign(newLocale, nookLocale);
}
