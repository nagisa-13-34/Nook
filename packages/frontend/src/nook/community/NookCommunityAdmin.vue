<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<section :class="$style.root">
	<nav :class="$style.tabs" aria-label="Community admin">
		<button v-if="can('community.manage')" class="_button" :class="[$style.tab,{[$style.active]:tab==='settings'}]" @click="tab='settings'"><i class="ti ti-settings"></i><span>{{ l.settings }}</span></button>
		<button v-if="can('roles.manage')" class="_button" :class="[$style.tab,{[$style.active]:tab==='roles'}]" @click="tab='roles'"><i class="ti ti-id-badge-2"></i><span>{{ l.role }}</span></button>
		<button v-if="isOwner" class="_button" :class="[$style.tab,{[$style.active]:tab==='ownership'}]" @click="tab='ownership'"><i class="ti ti-crown"></i><span>{{ l.transferOwnership }}</span></button>
		<button v-if="isOwner" class="_button" :class="[$style.tab,$style.dangerTab,{[$style.active]:tab==='danger'}]" @click="tab='danger'"><i class="ti ti-trash"></i><span>{{ l.deleteCommunity }}</span></button>
	</nav>

	<section v-if="tab==='settings' && can('community.manage')" :class="$style.panel">
		<h3>{{ l.settings }}</h3>
		<div :class="$style.infoEdit">
			<div><strong>{{ l.communityInfo }}</strong><small>{{ l.communityInfoHint }}</small></div>
			<button class="_button" :class="$style.secondary" @click="editCommunity"><i class="ti ti-pencil"></i> {{ l.editCommunityInfo }}</button>
		</div>
		<div :class="$style.settingsGrid">
			<label><span>{{ l.joinMode }}</span><select v-model="joinMode"><option value="open">{{ l.joinModeOpen }}</option><option value="approval">{{ l.joinModeApproval }}</option><option value="invite">{{ l.joinModeInvite }}</option><option value="private">{{ l.joinModePrivate }}</option></select></label>
			<label><span>{{ l.ageMode }}</span><select v-model="ageMode"><option value="minors_only">{{ l.ageModeMinorsOnly }}</option><option value="mixed">{{ l.ageModeMixed }}</option><option value="adults_only">{{ l.ageModeAdultsOnly }}</option></select><small>{{ l.ageModeHint }}</small></label>
			<label :class="$style.check"><input v-model="discoverable" type="checkbox"><span>{{ l.discoverable }}</span></label>
		</div>
		<div :class="$style.actions"><span v-if="settingsMessage" :class="{[$style.error]:settingsMessageError}">{{ settingsMessage }}</span><button class="_button" :class="$style.primary" @click="saveSettings">{{ l.save }}</button></div>
	</section>

	<section v-else-if="tab==='roles' && can('roles.manage')" :class="$style.panel">
		<NookCommunityRoleEditor :communityId="communityId"/>
	</section>

	<section v-else-if="tab==='ownership' && isOwner" :class="$style.panel">
		<h3>{{ l.transferOwnership }}</h3>
		<p :class="$style.help">{{ l.transferOwnershipHint }}</p>
		<div :class="$style.inline"><select v-model="targetOwnerId"><option value="">{{ l.selectNewOwner }}</option><option v-for="member in transferCandidates" :key="member.userId" :value="member.userId">{{ member.nickname||member.name||member.username }} ({{ memberHandle(member) }})</option></select><button class="_button" :class="$style.primary" :disabled="!targetOwnerId" @click="transferOwnership">{{ l.transfer }}</button></div>
	</section>

	<section v-else-if="tab==='danger' && isOwner" :class="[$style.panel,$style.dangerZone]">
		<h3>{{ l.deleteCommunity }}</h3>
		<p>{{ l.deleteCommunityHint }}</p>
		<label><span>{{ l.typeCommunityName }}</span><input v-model="deleteConfirmation" :placeholder="communityName"></label>
		<button class="_button" :class="$style.danger" :disabled="deleteConfirmation!==communityName" @click="deleteCommunity"><i class="ti ti-trash"></i> {{ l.deleteCommunity }}</button>
	</section>
</section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from '@/router.js';
import { nookApi } from './nook-api.js';
import { communityLabels as l } from './labels.js';
import NookCommunityRoleEditor from './NookCommunityRoleEditor.vue';
import type { CommunityDetail, CommunityMember } from './types.js';

