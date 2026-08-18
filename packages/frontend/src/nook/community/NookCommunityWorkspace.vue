<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<section :class="[$style.workspace, { [$style.systemOpen]: systemView !== null }]">
	<aside :class="$style.rail">
		<div :class="$style.railHeader"><strong>{{ l.channels }}</strong></div>
		<div :class="$style.filter"><i class="ti ti-search"></i><input v-model="filter" :placeholder="l.search"></div>
		<div :class="$style.railBody">
			<div :class="$style.fixed">
				<button class="_button" :class="[$style.channel, { [$style.active]: systemView === 'info' }]" @click="openSystem('info')"><i class="ti ti-info-circle"></i><span>{{ l.info }}</span><i class="ti ti-lock" :class="$style.lock"></i></button>
				<button class="_button" :class="[$style.channel, { [$style.active]: systemView === 'announcements' }]" @click="openSystem('announcements')"><i class="ti ti-speakerphone"></i><span>{{ l.announcements }}</span></button>
				<button class="_button" :class="[$style.channel, { [$style.active]: systemView === 'members' }]" @click="openSystem('members')"><i class="ti ti-users"></i><span>{{ l.members }}</span><i class="ti ti-lock" :class="$style.lock"></i></button>
			</div>

			<div v-for="group in groups" :key="group.id" :class="$style.group">
				<div :class="$style.groupTitle">{{ group.name }}</div>
				<button v-for="channel in group.channels" :key="channel.id" class="_button" :class="[$style.channel, { [$style.active]: systemView === null && selected?.id === channel.id }]" @click="selectChannel(channel)"><i :class="channelIcon(channel)"></i><span>{{ channel.name }}</span></button>
			</div>

			<div v-if="textChannels.length" :class="$style.group">
				<div :class="$style.groupTitle">{{ l.textChannels }}</div>
				<button v-for="channel in textChannels" :key="channel.id" class="_button" :class="[$style.channel, { [$style.active]: systemView === null && selected?.id === channel.id }]" @click="selectChannel(channel)"><i :class="channelIcon(channel)"></i><span>{{ channel.name }}</span></button>
			</div>

			<div v-if="voiceChannels.length" :class="$style.group">
				<div :class="$style.groupTitle">{{ l.voiceChannels }}</div>
				<button v-for="channel in voiceChannels" :key="channel.id" class="_button" :class="[$style.channel, { [$style.active]: systemView === null && selected?.id === channel.id }]" @click="selectChannel(channel)"><i class="ti ti-volume"></i><span>{{ channel.name }}</span></button>
			</div>
		</div>
	</aside>

	<main :class="$style.main">
		<template v-if="systemView === 'info'">
			<XHeader icon="ti ti-info-circle" :title="l.info"/>
			<div :class="$style.scroll">
				<div v-if="rules.length || pins.length" :class="$style.infoGrid">
					<section :class="$style.card"><h3><i class="ti ti-notebook"></i> {{ l.rules }}</h3><ol><li v-for="rule in rules" :key="rule.id"><strong>{{ rule.title }}</strong><p>{{ rule.body }}</p></li></ol></section>
					<section :class="$style.card"><h3><i class="ti ti-pin"></i> {{ l.pins }}</h3><div v-for="pin in pins" :key="pin.id" :class="$style.pin"><a v-if="pin.url" :href="pin.url" target="_blank" rel="noopener noreferrer">{{ pin.label || pin.url }}</a><span v-else>{{ pin.label || pin.targetId }}</span></div></section>
				</div>
				<div v-else :class="$style.empty">{{ l.noInformation }}</div>
			</div>
		</template>

		<template v-else-if="systemView === 'announcements'">
			<XHeader icon="ti ti-speakerphone" :title="l.announcements"/>
			<div :class="$style.scroll"><NookCommunityAnnouncements :communityId="communityId" :canManage="canManageAnnouncements"/></div>
		</template>

		<template v-else-if="systemView === 'members'">
			<XHeader icon="ti ti-users" :title="l.members"/>
			<div :class="$style.scroll"><NookCommunityMembers :communityId="communityId" :canManage="canManageMembers" :canManageRoles="canManageRoles"/></div>
		</template>

		<NookCommunityVoice v-else-if="voiceEnabled && selected?.kind === 'voice'" :communityId="communityId" :channel="selected" :channels="selectable" :canManage="canManageVoice"/>

		<template v-else-if="selected">
			<header :class="$style.header"><div :class="$style.heading"><i :class="channelIcon(selected)"></i><div><strong>{{ selected.name }}</strong><small v-if="selected.topic">{{ selected.topic }}</small></div></div></header>
			<div ref="messagesEl" :class="$style.messages">
				<div v-if="messages.length === 0" :class="$style.welcome"><div :class="$style.welcomeIcon"><i :class="channelIcon(selected)"></i></div><h2>{{ selected.name }}</h2><p v-if="selected.topic">{{ selected.topic }}</p></div>
				<article v-for="message in messages" :key="message.id" :class="$style.message"><div :class="$style.avatar">{{ authorInitial(message) }}</div><div><div :class="$style.meta"><strong>{{ authorName(message) }}</strong><span v-if="message.botId">BOT</span><time>{{ formatTime(message.createdAt) }}</time></div><div :class="$style.body">{{ message.body }}</div><NookAutoTranslation kind="communityMessage" :objectId="message.id" :text="message.body"/></div></article>
			</div>
			<form :class="$style.composer" @submit.prevent="send"><textarea v-model="draft" maxlength="8000" rows="1" :placeholder="`${l.send} #${selected.name}`" @keydown.enter.exact.prevent="send"></textarea><button class="_button" :class="$style.send" :disabled="!draft.trim()"><i class="ti ti-send"></i></button></form>
		</template>

		<div v-else :class="$style.empty">{{ l.noChannels }}</div>
	</main>

	<aside v-if="systemView === null" :class="$style.membersRail">
		<div :class="$style.railHeader"><strong>{{ l.members }}</strong><small>{{ activeMembers.length }}</small></div>
		<div :class="$style.memberList"><div v-for="member in activeMembers" :key="member.userId" :class="$style.member"><div :class="$style.memberAvatar">{{ memberInitial(member) }}</div><div><strong>{{ member.nickname || member.userId }}</strong><small>{{ roleLabel(member.baseRole) }}</small></div></div></div>
	</aside>
