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
		nookCommunity: 'コミュニティ',
		nookUnreadChat: '未読のチャットがあります',
		nookShorts: 'ショート',
		nookFollowing: 'フォロー中',
		nookDiscover: 'みつける',
		nookMedia: 'メディア',
		chooseServerOnMisskeyHub: 'サーバー一覧から選択',
		serverHostPlaceholder: '例: social.example.com',
		repositoryUrlDescription: 'Nookのソースコードを公開しているリポジトリのURLを記入します。このNook本体のリポジトリは https://github.com/Nagisa-13-34/Nook です。',
		sendErrorReportsDescription: 'オンにすると、問題が発生したときにエラーの詳細情報が開発者へ共有され、ソフトウェアの品質向上に役立てられます。エラー情報には、OSのバージョン、ブラウザの種類、行動履歴などが含まれる場合があります。',
	} as const
	: {
		nookBookmarks: 'Bookmarks',
		nookBookmarksEmpty: 'Posts you save will appear here.',
		nookCommunity: 'Community',
		nookUnreadChat: 'You have unread chat messages',
		nookShorts: 'Shorts',
		nookFollowing: 'Following',
		nookDiscover: 'Discover',
		nookMedia: 'Media',
		chooseServerOnMisskeyHub: 'Choose from the server directory',
		serverHostPlaceholder: 'e.g. social.example.com',
		repositoryUrlDescription: 'Enter the URL of the repository where the Nook source code is published. The repository for this Nook project is https://github.com/Nagisa-13-34/Nook.',
		sendErrorReportsDescription: 'When enabled, error details may be shared with the developers to help improve the software. Error information may include the OS version, browser type, and recent activity.',
	} as const;

type NookLocale = Locale & typeof nookLocale;

function brandAsNook<T>(value: T): T {
	if (typeof value === 'string') {
		let text = value.replaceAll('Misskey', 'Nook');
		if (lang === 'ja-JP') {
			text = text.replaceAll('リノート', 'リポスト').replaceAll('ノート', '投稿');
		}
		return text as T;
	}

	if (Array.isArray(value)) {
		return value.map(item => brandAsNook(item)) as T;
	}

	if (value != null && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, brandAsNook(item)]),
		) as T;
	}

	return value;
}

function withNookLocale(baseLocale: Locale | undefined): NookLocale {
	return Object.assign({}, brandAsNook(baseLocale ?? {}), nookLocale) as NookLocale;
}

export const i18n = markRaw(new I18n<NookLocale>(withNookLocale(locale), _DEV_));

// test 以外では使わないこと。インライン化されてるのでだいたい意味がない
export function updateI18n(newLocale: Locale) {
	i18n.locale = withNookLocale(newLocale);
}