const props=defineProps<{communityId:string;communityName:string;detail:CommunityDetail;voiceEnabled:boolean}>();
const emit=defineEmits<{refresh:[]}>();
const router=useRouter();
const joinMode=ref(props.detail.joinMode),ageMode=ref(props.detail.ageMode),discoverable=ref(props.detail.discoverable),settingsMessage=ref(''),settingsMessageError=ref(false),members=ref<CommunityMember[]>([]),targetOwnerId=ref(''),deleteConfirmation=ref('');
const isOwner=computed(()=>props.detail.membership?.baseRole==='owner');
function can(permission:string){const values=props.detail.membership?.permissions??[];return values.includes('*')||values.includes(permission)}
function initialTab(){if(can('community.manage'))return'settings';if(can('roles.manage'))return'roles';if(isOwner.value)return'ownership';return'settings'}
const tab=ref(initialTab());
const transferCandidates=computed(()=>members.value.filter(m=>m.state==='active'&&m.baseRole!=='owner'));
function memberHandle(m:CommunityMember){return`@${m.username}${m.host?`@${m.host}`:''}`}
function editCommunity(){router.push('/channels/:channelId/edit',{params:{channelId:props.communityId}})}
async function load(){if(isOwner.value)members.value=await nookApi<CommunityMember[]>('nook/community/members/list',{communityId:props.communityId}).catch(()=>[])}
async function saveSettings(){settingsMessage.value='';settingsMessageError.value=false;try{await nookApi('nook/community/settings-update',{communityId:props.communityId,joinMode:joinMode.value,ageMode:ageMode.value,discoverable:discoverable.value});settingsMessage.value=l.settingsSaved;emit('refresh')}catch(error){settingsMessageError.value=true;settingsMessage.value=(error as {code?:string}).code==='AGE_MODE_CONFLICT'?l.ageModeConflict:l.settingsSaveFailed}}
async function transferOwnership(){if(!targetOwnerId.value||!window.confirm(l.transferConfirm))return;await nookApi('nook/community/transfer-ownership',{communityId:props.communityId,targetUserId:targetOwnerId.value});targetOwnerId.value='';emit('refresh')}
async function deleteCommunity(){if(deleteConfirmation.value!==props.communityName||!window.confirm(l.deleteCommunityConfirm))return;await nookApi('nook/community/delete',{communityId:props.communityId});window.location.assign('/channels')}
watch(()=>props.detail,d=>{joinMode.value=d.joinMode;ageMode.value=d.ageMode;discoverable.value=d.discoverable;if((tab.value==='ownership'||tab.value==='danger')&&!isOwner.value)tab.value=initialTab();void load()},{deep:true});
onMounted(load);
</script>

<style lang="scss" module>
.root{display:grid;gap:0;color:#17324d}.tabs{display:flex;gap:2px;padding:0 8px;background:#fff;border:1px solid #d7e3f1;border-radius:9px 9px 0 0;overflow-x:auto}.tab{position:relative;display:flex;align-items:center;gap:6px;min-height:44px;padding:0 11px;white-space:nowrap;color:#62768c;font-size:12px;font-weight:700}.tab:hover{color:#17324d}.tab.active{color:#175cd3}.tab.active:after{content:'';position:absolute;left:9px;right:9px;bottom:0;height:2px;background:#175cd3}.dangerTab{margin-left:auto;color:#a92727}.dangerTab.active{color:#a92727}.dangerTab.active:after{background:#c62828}.panel{padding:18px;background:#fff;border:1px solid #d7e3f1;border-top:0;border-radius:0 0 9px 9px}.panel h3{margin:0 0 14px}.infoEdit{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:16px;padding:12px;border:1px solid #d7e3f1;border-radius:8px;background:#f8fbff}.infoEdit>div{min-width:0;display:flex;flex-direction:column}.infoEdit small{margin-top:3px;color:#718399;line-height:1.45}.secondary{flex:none;padding:8px 11px;border:1px solid #b9cbe0;border-radius:7px;background:#fff;color:#175cd3;font-weight:750}.secondary:hover{background:#eef5ff}.settingsGrid{display:grid;gap:13px}.settingsGrid label,.dangerZone label{display:grid;gap:6px}.settingsGrid select,.inline select,.dangerZone input{box-sizing:border-box;width:100%;padding:8px 9px;border:1px solid #d7e3f1;border-radius:7px;background:#fff;color:#17324d}.settingsGrid small,.help,.dangerZone p{color:#718399;line-height:1.5}.check{display:flex!important;align-items:center;gap:8px}.check input{width:18px;height:18px;accent-color:#175cd3}.actions{display:flex;align-items:center;justify-content:flex-end;gap:12px;margin-top:14px;font-size:12px}.primary{padding:8px 13px;border-radius:7px;background:#ffd84d;color:#17324d;font-weight:800}.error{color:#c62828}.inline{display:flex;gap:8px}.inline select{flex:1}.dangerZone{border-color:#efcaca;background:#fffafa}.dangerZone h3{color:#a92727}.danger{margin-top:12px;padding:9px 13px;border-radius:7px;background:#c62828;color:#fff;font-weight:800}.danger:disabled,.primary:disabled{opacity:.45}.help{margin:-5px 0 12px}@media(max-width:700px){.tabs{border-inline:0;border-radius:0}.panel{border-inline:0;border-radius:0}.dangerTab{margin-left:0}.infoEdit{align-items:stretch;flex-direction:column}.secondary{width:100%}.inline{flex-direction:column}}
</style>