</section>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, useCssModule, useTemplateRef } from 'vue';
import { nookApi } from './nook-api.js';
import { communityLabels as l } from './labels.js';
import NookAutoTranslation from './NookAutoTranslation.vue';
import NookCommunityAnnouncements from './NookCommunityAnnouncements.vue';
import NookCommunityMembers from './NookCommunityMembers.vue';
import NookCommunityVoice from './NookCommunityVoice.vue';
import type { CommunityChannel, CommunityMember, CommunityMessage, CommunityPin, CommunityRule } from './types.js';

type SystemView = 'info' | 'announcements' | 'members';
const props = defineProps<{ communityId: string; rules: CommunityRule[]; pins: CommunityPin[]; canManageChannels: boolean; canManageAnnouncements: boolean; canManageMembers: boolean; canManageRoles: boolean; canManageVoice: boolean; voiceEnabled: boolean }>();
const $style = useCssModule();
const channels = ref<CommunityChannel[]>([]); const selected = ref<CommunityChannel | null>(null); const systemView = ref<SystemView | null>(null); const messages = ref<CommunityMessage[]>([]); const members = ref<CommunityMember[]>([]); const draft = ref(''); const filter = ref(''); const messagesEl = useTemplateRef('messagesEl'); let timer: number | undefined;

const XHeader = defineComponent({ props: { icon: { type: String, required: true }, title: { type: String, required: true } }, setup(p) { return () => h('header', { class: $style.header }, [h('div', { class: $style.heading }, [h('i', { class: p.icon }), h('strong', p.title)])]); } });
const categoryIds = computed(() => new Set(channels.value.map(x => x.parentId).filter((id): id is string => id != null)));
const selectable = computed(() => channels.value.filter(x => !categoryIds.value.has(x.id)));
const visible = computed(() => { const q = filter.value.trim().toLowerCase(); return q ? selectable.value.filter(x => x.name.toLowerCase().includes(q)) : selectable.value; });
const groups = computed(() => channels.value.filter(x => categoryIds.value.has(x.id)).map(parent => ({ id: parent.id, name: parent.name, channels: visible.value.filter(x => x.parentId === parent.id) })).filter(x => x.channels.length));
const ungrouped = computed(() => visible.value.filter(x => x.parentId == null));
const textChannels = computed(() => ungrouped.value.filter(x => x.kind !== 'voice')); const voiceChannels = computed(() => ungrouped.value.filter(x => x.kind === 'voice'));
const activeMembers = computed(() => { const rank: Record<string, number> = { owner: 0, admin: 1, moderator: 2, member: 3 }; return members.value.filter(x => x.state === 'active').slice().sort((a, b) => (rank[a.baseRole] ?? 9) - (rank[b.baseRole] ?? 9)); });

