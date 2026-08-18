/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

const ja = {
	community: 'コミュニティ', channels: 'チャンネル', announcements: 'お知らせ', events: 'イベント', members: 'メンバー', bots: 'Bot', admin: '管理', administrator: '管理者', info: '情報',
	category: 'カテゴリ', noCategory: 'カテゴリなし', categoryHint: '親に指定したチャンネルはカテゴリ見出しとして表示されます。', textChannels: 'テキスト', voiceChannels: 'ボイス', defaultChannelName: '一般',
	owner: 'オーナー', moderator: 'モデレーター', member: 'メンバー', noChannels: 'チャンネルがありません。', noInformation: 'まだ情報はありません。',
	join: '参加', apply: '参加申請', invite: '招待', rules: 'ルール', pins: '固定', search: '検索', send: '送信', create: '作成', save: '保存', delete: '削除', cancel: 'キャンセル', confirm: '確認', voice: 'ボイス', leave: '退出', loading: '読み込み中…',
	autoTranslate: '自動翻訳', translationLanguage: '翻訳先', selectLanguage: '言語を選択', music: '音楽Bot', tts: '読み上げBot', copy: 'コピー', copied: 'コピーしました', share: '共有',
	role: 'ロール', roleName: 'ロール名', roleColor: 'ロール色', roleHint: '色と権限をロールごとに設定できます。', permissions: '権限', deleteRoleConfirm: 'このロールを削除しますか？', settings: '設定',
	permissionCommunityManage: 'コミュニティ設定', permissionChannelsManage: 'チャンネル管理', permissionMessagesPost: 'メッセージ送信', permissionMessagesModerate: 'メッセージ管理', permissionThreadsManage: 'スレッド管理', permissionRolesManage: 'ロール管理', permissionMembersInvite: 'メンバー招待', permissionMembersManage: 'メンバー管理', permissionMembersKick: 'メンバーを退出させる', permissionMembersBan: 'メンバーをBAN', permissionMessagesSearch: 'メッセージ検索', permissionPinsManage: '固定メッセージ管理', permissionRulesManage: 'ルール管理', permissionAnnouncementsManage: 'お知らせ管理', permissionEventsManage: 'イベント管理', permissionVoiceManage: 'ボイス管理', permissionBotsManage: 'Bot管理',
	joinMode: '参加方式', joinModeOpen: '誰でも参加', joinModeApproval: '承認制', joinModeInvite: '招待制', joinModePrivate: '非公開', discoverable: '検索・発見に表示する',
	ageMode: '年齢モード', ageModeHint: '参加できる年齢層を指定します。年齢を確認できないアカウントは「未成年のみ」「成人のみ」には参加できません。', ageModeMinorsOnly: '未成年のみ', ageModeMixed: '全年齢', ageModeAdultsOnly: '成人のみ', ageModeConflict: '現在のメンバーに、この年齢モードの条件に合わないアカウントがいるため変更できません。',
	settingsSaved: '設定を保存しました', settingsSaveFailed: '設定を保存できませんでした',
	addRule: 'ルールを追加', noRules: 'ルールはまだありません。', inviteCommunity: 'コミュニティに招待', inviteExpires: '有効期限', never: '期限なし', oneHour: '1時間', oneDay: '1日', oneWeek: '7日', oneMonth: '30日', maxUses: '利用回数', unlimited: '無制限', createInvite: '招待リンクを作成', revoke: '無効化',
	pin: '固定する', unpin: '固定を解除', pinned: '固定済み',
	transferOwnership: '所有権を移譲', transferOwnershipHint: '移譲後、あなたは管理者になります。', selectNewOwner: '新しいオーナーを選択', transfer: '移譲する', transferConfirm: 'このメンバーに所有権を移譲しますか？',
	deleteCommunity: 'コミュニティを削除', deleteCommunityHint: 'コミュニティとNookコミュニティ内のデータを完全に削除します。この操作は取り消せません。', deleteCommunityConfirm: '本当にこのコミュニティを完全に削除しますか？', typeCommunityName: '確認のためコミュニティ名を入力',
};

