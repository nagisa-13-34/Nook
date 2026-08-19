<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<div :class="$style.root">
	<div v-if="loading" :class="$style.loading">{{ l.loading }}</div>
	<template v-else-if="detail">
		<div :class="[$style.layout, { [$style.withRail]: isActiveMember }]">
			<NookCommunityRail v-if="isActiveMember" :currentCommunityId="communityId"/>
			<div :class="$style.main">
				<header :class="$style.topbar">
					<div :class="$style.identity"><div :class="$style.mark">{{ communityInitial }}</div><div><strong>{{ displayName }}</strong><small>{{ detail.memberCount }} {{ l.members }}</small></div><span :class="$style.age">{{ ageModeLabel }}</span></div>
					<div :class="$style.tools">
						<NookCommunityProfileButton v-if="isActiveMember" :communityId="communityId" @updated="profileUpdated"/>
						<NookCommunityInviteButton v-if="isActiveMember && can('members.invite')" :communityId="communityId" :communityName="displayName"/>
						<label :class="$style.translateToggle" :title="l.autoTranslate"><input v-model="autoTranslate" type="checkbox"><i class="ti ti-language"></i></label>
						<NookCommunityLanguagePicker v-if="autoTranslate"/>
					</div>
				</header>

				<section v-if="isBanned" :class="$style.notice"><i class="ti ti-lock"></i><div><strong>Community access unavailable</strong><p>Your membership is currently banned.</p></div></section>
				<section v-else-if="!isActiveMember" :class="$style.joinPanel">
					<div :class="$style.joinHeading"><div :class="$style.joinIcon">{{ communityInitial }}</div><div><h2>{{ displayName }}</h2><p>{{ detail.memberCount }} {{ l.members }}</p></div></div>
					<div :class="$style.rules"><h3>{{ l.rules }}</h3><ol><li v-for="rule in rules" :key="rule.id"><strong>{{ rule.title }}</strong><span>{{ rule.body }}</span></li></ol></div>
					<textarea v-if="detail.joinMode === 'approval'" v-model="joinMessage" maxlength="1024" placeholder="Message"></textarea>
					<input v-if="detail.joinMode === 'invite' || detail.joinMode === 'private'" v-model="inviteToken" placeholder="Invite token">
					<button class="_button" :class="$style.primary" @click="join">{{ detail.joinMode === 'approval' ? l.apply : l.join }}</button>
					<div v-if="joinStatus" :class="$style.status">{{ joinStatus }}</div>
				</section>

				<template v-else>
					<nav :class="$style.nav">
						<button v-for="item in tabs" :key="item.key" class="_button" :class="[$style.navItem,{[$style.active]:tab===item.key}]" @click="tab=item.key"><i :class="item.icon"></i><span>{{ item.label }}</span></button>
					</nav>
					<div :class="[$style.body,{[$style.channels]:tab==='channels'}]">
						<NookCommunityWorkspace v-if="tab==='channels'" :key="workspaceKey" :communityId="communityId" :pins="pins" :canManageChannels="can('channels.manage')" :canManageAnnouncements="can('announcements.manage')" :canManageMembers="can('members.manage')" :canManageRoles="can('roles.manage')" :canManageRules="can('rules.manage')" :canManagePins="can('pins.manage')" :canManageVoice="can('voice.manage')" :voiceEnabled="voiceEnabled"/>
						<NookCommunityEvents v-else-if="tab==='events'" :communityId="communityId" :canManage="can('events.manage')"/>
						<NookCommunityBots v-else-if="tab==='bots'" :communityId="communityId" :canManage="true"/>
						<NookCommunityAdmin v-else-if="tab==='admin'" :communityId="communityId" :communityName="displayName" :detail="detail" :voiceEnabled="voiceEnabled" @refresh="load"/>
					</div>
				</template>
			</div>
		</div>
	</template>
</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { nookApi } from './nook-api.js';
import { communityLabels as l } from './labels.js';
import { nookAutoTranslateEnabled } from './translation-preferences.js';
import NookCommunityRail from './NookCommunityRail.vue';
import NookCommunityWorkspace from './NookCommunityWorkspace.vue';
import NookCommunityEvents from './NookCommunityEvents.vue';
import NookCommunityBots from './NookCommunityBots.vue';
import NookCommunityAdmin from './NookCommunityAdmin.vue';
import NookCommunityInviteButton from './NookCommunityInviteButton.vue';
import NookCommunityProfileButton from './NookCommunityProfileButton.vue';
import NookCommunityLanguagePicker from './NookCommunityLanguagePicker.vue';
import type { CommunityDetail, CommunityPin, CommunityRule } from './types.js';