async function fetchChannels() { return await nookApi<CommunityChannel[]>('nook/community/channels/list', { communityId: props.communityId }); }
async function loadChannels() { let loaded = await fetchChannels(); if (loaded.length === 0 && props.canManageChannels) { try { await nookApi('nook/community/channels/create', { communityId: props.communityId, name: l.defaultChannelName, kind: 'text' }); loaded = await fetchChannels(); } catch {} } channels.value = props.voiceEnabled ? loaded : loaded.filter(x => x.kind !== 'voice'); if (!selected.value || !selectable.value.some(x => x.id === selected.value?.id)) selected.value = selectable.value.find(x => x.kind !== 'voice') ?? selectable.value[0] ?? null; if (!selected.value) systemView.value = 'info'; await loadMessages(); }
async function loadMembers() { members.value = await nookApi<CommunityMember[]>('nook/community/members/list', { communityId: props.communityId }).catch(() => []); }
async function loadMessages() { if (systemView.value || !selected.value || selected.value.kind === 'voice') { messages.value = []; return; } messages.value = await nookApi('nook/community/messages/list', { communityId: props.communityId, channelId: selected.value.id, limit: 100 }); }
async function openSystem(view: SystemView) { systemView.value = view; if (view === 'members') await loadMembers(); }
async function selectChannel(channel: CommunityChannel) { systemView.value = null; selected.value = channel; await loadMessages(); await scrollBottom(); }
async function send() { if (systemView.value || !selected.value || selected.value.kind === 'voice' || !draft.value.trim()) return; await nookApi('nook/community/messages/create', { communityId: props.communityId, channelId: selected.value.id, body: draft.value.trim() }); draft.value = ''; await loadMessages(); await scrollBottom(); }
function channelIcon(channel: CommunityChannel) { if (channel.kind === 'announcement') return 'ti ti-speakerphone'; if (channel.kind === 'media') return 'ti ti-photo'; if (channel.kind === 'forum') return 'ti ti-messages'; if (channel.kind === 'voice') return 'ti ti-volume'; return 'ti ti-hash'; }
function authorName(message: CommunityMessage) { if (message.botId) return message.botId; if (!message.userId) return 'Unknown'; return members.value.find(x => x.userId === message.userId)?.nickname || message.userId; }
function authorInitial(message: CommunityMessage) { return authorName(message).slice(0, 1).toUpperCase(); } function memberInitial(member: CommunityMember) { return (member.nickname || member.userId).slice(0, 1).toUpperCase(); }
function roleLabel(role: string) { if (role === 'owner') return l.owner; if (role === 'admin') return l.administrator; if (role === 'moderator') return l.moderator; return l.member; }
function formatTime(value: string) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
async function scrollBottom() { await nextTick(); if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight; }
onMounted(async () => { await Promise.all([loadChannels(), loadMembers()]); await scrollBottom(); timer = window.setInterval(() => { if (!systemView.value) void loadMessages(); }, 3000); }); onBeforeUnmount(() => { if (timer) window.clearInterval(timer); });
</script>

