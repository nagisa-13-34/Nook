<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<section :class="$style.workspace">
	<aside :class="$style.channelRail">
		<div :class="$style.railHeader">
			<div>
				<strong>{{ l.channels }}</strong>
				<small>{{ channels.length }}</small>
			</div>
			<button class="_button" :class="$style.railAction" :title="l.search" @click="searchOpen = !searchOpen">
				<i class="ti ti-search"></i>
			</button>
		</div>

		<div v-if="searchOpen" :class="$style.channelSearch">
			<i class="ti ti-search"></i>
			<input v-model="channelFilter" :placeholder="l.search">
		</div>

		<div :class="$style.channelScroll">
			<section v-if="textChannels.length > 0" :class="$style.channelGroup">
				<div :class="$style.groupTitle">{{ l.textChannels }}</div>
				<button
					v-for="item in textChannels"
					:key="item.id"
					class="_button"
					:class="[$style.channel, { [$style.active]: selected?.id === item.id }]"
					@click="select(item)"
				>
					<i :class="channelIcon(item)"></i>
					<span>{{ item.name }}</span>
				</button>
			</section>

			<section v-if="voiceChannels.length > 0" :class="$style.channelGroup">
				<div :class="$style.groupTitle">{{ l.voiceChannels }}</div>
				<button
					v-for="item in voiceChannels"
					:key="item.id"
					class="_button"
					:class="[$style.channel, { [$style.active]: selected?.id === item.id }]"
					@click="select(item)"
				>
					<i class="ti ti-volume"></i>
					<span>{{ item.name }}</span>
				</button>
			</section>
		</div>
	</aside>

	<main :class="$style.main">
		<NookCommunityVoice
			v-if="voiceEnabled && selected?.kind === 'voice'"
			:communityId="communityId"
			:channel="selected"
			:channels="channels"
			:canManage="canManageVoice"
		/>

		<template v-else-if="selected">
			<header :class="$style.conversationHeader">
				<div :class="$style.channelTitle">
					<i :class="channelIcon(selected)"></i>
					<div>
						<strong>{{ selected.name }}</strong>
						<small v-if="selected.topic">{{ selected.topic }}</small>
					</div>
				</div>
				<div :class="$style.headerSearch">
					<i class="ti ti-search"></i>
					<input v-model="query" :placeholder="l.search" @keyup.enter="search">
				</div>
			</header>

			<div v-if="searchResults.length > 0" :class="$style.searchResults">
				<div :class="$style.searchResultsHeader">
					<strong>{{ l.search }}</strong>
					<button class="_button" @click="searchResults = []"><i class="ti ti-x"></i></button>
				</div>
				<button
					v-for="result in searchResults"
					:key="result.id"
					class="_button"
					:class="$style.searchResult"
					@click="openSearchResult(result.channelId)"
				>
					<small>#{{ channelName(result.channelId) }}</small>
					<span>{{ result.body }}</span>
				</button>
			</div>

			<div ref="messagesEl" :class="$style.messages">
				<div v-if="messages.length === 0" :class="$style.welcome">
					<div :class="$style.welcomeIcon"><i :class="channelIcon(selected)"></i></div>
					<h2>{{ selected.name }}</h2>
					<p v-if="selected.topic">{{ selected.topic }}</p>
				</div>

				<article v-for="message in messages" :key="message.id" :class="$style.message">
					<div :class="$style.avatar">{{ authorInitial(message) }}</div>
					<div :class="$style.messageContent">
						<div :class="$style.messageMeta">
							<strong>{{ authorName(message) }}</strong>
							<span v-if="message.botId" :class="$style.botBadge">BOT</span>
							<time>{{ formatTime(message.createdAt) }}</time>
						</div>
						<div :class="$style.body">{{ message.body }}</div>
						<NookAutoTranslation kind="communityMessage" :objectId="message.id" :text="message.body"/>
					</div>
				</article>
			</div>

			<form :class="$style.composer" @submit.prevent="send">
				<div :class="$style.composerBox">
					<textarea
						v-model="draft"
						maxlength="8000"
						rows="1"
						:placeholder="`${l.send} #${selected.name}`"
						@keydown.enter.exact.prevent="send"
					></textarea>
					<button class="_button" :class="$style.sendButton" :disabled="!draft.trim()" type="submit" :title="l.send">
						<i class="ti ti-send"></i>
					</button>
				</div>
			</form>
		</template>

		<div v-else :class="$style.empty">
			<i class="ti ti-message-circle"></i>
			<strong>{{ l.noChannels }}</strong>
		</div>
	</main>

	<aside :class="$style.memberRail">
		<div :class="$style.memberHeader">
			<strong>{{ l.members }}</strong>
			<small>{{ activeMembers.length }}</small>
		</div>
		<div :class="$style.memberList">
			<div v-for="member in activeMembers" :key="member.userId" :class="$style.member">
				<div :class="$style.memberAvatar">{{ memberInitial(member) }}</div>
				<div :class="$style.memberText">
					<strong>{{ member.nickname || member.userId }}</strong>
					<small>{{ roleLabel(member.baseRole) }}</small>
				</div>
			</div>
		</div>
	</aside>
