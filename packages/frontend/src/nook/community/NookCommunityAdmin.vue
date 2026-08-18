<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<section :class="$style.root">
	<section v-if="can('community.manage')" :class="$style.panel">
		<h3>{{ l.settings }}</h3>
		<div :class="$style.settingsGrid">
			<label><span>{{ l.joinMode }}</span><select v-model="joinMode"><option value="open">{{ l.joinModeOpen }}</option><option value="approval">{{ l.joinModeApproval }}</option><option value="invite">{{ l.joinModeInvite }}</option><option value="private">{{ l.joinModePrivate }}</option></select></label>
			<label><span>{{ l.ageMode }}</span><select v-model="ageMode"><option value="minors_only">{{ l.ageModeMinorsOnly }}</option><option value="mixed">{{ l.ageModeMixed }}</option><option value="adults_only">{{ l.ageModeAdultsOnly }}</option></select><small>{{ l.ageModeHint }}</small></label>
			<label :class="$style.check"><input v-model="discoverable" type="checkbox"><span>{{ l.discoverable }}</span></label>
		</div>
		<div :class="$style.actions"><span v-if="settingsMessage" :class="{[$style.error]:settingsMessageError}">{{ settingsMessage }}</span><button class="_button" :class="$style.primary" @click="saveSettings">{{ l.save }}</button></div>
	</section>

	<section v-if="can('channels.manage')" :class="$style.panel">
		<h3>{{ l.channels }}</h3>
		<div :class="$style.channelList"><div v-for="channel in channels" :key="channel.id" :class="$style.channelRow"><div><strong>{{ channel.topic===CATEGORY_TOPIC?'▾':channel.kind==='voice'?'🔊':'#' }} {{ channel.name }}</strong><small v-if="channel.parentId">{{ parentName(channel.parentId) }}</small></div><button class="_button" :title="l.delete" @click="deleteChannel(channel.id)"><i class="ti ti-trash"></i></button></div></div>
		<form :class="$style.channelForm" @submit.prevent="createChannel"><input v-model="channelName" required maxlength="64" :placeholder="l.defaultChannelName"><select v-model="channelKind"><option value="text">text</option><option value="announcement">announcement</option><option value="media">media</option><option value="forum">forum</option><option v-if="voiceEnabled" value="voice">voice</option></select><select v-model="channelParentId"><option value="">{{ l.noCategory }}</option><option v-for="candidate in categoryCandidates" :key="candidate.id" :value="candidate.id">{{ candidate.name }}</option></select><button class="_button" :class="$style.primary">{{ l.create }}</button></form>
	</section>

	<section v-if="can('roles.manage')" :class="$style.panel"><NookCommunityRoleEditor :communityId="communityId"/></section>

	<section v-if="isOwner" :class="$style.panel">
		<h3>{{ l.transferOwnership }}</h3><p :class="$style.help">{{ l.transferOwnershipHint }}</p>
		<div :class="$style.inline"><select v-model="targetOwnerId"><option value="">{{ l.selectNewOwner }}</option><option v-for="member in transferCandidates" :key="member.userId" :value="member.userId">{{ member.nickname||member.name||member.username }} ({{ memberHandle(member) }})</option></select><button class="_button" :class="$style.primary" :disabled="!targetOwnerId" @click="transferOwnership">{{ l.transfer }}</button></div>
	</section>

	<section v-if="isOwner" :class="[$style.panel,$style.dangerZone]">
		<h3>{{ l.deleteCommunity }}</h3><p>{{ l.deleteCommunityHint }}</p>
		<label><span>{{ l.typeCommunityName }}</span><input v-model="deleteConfirmation" :placeholder="communityName"></label>
		<button class="_button" :class="$style.danger" :disabled="deleteConfirmation!==communityName" @click="deleteCommunity"><i class="ti ti-trash"></i> {{ l.deleteCommunity }}</button>
	</section>
</section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { nookApi } from './nook-api.js';
import { communityLabels as l } from './labels.js';
import NookCommunityRoleEditor from './NookCommunityRoleEditor.vue';
import type { CommunityChannel, CommunityDetail, CommunityMember } from './types.js';

