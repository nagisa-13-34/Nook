<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<section class="_panel" :class="$style.root">
	<div v-for="member in members" :key="member.userId" :class="$style.member">
		<div><strong>{{ member.nickname || member.userId }}</strong><small> · {{ member.baseRole }} · {{ member.state }}</small></div>
		<div v-if="canManage && member.baseRole !== 'owner'" :class="$style.controls">
			<select :value="member.baseRole" @change="changeBaseRole(member.userId,($event.target as HTMLSelectElement).value)"><option value="member">member</option><option value="moderator">moderator</option><option value="admin">admin</option></select>
			<button class="_button" @click="toggleBan(member)">{{ member.state === 'banned' ? 'Unban' : 'Ban' }}</button>
			<label v-for="role in roles" :key="role.id"><input type="checkbox" :checked="member.roleIds.includes(role.id)" @change="assign(member.userId,role.id,($event.target as HTMLInputElement).checked)"> {{ role.name }}</label>
		</div>
	</div>
</section>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'; import { nookApi } from './nook-api.js'; import type { CommunityMember, CommunityRole } from './types.js';
const props=defineProps<{communityId:string;canManage:boolean}>(); const members=ref<CommunityMember[]>([]); const roles=ref<CommunityRole[]>([]);
async function load(){[members.value,roles.value]=await Promise.all([nookApi('nook/community/members/list',{communityId:props.communityId}),nookApi('nook/community/roles/list',{communityId:props.communityId})]);}
async function changeBaseRole(userId:string,baseRole:string){await nookApi('nook/community/members/update',{communityId:props.communityId,userId,baseRole});await load();}
async function toggleBan(m:CommunityMember){await nookApi('nook/community/members/update',{communityId:props.communityId,userId:m.userId,state:m.state==='banned'?'active':'banned'});await load();}
async function assign(userId:string,roleId:string,assigned:boolean){await nookApi('nook/community/roles/assign',{communityId:props.communityId,userId,roleId,assigned});await load();}
onMounted(load);
</script>
<style module>.root{padding:8px 16px}.member{padding:12px 0;border-bottom:1px solid var(--MI_THEME-divider)}.controls{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;align-items:center}</style>
