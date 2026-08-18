<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<section class="_panel" :class="$style.root">
	<div v-for="member in members" :key="member.userId" :class="$style.member">
		<div :class="$style.identity">
			<div :class="$style.avatar">
				<img v-if="member.avatarUrl" :src="member.avatarUrl" alt="">
				<span v-else>{{ displayName(member).slice(0, 1).toUpperCase() }}</span>
			</div>
			<div :class="$style.userText">
				<strong>{{ displayName(member) }}</strong>
				<small>{{ handle(member) }} · {{ roleLabel(member.baseRole) }}</small>
			</div>
		</div>
		<div v-if="(canManage || canManageRoles) && member.baseRole !== 'owner'" :class="$style.controls">
			<select v-if="canManage" :value="member.baseRole" @change="changeBaseRole(member.userId, ($event.target as HTMLSelectElement).value)">
				<option value="member">{{ l.member }}</option>
				<option value="moderator">{{ l.moderator }}</option>
				<option value="admin">{{ l.administrator }}</option>
			</select>
			<button v-if="canManage" class="_button" @click="toggleBan(member)">{{ member.state === 'banned' ? 'Unban' : 'Ban' }}</button>
			<template v-if="canManageRoles">
				<label v-for="role in roles" :key="role.id"><input type="checkbox" :checked="member.roleIds.includes(role.id)" @change="assign(member.userId, role.id, ($event.target as HTMLInputElement).checked)"> {{ role.name }}</label>
			</template>
		</div>
	</div>
</section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { nookApi } from './nook-api.js';
import { communityLabels as l } from './labels.js';
import type { CommunityMember, CommunityRole } from './types.js';

const props = defineProps<{ communityId: string; canManage: boolean; canManageRoles: boolean }>();
const members = ref<CommunityMember[]>([]);
const roles = ref<CommunityRole[]>([]);

function displayName(member: CommunityMember) {
	return member.nickname || member.name || member.username;
}

function handle(member: CommunityMember) {
	return `@${member.username}${member.host ? `@${member.host}` : ''}`;
}

function roleLabel(role: string) {
	if (role === 'owner') return l.owner;
	if (role === 'admin') return l.administrator;
	if (role === 'moderator') return l.moderator;
	return l.member;
}

async function load() {
	members.value = await nookApi('nook/community/members/list', { communityId: props.communityId });
	roles.value = props.canManageRoles ? await nookApi('nook/community/roles/list', { communityId: props.communityId }) : [];
}

async function changeBaseRole(userId: string, baseRole: string) {
	await nookApi('nook/community/members/update', { communityId: props.communityId, userId, baseRole });
	await load();
}

async function toggleBan(member: CommunityMember) {
	await nookApi('nook/community/members/update', { communityId: props.communityId, userId: member.userId, state: member.state === 'banned' ? 'active' : 'banned' });
	await load();
}

async function assign(userId: string, roleId: string, assigned: boolean) {
	await nookApi('nook/community/roles/assign', { communityId: props.communityId, userId, roleId, assigned });
	await load();
}

onMounted(load);
</script>

<style module>
.root { padding: 8px 16px; }
.member { padding: 12px 0; border-bottom: 1px solid var(--MI_THEME-divider); }
.identity { display: flex; align-items: center; gap: 10px; }
.avatar { width: 38px; height: 38px; flex: 0 0 auto; overflow: hidden; display: grid; place-items: center; border-radius: 10px; background: #eef5ff; color: #175cd3; font-weight: 800; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.userText { min-width: 0; display: flex; flex-direction: column; }
.userText strong, .userText small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.userText small { margin-top: 2px; opacity: .68; }
.controls { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; align-items: center; padding-left: 48px; }
</style>
