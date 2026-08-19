<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="[$style.root, { [$style.isMe]: isMe }]">
	<MkAvatar
		v-if="!isMe"
		:class="[$style.avatar, prefer.s.useStickyIcons ? $style.useSticky : null]"
		:user="message.fromUser!"
		:link="true"
		:preview="false"
	/>
	<div :class="[$style.body, message.file != null ? $style.fullWidth : null]" @contextmenu.stop="onContextmenu">
		<div v-if="!isMe && prefer.s['chat.showSenderName'] && message.fromUser != null" :class="$style.header">
			<MkUserName :user="message.fromUser"/>
		</div>

		<div :class="[$style.bubble, { [$style.myBubble]: isMe, [$style.fileBubble]: message.file != null }]">
			<Mfm
				v-if="message.text"
				ref="text"
				class="_selectable"
				:text="message.text"
				:i="$i"
				:nyaize="'respect'"
				:enableEmojiMenu="true"
				:enableEmojiMenuReaction="true"
			/>
			<MkMediaList v-if="message.file" :mediaList="[message.file]"/>
		</div>

		<MkUrlPreview v-for="previewUrl in urls" :key="previewUrl" :url="previewUrl" :class="$style.urlPreview"/>

		<div :class="$style.footer">
			<button class="_button" :class="$style.menuButton" aria-label="メッセージメニュー" @click="showMenu"><i class="ti ti-dots"></i></button>
			<span v-if="isRead" :class="$style.read">既読</span>
			<MkTime :class="$style.time" :time="message.createdAt"/>
			<MkA v-if="isSearchResult && 'toRoom' in message && message.toRoom != null" :to="`/chat/room/${message.toRoomId}`">{{ message.toRoom.name }}</MkA>
			<MkA v-if="isSearchResult && 'toUser' in message && message.toUser != null && isMe" :to="`/chat/user/${message.toUserId}`">@{{ message.toUser.username }}</MkA>
		</div>

		<TransitionGroup
			:enterActiveClass="prefer.s.animation ? $style.transition_reaction_enterActive : ''"
			:leaveActiveClass="prefer.s.animation ? $style.transition_reaction_leaveActive : ''"
			:enterFromClass="prefer.s.animation ? $style.transition_reaction_enterFrom : ''"
			:leaveToClass="prefer.s.animation ? $style.transition_reaction_leaveTo : ''"
			:moveClass="prefer.s.animation ? $style.transition_reaction_move : ''"
			tag="div"
			:class="$style.reactions"
		>
			<button
				v-for="record in message.reactions"
				:key="record.reaction + record.user.id"
				class="_button"
				:class="[$style.reaction, record.user.id === $i.id ? $style.reactionMy : null]"
				@click="onReactionClick(record)"
			>
				<MkAvatar :user="record.user" :link="false" :class="$style.reactionAvatar"/>
				<MkReactionIcon
					:withTooltip="true"
					:reaction="record.reaction.replace(/^:(\w+):$/, ':$1@.:')"
					:noStyle="true"
					:class="$style.reactionIcon"
				/>
			</button>
		</TransitionGroup>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, provide } from 'vue';
import * as mfm from 'mfm-js';
import * as Misskey from 'misskey-js';
import { url } from '@@/js/config.js';
import { isLink } from '@@/js/is-link.js';
import type { MenuItem } from '@/types/menu.js';
import type { NormalizedChatMessage } from './room.vue';
import { extractUrlFromMfm } from '@/utility/extract-url-from-mfm.js';
import MkUrlPreview from '@/components/MkUrlPreview.vue';
import { ensureSignin } from '@/i.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { copyToClipboard } from '@/utility/copy-to-clipboard.js';
import MkMediaList from '@/components/MkMediaList.vue';
import { reactionPicker } from '@/utility/reaction-picker.js';
import * as sound from '@/utility/sound.js';
import MkReactionIcon from '@/components/MkReactionIcon.vue';
import { prefer } from '@/preferences.js';
import { DI } from '@/di.js';
import { getHTMLElementOrNull } from '@/utility/get-dom-node-or-null.js';

const $i = ensureSignin();

const props = defineProps<{
	message: NormalizedChatMessage | Misskey.entities.ChatMessage;
	isSearchResult?: boolean;
}>();

const isMe = computed(() => props.message.fromUserId === $i.id);
const isRead = computed(() => isMe.value && 'isRead' in props.message && props.message.isRead === true);
const urls = computed(() => props.message.text ? extractUrlFromMfm(mfm.parse(props.message.text)) : []);

provide(DI.mfmEmojiReactCallback, (reaction) => {
	if ($i.policies.chatAvailability !== 'available') return;

	sound.playMisskeySfx('reaction');
	void misskeyApi('chat/messages/react', {
		messageId: props.message.id,
		reaction,
	});
});

function requestReply() {
	window.dispatchEvent(new CustomEvent('nook-chat-reply', {
		detail: {
			message: props.message,
		},
	}));
}

function react(ev: PointerEvent) {
	if ($i.policies.chatAvailability !== 'available') return;

	const targetEl = getHTMLElementOrNull(ev.currentTarget ?? ev.target);
	if (!targetEl) return;

	reactionPicker.show(targetEl, null, async (reaction) => {
		sound.playMisskeySfx('reaction');
		await misskeyApi('chat/messages/react', {
			messageId: props.message.id,
			reaction,
		});
	});
}