</section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import { nookApi } from './nook-api.js';
import { communityLabels as l } from './labels.js';
import NookAutoTranslation from './NookAutoTranslation.vue';
import NookCommunityVoice from './NookCommunityVoice.vue';
import type { CommunityChannel, CommunityMember, CommunityMessage } from './types.js';

const props = defineProps<{
	communityId: string;
	canManageVoice: boolean;
	voiceEnabled: boolean;
}>();

const channels = ref<CommunityChannel[]>([]);
const selected = ref<CommunityChannel | null>(null);
const messages = ref<CommunityMessage[]>([]);
const members = ref<CommunityMember[]>([]);
const draft = ref('');
const query = ref('');
const channelFilter = ref('');
const searchOpen = ref(false);
const searchResults = ref<Array<{ id: string; channelId: string; body: string }>>([]);
const messagesEl = useTemplateRef('messagesEl');
let timer: number | undefined;

const filteredChannels = computed(() => {
	const needle = channelFilter.value.trim().toLowerCase();
	return needle.length === 0
		? channels.value
		: channels.value.filter(channel => channel.name.toLowerCase().includes(needle));
});

const textChannels = computed(() => filteredChannels.value.filter(channel => channel.kind !== 'voice'));
const voiceChannels = computed(() => filteredChannels.value.filter(channel => channel.kind === 'voice'));
const activeMembers = computed(() => {
	const rank: Record<string, number> = { owner: 0, admin: 1, moderator: 2, member: 3 };
	return members.value
		.filter(member => member.state === 'active')
		.toSorted((a, b) => (rank[a.baseRole] ?? 9) - (rank[b.baseRole] ?? 9));
});

async function loadChannels() {
	const loaded = await nookApi<CommunityChannel[]>('nook/community/channels/list', { communityId: props.communityId });
	channels.value = props.voiceEnabled ? loaded : loaded.filter(channel => channel.kind !== 'voice');
	if (selected.value == null || !channels.value.some(channel => channel.id === selected.value?.id)) {
		selected.value = channels.value.find(channel => channel.kind !== 'voice') ?? channels.value[0] ?? null;
	}
	await loadMessages();
}

async function loadMembers() {
	members.value = await nookApi<CommunityMember[]>('nook/community/members/list', { communityId: props.communityId }).catch(() => []);
}

async function loadMessages() {
	if (!selected.value || selected.value.kind === 'voice') {
		messages.value = [];
		return;
	}
	messages.value = await nookApi('nook/community/messages/list', {
		communityId: props.communityId,
		channelId: selected.value.id,
		limit: 100,
	});
}

async function select(item: CommunityChannel) {
	selected.value = item;
	searchResults.value = [];
	await loadMessages();
	await scrollToBottom();
}

async function send() {
	if (!selected.value || selected.value.kind === 'voice' || !draft.value.trim()) return;
	await nookApi('nook/community/messages/create', {
		communityId: props.communityId,
		channelId: selected.value.id,
		body: draft.value.trim(),
	});
	draft.value = '';
	await loadMessages();
	await scrollToBottom();
}

async function search() {
	if (!query.value.trim()) {
		searchResults.value = [];
		return;
	}
	searchResults.value = await nookApi('nook/community/search', {
		communityId: props.communityId,
		query: query.value.trim(),
		limit: 50,
	});
}

async function openSearchResult(channelId: string) {
	const channel = channels.value.find(item => item.id === channelId);
	if (channel) await select(channel);
}

function channelName(id: string) {
	return channels.value.find(channel => channel.id === id)?.name ?? id;
}

function channelIcon(channel: CommunityChannel) {
	if (channel.kind === 'announcement') return 'ti ti-speakerphone';
	if (channel.kind === 'media') return 'ti ti-photo';
	if (channel.kind === 'forum') return 'ti ti-messages';
	if (channel.kind === 'voice') return 'ti ti-volume';
	return 'ti ti-hash';
}

function authorName(message: CommunityMessage) {
	if (message.botId) return message.botId;
	if (!message.userId) return 'Unknown';
	const member = members.value.find(item => item.userId === message.userId);
	return member?.nickname || message.userId;
}

function authorInitial(message: CommunityMessage) {
	return authorName(message).slice(0, 1).toUpperCase();
}