<style lang="scss" module>
.workspace{--b:#d7e3f1;--blue:#175cd3;--soft:#eef5ff;--yellow:#ffd84d;--ink:#17324d;display:grid;grid-template-columns:230px minmax(0,1fr)220px;height:min(760px,calc(100dvh - 150px));min-height:520px;background:#fff;border:1px solid var(--b);border-radius:10px;overflow:hidden;color:var(--ink)}.systemOpen{grid-template-columns:230px minmax(0,1fr)}.rail,.membersRail{min-width:0;background:#f8fbff}.rail{border-right:1px solid var(--b);display:flex;flex-direction:column}.membersRail{border-left:1px solid var(--b)}.railHeader,.header{height:54px;box-sizing:border-box;border-bottom:1px solid var(--b);display:flex;align-items:center;padding:0 12px}.railHeader{justify-content:space-between}.railHeader small{color:#718399}.filter{display:flex;align-items:center;gap:7px;margin:8px;padding:7px 9px;background:#fff;border:1px solid var(--b);border-radius:7px;color:#718399}.filter input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--ink)}.railBody,.memberList,.scroll,.messages{overflow-y:auto}.railBody{padding:8px}.fixed{padding-bottom:10px;border-bottom:1px solid var(--b)}.group{margin-top:12px}.groupTitle{padding:4px 8px 5px;font-size:10px;font-weight:800;color:#718399}.channel{display:flex;align-items:center;gap:9px;width:100%;min-height:36px;padding:0 9px;border-radius:6px;text-align:left;color:#5d7188}.channel:hover{background:#eef3f8;color:var(--ink)}.channel.active{background:var(--soft);color:var(--blue)}.channel>i:first-child{width:18px;text-align:center;font-size:17px}.channel span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:620}.lock{margin-left:auto;font-size:10px!important;opacity:.5}.main{min-width:0;display:flex;flex-direction:column;background:#fff}.heading{min-width:0;display:flex;align-items:center;gap:10px}.heading>i{font-size:20px;color:#718399}.heading>div{display:flex;gap:10px;align-items:baseline}.heading small{color:#718399}.scroll{flex:1;min-height:0;padding:16px;background:#fbfdff}.infoGrid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(220px,.75fr);gap:12px}.card{padding:16px;background:#fff;border:1px solid var(--b);border-radius:8px}.card h3{margin:0 0 12px;font-size:14px}.card li{margin:10px 0}.card p{margin:3px 0 0;color:#62768c}.pin{padding:8px 0;border-bottom:1px solid var(--b)}.messages{flex:1;min-height:0;padding:14px 0 20px}.welcome{padding:32px 20px 22px;border-bottom:1px solid var(--b)}.welcomeIcon{width:44px;height:44px;display:grid;place-items:center;border-radius:12px;background:var(--blue);color:#fff;font-size:22px}.welcome h2{margin:13px 0 3px}.welcome p{margin:0;color:#718399}.message{display:flex;gap:11px;padding:8px 18px}.message:hover{background:#f9fbfd}.avatar,.memberAvatar{display:grid;place-items:center;background:var(--soft);color:var(--blue);font-weight:800}.avatar{flex:0 0 36px;width:36px;height:36px;border-radius:10px}.meta{display:flex;align-items:baseline;gap:7px}.meta span{padding:1px 4px;border-radius:3px;background:var(--blue);color:#fff;font-size:9px;font-weight:800}.meta time{font-size:10px;color:#8797aa}.body{margin-top:2px;white-space:pre-wrap;word-break:break-word;line-height:1.55}.composer{display:flex;gap:8px;margin:0 14px 14px;padding:8px 8px 8px 12px;border:1px solid var(--b);border-radius:9px;background:#f8fbff}.composer textarea{flex:1;min-height:24px;max-height:140px;padding:4px 0;resize:none;border:0;outline:0;background:transparent;color:var(--ink);font:inherit}.send{width:36px;height:36px;border-radius:7px;background:var(--yellow);color:var(--ink)}.send:disabled{opacity:.45}.memberList{padding:8px}.member{display:flex;align-items:center;gap:9px;padding:7px}.memberAvatar{width:30px;height:30px;border-radius:9px;font-size:12px}.member>div:last-child{min-width:0;display:flex;flex-direction:column}.member strong,.member small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.member strong{font-size:12px}.member small{font-size:10px;color:#718399}.empty{flex:1;display:grid;place-items:center;color:#718399}@media(max-width:1050px){.workspace,.systemOpen{grid-template-columns:210px minmax(0,1fr)}.membersRail{display:none}}@media(max-width:700px){.workspace,.systemOpen{grid-template-columns:1fr;height:auto;min-height:0;border-inline:0;border-radius:0}.rail{border-right:0;border-bottom:1px solid var(--b)}.railBody{display:flex;gap:8px;overflow-x:auto}.fixed,.group{display:flex;gap:5px;margin:0;padding:0;border:0}.groupTitle,.lock,.membersRail{display:none}.channel{width:auto;min-width:max-content}.main{min-height:70dvh}.infoGrid{grid-template-columns:1fr}}
</style>