function onReactionClick(record: Misskey.entities.ChatMessage['reactions'][0]) {
	if ($i.policies.chatAvailability !== 'available') return;

	if (record.user.id === $i.id) {
		void misskeyApi('chat/messages/unreact', {
			messageId: props.message.id,
			reaction: record.reaction,
		});
	} else if (!props.message.reactions.some(r => r.user.id === $i.id && r.reaction === record.reaction)) {
		sound.playMisskeySfx('reaction');
		void misskeyApi('chat/messages/react', {
			messageId: props.message.id,
			reaction: record.reaction,
		});
	}
}

function onContextmenu(ev: PointerEvent) {
	if (ev.target && isLink(ev.target as HTMLElement)) return;
	if (window.getSelection()?.toString() !== '') return;
	showMenu(ev, true);
}

function showMenu(ev: PointerEvent, contextmenu = false) {
	const menu: MenuItem[] = [];

	if ($i.policies.chatAvailability === 'available') {
		menu.push({
			text: '返信',
			icon: 'ti ti-arrow-back-up',
			action: requestReply,
		});
	}

	if (!isMe.value && $i.policies.chatAvailability === 'available') {
		menu.push({
			text: i18n.ts.reaction,
			icon: 'ti ti-mood-plus',
			action: (event) => {
				react(event);
			},
		});
	}

	menu.push({
		text: i18n.ts.copyContent,
		icon: 'ti ti-copy',
		action: () => {
			copyToClipboard(props.message.text ?? '');
		},
	});

	if (isMe.value && $i.policies.chatAvailability === 'available') {
		menu.push({ type: 'divider' });
		menu.push({
			text: i18n.ts.delete,
			icon: 'ti ti-trash',
			danger: true,
			action: () => {
				void misskeyApi('chat/messages/delete', {
					messageId: props.message.id,
				});
			},
		});
	}

	if (!isMe.value && props.message.fromUser != null) {
		menu.push({ type: 'divider' });
		menu.push({
			text: i18n.ts.reportAbuse,
			icon: 'ti ti-exclamation-circle',
			action: async () => {
				const localUrl = `${url}/chat/messages/${props.message.id}`;
				const { dispose } = await os.popupAsyncWithDialog(import('@/components/MkAbuseReportWindow.vue').then(x => x.default), {
					user: props.message.fromUser!,
					initialComment: `${localUrl}\n-----\n`,
				}, {
					closed: () => dispose(),
				});
			},
		});
	}

	if (contextmenu) {
		os.contextMenu(menu, ev);
	} else {
		os.popupMenu(menu, ev.currentTarget ?? ev.target);
	}
}
</script>

<style lang="scss" module>
.transition_reaction_move,
.transition_reaction_enterActive,
.transition_reaction_leaveActive {
	transition: opacity 0.2s cubic-bezier(0,.5,.5,1), transform 0.2s cubic-bezier(0,.5,.5,1) !important;
}

.transition_reaction_enterFrom,
.transition_reaction_leaveTo {
	opacity: 0;
	transform: scale(0.7);
}

.transition_reaction_leaveActive {
	position: absolute;
}

.root {
	position: relative;
	display: flex;
	align-items: flex-end;
	gap: 8px;
	max-width: 86%;

	&.isMe {
		margin-left: auto;
		text-align: right;

		.body {
			align-items: flex-end;
		}

		.footer {
			justify-content: flex-end;
		}
	}
}

.avatar {
	display: block;
	width: 38px;
	height: 38px;
	flex: 0 0 auto;

	&.useSticky {
		position: sticky;
		top: calc(16px + var(--MI-stickyTop, 0px));
	}
}

.body {
	display: flex;
	min-width: 0;
	flex-direction: column;
	align-items: flex-start;
}

.fullWidth {
	width: min(520px, calc(100cqw - 72px));
}

.header {
	margin: 0 4px 4px;
	color: #667a91;
	font-size: 11px;
}

.bubble {
	max-width: 100%;
	padding: 9px 12px;
	box-sizing: border-box;
	background: #fff;
	border: 1px solid #d7e3f1;
	border-radius: 15px 15px 15px 5px;
	color: #17324d;
	text-align: left;
	overflow: hidden;
	overflow-wrap: anywhere;
	line-height: 1.5;
}

.myBubble {
	background: #175cd3;
	border-color: #175cd3;
	border-radius: 15px 15px 5px 15px;
	color: #fff;
}

.fileBubble {
	padding: 5px;
	background: #fff;
	border-color: #d7e3f1;
	color: #17324d;
}

.urlPreview {
	max-width: 460px;
	margin-top: 6px;
}

.footer {
	display: flex;
	align-items: center;
	gap: 5px;
	min-height: 18px;
	margin: 3px 4px 0;
	color: #718399;
	font-size: 10px;
}

.menuButton {
	display: grid;
	place-items: center;
	width: 20px;
	height: 18px;
	border-radius: 5px;
	color: #8ca0b5;
}

.menuButton:hover {
	background: #eef5ff;
	color: #175cd3;
}

.read {
	color: #175cd3;
	font-weight: 700;
}

.time {
	opacity: 0.85;
}

.reactions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 4px;
	margin-top: 4px;

	&:empty {
		display: none;
	}
}

.reaction {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 3px 6px;
	background: #fff;
	border: 1px solid #d7e3f1;
	border-radius: 999px;

	&.reactionMy {
		background: #eef5ff;
		border-color: #a9c8ef;
	}
}

.reactionAvatar {
	width: 16px;
	height: 16px;
}

.reactionIcon {
	width: 18px;
	height: 18px;
}

@container (max-width: 450px) {
	.root {
		max-width: 92%;
	}

	.avatar {
		width: 34px;
		height: 34px;
	}

	.bubble {
		font-size: 14px;
	}
}
</style>