function memberInitial(member: CommunityMember) {
	return (member.nickname || member.userId).slice(0, 1).toUpperCase();
}

function roleLabel(role: string) {
	if (role === 'owner') return l.owner;
	if (role === 'admin') return l.administrator;
	if (role === 'moderator') return l.moderator;
	return l.member;
}

function formatTime(value: string) {
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(value));
}

async function scrollToBottom() {
	await nextTick();
	if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
}

onMounted(async () => {
	await Promise.all([loadChannels(), loadMembers()]);
	await scrollToBottom();
	timer = window.setInterval(() => {
		void loadMessages();
	}, 3000);
});

onBeforeUnmount(() => {
	if (timer) window.clearInterval(timer);
});
</script>

<style lang="scss" module>
.workspace {
	--community-border: #d7e3f1;
	--community-blue: #175cd3;
	--community-blue-soft: #eef5ff;
	--community-yellow: #ffd84d;
	--community-ink: #17324d;
	display: grid;
	grid-template-columns: 230px minmax(0, 1fr) 220px;
	height: min(760px, calc(100dvh - 150px));
	min-height: 520px;
	background: #fff;
	border: 1px solid var(--community-border);
	border-radius: 10px;
	overflow: hidden;
	color: var(--community-ink);
}

.channelRail,
.memberRail {
	min-width: 0;
	background: #f8fbff;
}

.channelRail {
	display: flex;
	flex-direction: column;
	border-right: 1px solid var(--community-border);
}

.railHeader,
.memberHeader,
.conversationHeader {
	height: 54px;
	box-sizing: border-box;
	border-bottom: 1px solid var(--community-border);
}

.railHeader,
.memberHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 12px;
}

.railHeader small,
.memberHeader small {
	margin-left: 6px;
	color: #718399;
}

.railAction {
	width: 30px;
	height: 30px;
	border-radius: 6px;
	color: #5d7188;
}

.railAction:hover {
	background: var(--community-blue-soft);
	color: var(--community-blue);
}

.channelSearch {
	display: flex;
	align-items: center;
	gap: 7px;
	margin: 8px;
	padding: 7px 9px;
	background: #fff;
	border: 1px solid var(--community-border);
	border-radius: 7px;
	color: #718399;
}

.channelSearch input {
	min-width: 0;
	width: 100%;
	border: 0;
	outline: 0;
	background: transparent;
	color: var(--community-ink);
}

.channelScroll,
.memberList {
	overflow-y: auto;
}

.channelScroll {
	padding: 8px;
}

.channelGroup + .channelGroup {
	margin-top: 14px;
}

.groupTitle {
	padding: 4px 8px 5px;
	font-size: 10px;
	font-weight: 800;
	letter-spacing: 0.08em;
	color: #718399;
}

.channel {
	display: flex;
	align-items: center;
	gap: 9px;
	width: 100%;
	min-height: 36px;
	padding: 0 9px;
	border-radius: 6px;
	text-align: left;
	color: #5d7188;
}

.channel i {
	width: 18px;
	text-align: center;
	font-size: 17px;
}

.channel span {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 14px;
	font-weight: 620;
}

.channel:hover {
	background: #eef3f8;
	color: var(--community-ink);
}

.channel.active {
	background: var(--community-blue-soft);
	color: var(--community-blue);
}

.main {
	position: relative;
	min-width: 0;
	display: flex;
	flex-direction: column;
	background: #fff;
}

.conversationHeader {
	flex: 0 0 auto;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 0 16px;
}

.channelTitle {
	min-width: 0;
	display: flex;
	align-items: center;
	gap: 10px;
}

.channelTitle > i {
	font-size: 20px;
	color: #718399;
}

.channelTitle div {
	min-width: 0;
	display: flex;
	align-items: baseline;
	gap: 10px;
}

.channelTitle strong {
	font-size: 15px;
}

.channelTitle small {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: #718399;
}

.headerSearch {
	width: min(230px, 34%);
	display: flex;
	align-items: center;
	gap: 7px;
	padding: 6px 9px;
	border: 1px solid var(--community-border);
	border-radius: 7px;
	color: #718399;
}

.headerSearch input {
	min-width: 0;
	width: 100%;
	border: 0;
	outline: 0;
	background: transparent;
	color: var(--community-ink);
}

.messages {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	padding: 14px 0 20px;
}

.welcome {
	padding: 32px 20px 22px;
	border-bottom: 1px solid var(--community-border);
}

.welcomeIcon {
	width: 44px;
	height: 44px;
	display: grid;
	place-items: center;
	border-radius: 12px;
	background: var(--community-blue);
	color: #fff;
	font-size: 22px;
}

.welcome h2 {
	margin: 13px 0 3px;
	font-size: 21px;
}

