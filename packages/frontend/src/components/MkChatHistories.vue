<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="history.length > 0" :class="$style.list">
	<MkA
		v-for="item in history"
		:key="item.id"
		:class="[$style.message, { [$style.unread]: !item.isMe && !item.message.isRead }]"
		:to="item.message.toRoomId ? `/chat/room/${item.message.toRoomId}` : `/chat/user/${item.other!.id}`"
	>
		<div v-if="item.message.toRoomId" :class="[$style.messageAvatar, $style.roomAvatar]">
			<i class="ti ti-users-group"></i>
		</div>
		<MkAvatar v-else-if="item.other" :class="$style.messageAvatar" :user="item.other" indicator :preview="false"/>

		<div :class="$style.messageBody">
			<header :class="$style.messageHeader">
				<span v-if="item.message.toRoom" :class="$style.messageHeaderName">{{ item.message.toRoom.name }}</span>
				<MkUserName v-else :class="$style.messageHeaderName" :user="item.other!"/>
				<MkTime :time="item.message.createdAt" :class="$style.messageHeaderTime"/>
			</header>

			<div :class="$style.previewRow">
				<div :class="$style.messageBodyText">
					<span v-if="item.isMe" :class="$style.youSaid">自分: </span>{{ previewText(item.message) }}
				</div>
				<span v-if="!item.isMe && !item.message.isRead" :class="$style.unreadBadge">未読</span>
			</div>
		</div>
		<i :class="$style.chevron" class="ti ti-chevron-right"></i>
	</MkA>
</div>
<MkResult v-if="!initializing && history.length === 0" type="empty" text="まだトークはありません"/>
<MkLoading v-if="initializing"/>
</template>

<script lang="ts" setup>
import { onActivated, onDeactivated, onMounted, ref } from 'vue';
import * as Misskey from 'misskey-js';
import { useInterval } from '@@/js/use-interval.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { ensureSignin } from '@/i.js';

const $i = ensureSignin();

const history = ref<{
	id: string;
	message: Misskey.entities.ChatMessage;
	other: Misskey.entities.ChatMessage['fromUser'] | Misskey.entities.ChatMessage['toUser'] | null;
	isMe: boolean;
}[]>([]);

const initializing = ref(true);
const fetching = ref(false);

function previewText(message: Misskey.entities.ChatMessage): string {
	const text = message.text?.replace(/\s+/g, ' ').trim();
	if (text) return text;
	if (message.file) return `📎 ${message.file.name}`;
	return 'メッセージ';
}

async function fetchHistory() {
	if (fetching.value) return;
	fetching.value = true;

	try {
		const [userMessages, roomMessages] = await Promise.all([
			misskeyApi('chat/history', { room: false }),
			misskeyApi('chat/history', { room: true }),
		]);

		history.value = [...userMessages, ...roomMessages]
			.toSorted((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
			.map(m => ({
				id: m.id,
				message: m,
				other: (!('room' in m) || m.room == null) ? (m.fromUserId === $i.id ? m.toUser : m.fromUser) : null,
				isMe: m.fromUserId === $i.id,
			}));
	} finally {
		fetching.value = false;
		initializing.value = false;
	}
}

let isActivated = true;

onActivated(() => {
	isActivated = true;
	void fetchHistory();
});

onDeactivated(() => {
	isActivated = false;
});

useInterval(() => {
	if (isActivated) void fetchHistory();
}, 1000 * 10, {
	immediate: false,
	afterMounted: true,
});

onMounted(() => {
	void fetchHistory();
});
</script>

<style lang="scss" module>
.list {
	overflow: hidden;
	border: 1px solid #d7e3f1;
	border-radius: 12px;
	background: #fff;
}

.message {
	position: relative;
	display: flex;
	align-items: center;
	gap: 12px;
	min-height: 72px;
	padding: 10px 12px;
	box-sizing: border-box;
	color: #17324d;
	text-decoration: none;
	border-bottom: 1px solid #e8eff7;
	transition: background-color 0.12s ease;
}

.message:last-child {
	border-bottom: 0;
}

.message:hover {
	background: #f8fbff;
}

.unread {
	background: #f7faff;
}

.messageAvatar {
	width: 48px;
	height: 48px;
	flex: 0 0 auto;
}

.roomAvatar {
	display: grid;
	place-items: center;
	border-radius: 14px;
	background: #eef5ff;
	color: #175cd3;
	font-size: 21px;
}

.messageBody {
	flex: 1;
	min-width: 0;
}

.messageHeader,
.previewRow {
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
}

.messageHeader {
	margin-bottom: 4px;
}

.messageHeaderName {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 14px;
	font-weight: 800;
}

.messageHeaderTime {
	margin-left: auto;
	flex: 0 0 auto;
	color: #7a8da2;
	font-size: 10px;
}

.messageBodyText {
	min-width: 0;
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: #667a91;
	font-size: 12px;
}

.youSaid {
	color: #175cd3;
	font-weight: 700;
}

.unreadBadge {
	flex: 0 0 auto;
	padding: 2px 7px;
	border-radius: 999px;
	background: #175cd3;
	color: #fff;
	font-size: 9px;
	font-weight: 800;
}

.chevron {
	flex: 0 0 auto;
	color: #9badbf;
	font-size: 15px;
}

@media (max-width: 500px) {
	.message {
		min-height: 66px;
		padding: 9px 10px;
	}

	.messageAvatar {
		width: 44px;
		height: 44px;
	}

	.chevron {
		display: none;
	}
}
</style>