const CATEGORY_TOPIC='__nook_category__';
const props=defineProps<{communityId:string;communityName:string;detail:CommunityDetail;voiceEnabled:boolean}>();
const emit=defineEmits<{refresh:[]}>();
const joinMode=ref(props.detail.joinMode),ageMode=ref(props.detail.ageMode),discoverable=ref(props.detail.discoverable),settingsMessage=ref(''),settingsMessageError=ref(false),channels=ref<CommunityChannel[]>([]),members=ref<CommunityMember[]>([]),channelName=ref(''),channelKind=ref<CommunityChannel['kind']>('text'),channelParentId=ref(''),targetOwnerId=ref(''),deleteConfirmation=ref('');
const isOwner=computed(()=>props.detail.membership?.baseRole==='owner');
const categoryCandidates=computed(()=>channels.value.filter(c=>c.parentId==null&&c.kind!=='voice'));
const transferCandidates=computed(()=>members.value.filter(m=>m.state==='active'&&m.baseRole!=='owner'));
function can(permission:string){const values=props.detail.membership?.permissions??[];return values.includes('*')||values.includes(permission)}
function parentName(id:string){return channels.value.find(c=>c.id===id)?.name??id} function memberHandle(m:CommunityMember){return`@${m.username}${m.host?`@${m.host}`:''}`}
async function load(){const jobs:Promise<unknown>[]=[];if(can('channels.manage'))jobs.push(nookApi<CommunityChannel[]>('nook/community/channels/list',{communityId:props.communityId}).then(v=>channels.value=v).catch(()=>{}));if(isOwner.value)jobs.push(nookApi<CommunityMember[]>('nook/community/members/list',{communityId:props.communityId}).then(v=>members.value=v).catch(()=>{}));await Promise.all(jobs)}
async function saveSettings(){settingsMessage.value='';settingsMessageError.value=false;try{await nookApi('nook/community/settings-update',{communityId:props.communityId,joinMode:joinMode.value,ageMode:ageMode.value,discoverable:discoverable.value});settingsMessage.value=l.settingsSaved;emit('refresh')}catch(error){settingsMessageError.value=true;settingsMessage.value=(error as {code?:string}).code==='AGE_MODE_CONFLICT'?l.ageModeConflict:l.settingsSaveFailed}}
async function createChannel(){if(channelKind.value==='voice'&&!props.voiceEnabled)return;await nookApi('nook/community/channels/create',{communityId:props.communityId,name:channelName.value.trim(),kind:channelKind.value,parentId:channelParentId.value||null});channelName.value='';channelParentId.value='';await load()}
async function deleteChannel(channelId:string){if(!window.confirm(`${l.delete} ${l.channels}?`))return;await nookApi('nook/community/channels/delete',{communityId:props.communityId,channelId});await load()}
async function transferOwnership(){if(!targetOwnerId.value||!window.confirm(l.transferConfirm))return;await nookApi('nook/community/transfer-ownership',{communityId:props.communityId,targetUserId:targetOwnerId.value});targetOwnerId.value='';emit('refresh')}
async function deleteCommunity(){if(deleteConfirmation.value!==props.communityName||!window.confirm(l.deleteCommunityConfirm))return;await nookApi('nook/community/delete',{communityId:props.communityId});window.location.assign('/channels')}
watch(()=>props.detail,d=>{joinMode.value=d.joinMode;ageMode.value=d.ageMode;discoverable.value=d.discoverable;void load()},{deep:true});onMounted(load);
</script>

<style lang="scss" module>
.root{display:grid;gap:12px}.panel{padding:16px;background:#fff;border:1px solid #d7e3f1;border-radius:9px;color:#17324d}.panel h3{margin:0 0 12px}.settingsGrid{display:grid;gap:13px}.settingsGrid label,.dangerZone label{display:grid;gap:6px}.settingsGrid select,.channelForm input,.channelForm select,.inline select,.dangerZone input{box-sizing:border-box;width:100%;padding:8px 9px;border:1px solid #d7e3f1;border-radius:7px;background:#fff;color:#17324d}.settingsGrid small,.help,.dangerZone p{color:#718399;line-height:1.5}.check{display:flex!important;align-items:center;gap:8px}.check input{width:18px;height:18px;accent-color:#175cd3}.actions{display:flex;align-items:center;justify-content:flex-end;gap:12px;margin-top:14px;font-size:12px}.primary{padding:8px 13px;border-radius:7px;background:#ffd84d;color:#17324d;font-weight:800}.error{color:#c62828}.channelList{display:grid;gap:5px}.channelRow{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 9px;border-radius:7px;background:#f8fbff}.channelRow>div{min-width:0;display:flex;align-items:center;gap:8px}.channelRow small{color:#718399}.channelRow button{width:30px;height:30px;border-radius:6px;color:#a33}.channelForm{display:grid;grid-template-columns:minmax(130px,1fr) 120px minmax(130px,1fr) auto;gap:7px;margin-top:10px}.inline{display:flex;gap:8px}.inline select{flex:1}.dangerZone{border-color:#efcaca;background:#fffafa}.dangerZone h3{color:#a92727}.danger{margin-top:12px;padding:9px 13px;border-radius:7px;background:#c62828;color:#fff;font-weight:800}.danger:disabled,.primary:disabled{opacity:.45}.help{margin:-5px 0 12px}@media(max-width:700px){.channelForm{grid-template-columns:1fr}.inline{flex-direction:column}}
</style>