.welcome p {
	margin: 0;
	color: #718399;
}

.message {
	display: flex;
	gap: 11px;
	padding: 8px 18px;
}

.message:hover {
	background: #f9fbfd;
}

.avatar,
.memberAvatar {
	flex: 0 0 auto;
	display: grid;
	place-items: center;
	background: var(--community-blue-soft);
	color: var(--community-blue);
	font-weight: 800;
}

.avatar {
	width: 36px;
	height: 36px;
	border-radius: 10px;
}

.messageContent {
	min-width: 0;
	flex: 1;
}

.messageMeta {
	display: flex;
	align-items: baseline;
	gap: 7px;
}

.messageMeta strong {
	font-size: 14px;
}

.messageMeta time {
	font-size: 10px;
	color: #8797aa;
}

.botBadge {
	padding: 1px 4px;
	border-radius: 3px;
	background: var(--community-blue);
	color: #fff;
	font-size: 9px;
	font-weight: 800;
}

.body {
	margin-top: 2px;
	white-space: pre-wrap;
	word-break: break-word;
	font-size: 14px;
	line-height: 1.55;
}

.composer {
	flex: 0 0 auto;
	padding: 0 14px 14px;
}

.composerBox {
	display: flex;
	align-items: flex-end;
	gap: 8px;
	padding: 8px 8px 8px 12px;
	border: 1px solid var(--community-border);
	border-radius: 9px;
	background: #f8fbff;
}

.composer textarea {
	flex: 1;
	min-height: 24px;
	max-height: 140px;
	padding: 4px 0;
	resize: none;
	border: 0;
	outline: 0;
	background: transparent;
	color: var(--community-ink);
	font: inherit;
	line-height: 1.5;
}

.sendButton {
	width: 36px;
	height: 36px;
	border-radius: 7px;
	background: var(--community-yellow);
	color: var(--community-ink);
}

.sendButton:disabled {
	opacity: 0.45;
}

.searchResults {
	position: absolute;
	z-index: 5;
	top: 55px;
	right: 0;
	width: min(420px, 60vw);
	max-height: 360px;
	overflow-y: auto;
	background: #fff;
	border: 1px solid var(--community-border);
	border-radius: 0 0 8px 8px;
	box-shadow: 0 8px 24px rgba(23, 50, 77, 0.12);
}

.searchResultsHeader {
	position: sticky;
	top: 0;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 9px 12px;
	background: #fff;
	border-bottom: 1px solid var(--community-border);
}

.searchResult {
	display: block;
	width: 100%;
	padding: 9px 12px;
	text-align: left;
	border-bottom: 1px solid var(--community-border);
}

.searchResult small {
	display: block;
	margin-bottom: 2px;
	color: var(--community-blue);
}

.memberRail {
	display: flex;
	flex-direction: column;
	border-left: 1px solid var(--community-border);
}

.memberList {
	padding: 8px;
}

.member {
	display: flex;
	align-items: center;
	gap: 9px;
	padding: 7px;
	border-radius: 7px;
}

.member:hover {
	background: #eef3f8;
}

.memberAvatar {
	width: 30px;
	height: 30px;
	border-radius: 9px;
	font-size: 12px;
}

.memberText {
	min-width: 0;
	display: flex;
	flex-direction: column;
}

.memberText strong,
.memberText small {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.memberText strong {
	font-size: 12px;
}

.memberText small {
	font-size: 10px;
	color: #718399;
}

.empty {
	flex: 1;
	display: grid;
	place-items: center;
	align-content: center;
	gap: 9px;
	color: #718399;
}

.empty i {
	font-size: 30px;
}

@media (max-width: 1050px) {
	.workspace {
		grid-template-columns: 210px minmax(0, 1fr);
	}

	.memberRail {
		display: none;
	}
}

@media (max-width: 700px) {
	.workspace {
		grid-template-columns: 1fr;
		height: auto;
		min-height: 0;
		border-inline: 0;
		border-radius: 0;
	}

	.channelRail {
		border-right: 0;
		border-bottom: 1px solid var(--community-border);
	}

	.channelScroll {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		padding: 8px;
	}

	.channelGroup {
		display: flex;
		gap: 5px;
	}

	.channelGroup + .channelGroup {
		margin-top: 0;
	}

	.groupTitle,
	.memberRail {
		display: none;
	}

	.channel {
		width: auto;
		min-width: max-content;
	}

	.main {
		min-height: 70dvh;
	}

	.headerSearch {
		display: none;
	}

	.channelTitle div {
		display: block;
	}

	.channelTitle small {
		display: none;
	}

	.searchResults {
		position: fixed;
		top: 90px;
		right: 12px;
		left: 12px;
		width: auto;
	}
}
</style>