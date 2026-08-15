<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<div class="_gaps">
	<div v-if="loading" class="_panel" :class="$style.box">{{ l.loading }}</div>
	<template v-else-if="detail">
		<div class="_panel" :class="$style.top"><div><strong>{{ l.community }}</strong><small> · {{ detail.memberCount }} {{ l.members }}</small></div><div :class="$style.translation"><label><input v-model="autoTranslate" type="checkbox"> 🌐 {{ l.autoTranslate }}</label><input v-model="targetLang" maxlength="24" :title="l.translationLanguage"></div></div>
		<section v-if="isBanned" class="_panel" :class="$style.box"><h3>🔒 Community access unavailable</h3><p>Your membership is currently banned. Member-only channels and management tools are not available.</p></section>
		<section v-else-if="!isActiveMember" class="_panel" :class="$style.box"><h3>{{ l.rules }}</h3><ol><li v-for="rule in rules" :key="rule.id"><strong>{{ rule.title }}</strong> — {{ rule.body }}</li></ol><textarea v-if="detail.joinMode==='approval'" v-model="joinMessage" maxlength="1024" placeholder="Message"></textarea><input v-if="detail.joinMode==='invite'||detail.joinMode==='private'" v-model="inviteToken" placeholder="Invite token"><button class="_button" :class="$style.primary" @click="join">{{ detail.joinMode==='approval'?l.apply:l.join }}</button><div v-if="joinStatus">{{ joinStatus }}</div></section>
		<template v-else>
			<nav :class="$style.tabs"><button v-for="item in tabs" :key="item.key" class="_button" :class="{[$style.active]:tab===item.key}" @click="tab=item.key">{{ item.icon }} {{ item.label }}</button></nav>
			<NookCommunityChannels v-if="tab==='channels'" :communityId="communityId" :canManageVoice="can('voice.manage')" :voiceEnabled="voiceEnabled"/>
			<NookCommunityAnnouncements v-else-if="tab==='announcements'" :communityId="communityId" :canManage="can('announcements.manage')"/>
			<NookCommunityEvents v-else-if="tab==='events'" :communityId="communityId" :canManage="can('events.manage')"/>
			<NookCommunityMembers v-else-if="tab==='members'" :communityId="communityId" :canManage="can('members.manage')" :canManageRoles="can('roles.manage')"/>
			<NookCommunityBots v-else-if="tab==='bots'" :communityId="communityId" :canManage="true"/>
			<NookCommunityAdmin v-else-if="tab==='admin'" :communityId="communityId" :detail="detail" :voiceEnabled="voiceEnabled" @refresh="load"/>
			<section v-else class="_gaps"><div class="_panel" :class="$style.box"><h3>{{ l.rules }}</h3><ol><li v-for="rule in rules" :key="rule.id"><strong>{{ rule.title }}</strong><p>{{ rule.body }}</p></li></ol></div><div class="_panel" :class="$style.box"><h3>{{ l.pins }}</h3><div v-for="pin in pins" :key="pin.id">📌 <a v-if="pin.url" :href="pin.url" target="_blank" rel="noopener noreferrer">{{ pin.label||pin.url }}</a><span v-else>{{ pin.label||pin.targetId }}</span></div></div></section>
		</template>
	</template>
</div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'; import { nookApi } from './nook-api.js'; import { communityLabels as l } from './labels.js'; import { nookAutoTranslateEnabled, nookAutoTranslateTargetLang } from './translation-preferences.js'; import NookCommunityChannels from './NookCommunityChannels.vue'; import NookCommunityAnnouncements from './NookCommunityAnnouncements.vue'; import NookCommunityEvents from './NookCommunityEvents.vue'; import NookCommunityMembers from './NookCommunityMembers.vue'; import NookCommunityBots from './NookCommunityBots.vue'; import NookCommunityAdmin from './NookCommunityAdmin.vue'; import type { CommunityDetail, CommunityPin, CommunityRule } from './types.js';
const props = defineProps<{ communityId: string; voiceEnabled: boolean }>(); const detail = ref<CommunityDetail | null>(null); const rules = ref<CommunityRule[]>([]); const pins = ref<CommunityPin[]>([]); const loading = ref(true); const tab = ref('home'); const joinMessage = ref(''); const inviteToken = ref(new URLSearchParams(window.location.search).get('invite') ?? ''); const joinStatus = ref(''); const autoTranslate = nookAutoTranslateEnabled; const targetLang = nookAutoTranslateTargetLang;
const isActiveMember = computed(() => detail.value?.membership?.state === 'active');
const isBanned = computed(() => detail.value?.membership?.state === 'banned');

function can(permission:string) {if (!isActiveMember.value) return false; const values = detail.value?.membership?.permissions ?? []; return values.includes('*') || values.includes(permission);}

const canOpenAdmin = computed(() => ['community.manage', 'channels.manage', 'roles.manage', 'rules.manage', 'members.invite', 'pins.manage'].some(can));
const tabs = computed(() => [{ key: 'home', label: 'Home', icon: '🏠' }, { key: 'channels', label: l.channels, icon: '#' }, { key: 'announcements', label: l.announcements, icon: '📢' }, { key: 'events', label: l.events, icon: '📅' }, { key: 'members', label: l.members, icon: '👥' }, ...(can('bots.manage') ? [{ key: 'bots', label: l.bots, icon: '🤖' }] : []), ...(canOpenAdmin.value ? [{ key: 'admin', label: l.admin, icon: '⚙️' }] : [])]);

async function load() {loading.value = true; try {detail.value = await nookApi('nook/community/show', { communityId: props.communityId }); rules.value = await nookApi('nook/community/rules/list', { communityId: props.communityId }); pins.value = isActiveMember.value ? await nookApi('nook/community/pins/list', { communityId: props.communityId, channelId: null }) : []; if (!tabs.value.some(item => item.key === tab.value))tab.value = 'home';} finally {loading.value = false;}}

async function join() {try {if (inviteToken.value) {await nookApi('nook/community/invites/use', { token: inviteToken.value }); joinStatus.value = 'Joined';} else {const result = await nookApi<{ status: string }>('nook/community/join', { communityId: props.communityId, message: joinMessage.value || null }); joinStatus.value = result.status;} await load();} catch(error) {joinStatus.value = (error as { message?: string }).message ?? 'Failed';}}

onMounted(load);
</script>
<style module>.box,.top{padding:16px}.top{display:flex;justify-content:space-between;gap:12px;align-items:center}.translation{display:flex;gap:8px;align-items:center}.translation input[type=text],.translation input:not([type]){width:70px}.tabs{display:flex;gap:6px;overflow:auto;padding:4px}.tabs button{padding:8px 10px;border-radius:999px;white-space:nowrap}.active{background:var(--MI_THEME-accent);color:var(--MI_THEME-fgOnAccent)}.primary{margin-top:10px;padding:9px 15px;background:var(--MI_THEME-accent);color:var(--MI_THEME-fgOnAccent);border-radius:8px}.box textarea,.box input{width:100%;box-sizing:border-box;padding:8px;margin-top:8px;background:var(--MI_THEME-bg);color:var(--MI_THEME-fg);border:1px solid var(--MI_THEME-divider);border-radius:8px}@media(max-width:600px){.top{align-items:flex-start;flex-direction:column}}</style>
