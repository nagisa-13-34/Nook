/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

const ja = {
	community: 'コミュニティ', channels: 'チャンネル', announcements: 'お知らせ', events: 'イベント', members: 'メンバー', bots: 'Bot', admin: '管理', join: '参加', apply: '参加申請', invite: '招待', rules: 'ルール', pins: '固定', search: '検索', send: '送信', create: '作成', save: '保存', delete: '削除', voice: 'ボイス', leave: '退出', loading: '読み込み中…', autoTranslate: '自動翻訳', translationLanguage: '翻訳先', music: '音楽Bot', tts: '読み上げBot', copy: 'コピー', role: 'ロール', settings: '設定',
};
const en: typeof ja = {
	community: 'Community', channels: 'Channels', announcements: 'Announcements', events: 'Events', members: 'Members', bots: 'Bots', admin: 'Admin', join: 'Join', apply: 'Apply', invite: 'Invite', rules: 'Rules', pins: 'Pins', search: 'Search', send: 'Send', create: 'Create', save: 'Save', delete: 'Delete', voice: 'Voice', leave: 'Leave', loading: 'Loading…', autoTranslate: 'Auto translate', translationLanguage: 'Translate to', music: 'Music bot', tts: 'TTS bot', copy: 'Copy', role: 'Role', settings: 'Settings',
};

export const communityLabels = typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ja') ? ja : en;