const en: typeof ja = {
	community: 'Community', channels: 'Channels', announcements: 'Announcements', events: 'Events', members: 'Members', bots: 'Bots', admin: 'Admin', administrator: 'Administrator', info: 'Info',
	category: 'Category', noCategory: 'No category', categoryHint: 'A channel selected as a parent is shown as a category heading.', textChannels: 'Text', voiceChannels: 'Voice', defaultChannelName: 'general',
	owner: 'Owner', moderator: 'Moderator', member: 'Member', noChannels: 'No channels yet.', noInformation: 'No information yet.',
	join: 'Join', apply: 'Apply', invite: 'Invite', rules: 'Rules', pins: 'Pins', search: 'Search', send: 'Send', create: 'Create', save: 'Save', delete: 'Delete', cancel: 'Cancel', confirm: 'Confirm', voice: 'Voice', leave: 'Leave', loading: 'Loading…',
	autoTranslate: 'Auto translate', translationLanguage: 'Translate to', selectLanguage: 'Select language', music: 'Music bot', tts: 'TTS bot', copy: 'Copy', copied: 'Copied', share: 'Share',
	role: 'Role', roleName: 'Role name', roleColor: 'Role color', roleHint: 'Choose a color and permissions for each role.', permissions: 'Permissions', deleteRoleConfirm: 'Delete this role?', settings: 'Settings',
	permissionCommunityManage: 'Community settings', permissionChannelsManage: 'Manage channels', permissionMessagesPost: 'Send messages', permissionMessagesModerate: 'Moderate messages', permissionThreadsManage: 'Manage threads', permissionRolesManage: 'Manage roles', permissionMembersInvite: 'Invite members', permissionMembersManage: 'Manage members', permissionMembersKick: 'Remove members', permissionMembersBan: 'Ban members', permissionMessagesSearch: 'Search messages', permissionPinsManage: 'Manage pins', permissionRulesManage: 'Manage rules', permissionAnnouncementsManage: 'Manage announcements', permissionEventsManage: 'Manage events', permissionVoiceManage: 'Manage voice', permissionBotsManage: 'Manage bots',
	joinMode: 'Join mode', joinModeOpen: 'Open', joinModeApproval: 'Approval required', joinModeInvite: 'Invite only', joinModePrivate: 'Private', discoverable: 'Show in discovery',
	ageMode: 'Age mode', ageModeHint: 'Choose which age groups may join. Accounts whose age cannot be verified cannot join minors-only or adults-only Communities.', ageModeMinorsOnly: 'Minors only', ageModeMixed: 'All ages', ageModeAdultsOnly: 'Adults only', ageModeConflict: 'This age mode cannot be applied because one or more current members do not match it.',
	settingsSaved: 'Settings saved', settingsSaveFailed: 'Could not save settings',
	addRule: 'Add rule', noRules: 'No rules yet.', inviteCommunity: 'Invite to community', inviteExpires: 'Expires', never: 'Never', oneHour: '1 hour', oneDay: '1 day', oneWeek: '7 days', oneMonth: '30 days', maxUses: 'Uses', unlimited: 'Unlimited', createInvite: 'Create invite link', revoke: 'Revoke',
	pin: 'Pin', unpin: 'Unpin', pinned: 'Pinned',
	transferOwnership: 'Transfer ownership', transferOwnershipHint: 'You will become an administrator after the transfer.', selectNewOwner: 'Select new owner', transfer: 'Transfer', transferConfirm: 'Transfer ownership to this member?',
	deleteCommunity: 'Delete community', deleteCommunityHint: 'Permanently delete this community and its Nook community data. This cannot be undone.', deleteCommunityConfirm: 'Permanently delete this community?', typeCommunityName: 'Type the community name to confirm',
};

export const communityLabels = typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ja') ? ja : en;
