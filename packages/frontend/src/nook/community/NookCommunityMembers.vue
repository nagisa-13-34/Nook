<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<section :class="$style.root">
	<div v-for="member in members" :key="member.userId" :class="$style.member">
		<div :class="$style.identity"><div :class="$style.avatar"><img v-if="member.avatarUrl" :src="member.avatarUrl" alt=""><span v-else>{{ displayName(member).slice(0,1).toUpperCase() }}</span></div><div :class="$style.userText"><strong>{{ displayName(member) }}</strong><small>{{ handle(member) }} · {{ roleLabel(member.baseRole) }}</small></div></div>
		<div v-if="(canManage||canManageRoles)&&member.baseRole!=='owner'" :class="$style.controls">
			<div v-if="canManage" :class="$style.baseControls"><select :value="member.baseRole" @change="changeBaseRole(member.userId,($event.target as HTMLSelectElement).value)"><option value="member">{{ l.member }}</option><option value="moderator">{{ l.moderator }}</option><option value="admin">{{ l.administrator }}</option></select><button class="_button" :class="{[$style.banned]:member.state==='banned'}" @click="toggleBan(member)">{{ member.state==='banned'?'Unban':'Ban' }}</button></div>
			<div v-if="canManageRoles&&roles.length" :class="$style.roleToggles"><label v-for="role in roles" :key="role.id" :class="[$style.role,{[$style.enabled]:member.roleIds.includes(role.id)}]" :style="{'--role-color':role.color||'#175cd3'}"><span :class="$style.dot"></span><span>{{ role.name }}</span><input type="checkbox" :checked="member.roleIds.includes(role.id)" @change="assign(member.userId,role.id,($event.target as HTMLInputElement).checked)"></label></div>
		</div>
	</div>
</section>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { nookApi } from './nook-api.js'; import { communityLabels as l } from './labels.js'; import type { CommunityMember, CommunityRole } from './types.js';
const props=defineProps<{communityId:string;canManage:boolean;canManageRoles:boolean}>(); const members=ref<CommunityMember[]>([]),roles=ref<CommunityRole[]>([]);
function displayName(m:CommunityMember){return m.nickname||m.name||m.username} function handle(m:CommunityMember){return`@${m.username}${m.host?`@${m.host}`:''}`} function roleLabel(r:string){if(r==='owner')return l.owner;if(r==='admin')return l.administrator;if(r==='moderator')return l.moderator;return l.member}
async function load(){members.value=await nookApi('nook/community/members/list',{communityId:props.communityId});roles.value=props.canManageRoles?await nookApi('nook/community/roles/list',{communityId:props.communityId}):[]}
async function changeBaseRole(userId:string,baseRole:string){await nookApi('nook/community/members/update',{communityId:props.communityId,userId,baseRole});await load()} async function toggleBan(m:CommunityMember){await nookApi('nook/community/members/update',{communityId:props.communityId,userId:m.userId,state:m.state==='banned'?'active':'banned'});await load()} async function assign(userId:string,roleId:string,assigned:boolean){await nookApi('nook/community/roles/assign',{communityId:props.communityId,userId,roleId,assigned});await load()} onMounted(load);
</script>
<style lang="scss" module>
.root{padding:8px 16px;background:#fff}.member{padding:12px 0;border-bottom:1px solid #e2eaf3}.identity{display:flex;align-items:center;gap:10px}.avatar{width:38px;height:38px;flex:none;overflow:hidden;display:grid;place-items:center;border-radius:9px;background:#eef5ff;color:#175cd3;font-weight:800}.avatar img{width:100%;height:100%;object-fit:cover}.userText{min-width:0;display:flex;flex-direction:column}.userText strong,.userText small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.userText small{margin-top:2px;color:#718399}.controls{display:grid;gap:8px;margin-top:9px;padding-left:48px}.baseControls{display:flex;gap:7px}.baseControls select,.baseControls button{padding:7px 9px;border:1px solid #d7e3f1;border-radius:6px;background:#fff;color:#17324d}.baseControls button{color:#a33}.baseControls .banned{background:#fff1f1}.roleToggles{display:flex;flex-wrap:wrap;gap:6px}.role{--role-color:#175cd3;display:flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid #d7e3f1;border-radius:6px;background:#fff;color:#52677d;font-size:11px;cursor:pointer}.role.enabled{border-color:color-mix(in srgb,var(--role-color) 42%,#d7e3f1);background:color-mix(in srgb,var(--role-color) 9%,#fff);color:#17324d}.dot{width:9px;height:9px;border-radius:50%;background:var(--role-color)}.role input{width:16px;height:16px;margin-left:2px;accent-color:var(--role-color)}@media(max-width:600px){.controls{padding-left:0}}
</style>