const props = defineProps<{ communityId:string; communityName?:string; voiceEnabled:boolean }>();
const detail=ref<CommunityDetail|null>(null), rules=ref<CommunityRule[]>([]), pins=ref<CommunityPin[]>([]), loading=ref(true), tab=ref('channels'), joinMessage=ref(''), inviteToken=ref(new URLSearchParams(window.location.search).get('invite')??''), joinStatus=ref(''), workspaceKey=ref(0);
const autoTranslate=nookAutoTranslateEnabled;
const displayName=computed(()=>props.communityName?.trim()||l.community), communityInitial=computed(()=>displayName.value.slice(0,1).toUpperCase()), isActiveMember=computed(()=>detail.value?.membership?.state==='active'), isBanned=computed(()=>detail.value?.membership?.state==='banned'), ageModeLabel=computed(()=>detail.value?.ageMode==='minors_only'?l.ageModeMinorsOnly:detail.value?.ageMode==='adults_only'?l.ageModeAdultsOnly:l.ageModeMixed);
function can(permission:string){if(!isActiveMember.value)return false;const values=detail.value?.membership?.permissions??[];return values.includes('*')||values.includes(permission)}
const canOpenAdmin=computed(()=>['community.manage','roles.manage'].some(can));
const tabs=computed(()=>[{key:'channels',label:l.channels,icon:'ti ti-hash'},{key:'events',label:l.events,icon:'ti ti-calendar-event'},...(can('bots.manage')?[{key:'bots',label:l.bots,icon:'ti ti-robot'}]:[]),...(canOpenAdmin.value?[{key:'admin',label:l.admin,icon:'ti ti-settings'}]:[])]);
async function load(){loading.value=true;try{detail.value=await nookApi('nook/community/show',{communityId:props.communityId});rules.value=await nookApi('nook/community/rules/list',{communityId:props.communityId});pins.value=isActiveMember.value?await nookApi('nook/community/pins/list',{communityId:props.communityId,channelId:null}).catch(()=>[]):[];if(!tabs.value.some(x=>x.key===tab.value))tab.value='channels'}finally{loading.value=false}}
function profileUpdated(){workspaceKey.value++}
async function join(){try{if(inviteToken.value){await nookApi('nook/community/invites/use',{token:inviteToken.value});joinStatus.value='Joined'}else{const result=await nookApi<{status:string}>('nook/community/join',{communityId:props.communityId,message:joinMessage.value||null});joinStatus.value=result.status}await load()}catch(error){joinStatus.value=(error as {message?:string}).message??'Failed'}}
watch(() => props.communityId, () => { tab.value='channels'; joinStatus.value=''; void load(); }, { immediate:true });
</script>

<style lang="scss" module>
.root{--blue:#175cd3;--soft:#eef5ff;--yellow:#ffd84d;--ink:#17324d;--b:#d7e3f1;color:var(--ink)}.layout{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;align-items:start}.withRail{grid-template-columns:64px minmax(0,1fr)}.main{min-width:0}.loading,.notice,.joinPanel{background:#fff;border:1px solid var(--b);border-radius:10px}.loading{padding:22px}.topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:58px;padding:8px 14px;background:#fff;border:1px solid var(--b);border-bottom:0;border-radius:10px 10px 0 0;box-sizing:border-box}.identity{min-width:0;display:flex;align-items:center;gap:9px}.identity>div:nth-child(2){min-width:0;display:flex;flex-direction:column}.identity strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}.identity small{font-size:10px;color:#718399}.mark,.joinIcon{display:grid;place-items:center;background:var(--blue);color:#fff;font-weight:850}.mark{width:32px;height:32px;border-radius:9px}.age{padding:3px 7px;border-radius:5px;background:var(--soft);color:var(--blue);font-size:10px;font-weight:750}.tools{display:flex;align-items:center;gap:7px}.translateToggle{display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--b);border-radius:7px;background:#fff;cursor:pointer}.translateToggle input{position:absolute;opacity:0;pointer-events:none}.translateToggle:has(input:checked){background:var(--soft);color:var(--blue);border-color:#b7d2f5}.nav{display:flex;gap:2px;padding:0 8px;background:#fff;border:1px solid var(--b);border-top:0;overflow-x:auto}.navItem{position:relative;display:flex;align-items:center;gap:6px;min-height:42px;padding:0 10px;white-space:nowrap;color:#62768c;font-size:12px;font-weight:650}.navItem.active{color:var(--blue)}.navItem.active:after{content:'';position:absolute;left:8px;right:8px;bottom:0;height:2px;background:var(--blue)}.body{padding-top:12px}.channels{padding-top:0}.notice{display:flex;gap:12px;margin-top:12px;padding:18px}.notice i{font-size:24px;color:var(--blue)}.notice p{margin:4px 0 0;color:#718399}.joinPanel{max-width:640px;margin:12px auto 0;padding:22px}.joinHeading{display:flex;align-items:center;gap:12px;padding-bottom:18px;border-bottom:1px solid var(--b)}.joinIcon{width:44px;height:44px;border-radius:12px}.joinHeading h2,.joinHeading p{margin:0}.joinHeading p{margin-top:2px;color:#718399}.rules{margin-top:18px}.rules li{margin:9px 0}.rules li span{display:block;margin-top:2px;color:#62768c}.joinPanel textarea,.joinPanel>input{width:100%;box-sizing:border-box;margin-top:10px;padding:9px 10px;border:1px solid var(--b);border-radius:7px;background:#f8fbff;color:var(--ink)}.primary{margin-top:12px;padding:9px 16px;border:1px solid #e4bd29;border-radius:7px;background:var(--yellow);color:var(--ink);font-weight:800}.status{margin-top:9px;font-size:12px;color:#62768c}@media(max-width:700px){.withRail{grid-template-columns:1fr;gap:8px}.topbar{border-inline:0;border-radius:0}.nav{border-inline:0}.age{display:none}.tools{gap:4px}}
</style>