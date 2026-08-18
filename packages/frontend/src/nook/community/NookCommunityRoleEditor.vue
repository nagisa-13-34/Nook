<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<section :class="$style.root">
	<header :class="$style.sectionHeader">
		<div>
			<h3>{{ l.role }}</h3>
			<p>{{ l.roleHint }}</p>
		</div>
		<button class="_button" :class="$style.newButton" @click="creating = !creating"><i class="ti ti-plus"></i> {{ l.create }}</button>
	</header>

	<form v-if="creating" :class="$style.editor" @submit.prevent="createRole">
		<div :class="$style.roleTop">
			<input v-model="newName" required maxlength="64" :placeholder="l.roleName">
			<label :class="$style.colorField"><span>{{ l.roleColor }}</span><input v-model="newColor" type="color"></label>
		</div>
		<div :class="$style.permissions">
			<label v-for="permission in permissionOptions" :key="permission.key" :class="$style.permission">
				<span><strong>{{ permission.label }}</strong><small>{{ permission.key }}</small></span>
				<input v-model="newPermissions" type="checkbox" :value="permission.key">
			</label>
		</div>
		<div :class="$style.actions"><button class="_button" type="button" @click="creating = false">{{ l.cancel }}</button><button class="_button" :class="$style.primary">{{ l.create }}</button></div>
	</form>

	<div :class="$style.roles">
		<article v-for="role in roles" :key="role.id" :class="$style.roleCard">
			<div :class="$style.roleTop">
				<div :class="$style.roleIdentity"><span :class="$style.dot" :style="{ background: role.color || '#175cd3' }"></span><input v-model="drafts[role.id].name" maxlength="64"></div>
				<label :class="$style.colorField"><span>{{ l.roleColor }}</span><input v-model="drafts[role.id].color" type="color"></label>
			</div>
			<div :class="$style.permissions">
				<label v-for="permission in permissionOptions" :key="permission.key" :class="$style.permission">
					<span><strong>{{ permission.label }}</strong><small>{{ permission.key }}</small></span>
					<input v-model="drafts[role.id].permissions" type="checkbox" :value="permission.key">
				</label>
			</div>
			<div :class="$style.actions">
				<button class="_button" :class="$style.danger" @click="removeRole(role.id)"><i class="ti ti-trash"></i> {{ l.delete }}</button>
				<button class="_button" :class="$style.primary" @click="saveRole(role.id)">{{ l.save }}</button>
			</div>
		</article>
	</div>
</section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { nookApi } from './nook-api.js';
import { communityLabels as l } from './labels.js';
import type { CommunityRole } from './types.js';

const props = defineProps<{ communityId: string }>();
const roles = ref<CommunityRole[]>([]);
const creating = ref(false);
const newName = ref('');
const newColor = ref('#175cd3');
const newPermissions = ref<string[]>(['messages.post']);
const drafts = reactive<Record<string, { name: string; color: string; permissions: string[] }>>({});

const permissionOptions = [
	['community.manage', l.permissionCommunityManage],
	['channels.manage', l.permissionChannelsManage],
	['messages.post', l.permissionMessagesPost],
	['messages.moderate', l.permissionMessagesModerate],
	['threads.manage', l.permissionThreadsManage],
	['roles.manage', l.permissionRolesManage],
	['members.invite', l.permissionMembersInvite],
	['members.manage', l.permissionMembersManage],
	['members.kick', l.permissionMembersKick],
	['members.ban', l.permissionMembersBan],
	['messages.search', l.permissionMessagesSearch],
	['pins.manage', l.permissionPinsManage],
	['rules.manage', l.permissionRulesManage],
	['announcements.manage', l.permissionAnnouncementsManage],
	['events.manage', l.permissionEventsManage],
	['voice.manage', l.permissionVoiceManage],
	['bots.manage', l.permissionBotsManage],
].map(([key, label]) => ({ key, label }));

function syncDrafts() {
	for (const role of roles.value) {
		drafts[role.id] = { name: role.name, color: role.color || '#175cd3', permissions: [...role.permissions] };
	}
}

async function load() {
	roles.value = await nookApi('nook/community/roles/list', { communityId: props.communityId });
	syncDrafts();
}

async function createRole() {
	const name = newName.value.trim();
	if (!name) return;
	await nookApi('nook/community/roles/create', { communityId: props.communityId, name, color: newColor.value, permissions: newPermissions.value });
	newName.value = '';
	newColor.value = '#175cd3';
	newPermissions.value = ['messages.post'];
	creating.value = false;
	await load();
}

async function saveRole(roleId: string) {
	const draft = drafts[roleId];
	if (!draft?.name.trim()) return;
	await nookApi('nook/community/roles/update', { communityId: props.communityId, roleId, name: draft.name.trim(), color: draft.color, permissions: draft.permissions });
	await load();
}

async function removeRole(roleId: string) {
	if (!window.confirm(l.deleteRoleConfirm)) return;
	await nookApi('nook/community/roles/delete', { communityId: props.communityId, roleId });
	await load();
}

onMounted(load);
</script>

<style lang="scss" module>
.root{display:grid;gap:12px}.sectionHeader{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.sectionHeader h3{margin:0}.sectionHeader p{margin:4px 0 0;color:#718399;font-size:12px}.newButton,.primary{padding:8px 12px;border-radius:7px;background:#ffd84d;color:#17324d;font-weight:750}.roles{display:grid;gap:10px}.editor,.roleCard{padding:12px;border:1px solid #d7e3f1;border-radius:8px;background:#fbfdff}.roleTop{display:flex;align-items:center;justify-content:space-between;gap:12px}.roleIdentity{display:flex;align-items:center;gap:8px;min-width:0;flex:1}.roleIdentity input,.editor>.roleTop>input{min-width:0;flex:1;padding:8px 9px;border:1px solid #d7e3f1;border-radius:6px;background:#fff;color:#17324d}.dot{width:12px;height:12px;border-radius:50%;flex:none}.colorField{display:flex;align-items:center;gap:7px;font-size:11px;color:#62768c}.colorField input{width:34px;height:28px;padding:0;border:0;background:transparent}.permissions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:12px}.permission{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 9px;border:1px solid #e2eaf3;border-radius:7px;background:#fff}.permission>span{min-width:0;display:flex;flex-direction:column}.permission strong{font-size:12px}.permission small{font-size:9px;color:#8190a0;overflow:hidden;text-overflow:ellipsis}.permission input{width:18px;height:18px;accent-color:#175cd3}.actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.actions>button{padding:8px 12px;border-radius:7px}.danger{color:#c62828;background:#fff1f1}@media(max-width:700px){.permissions{grid-template-columns:1fr}.roleTop{align-items:flex-start;flex-direction:column}.colorField{width:100%;justify-content:space-between}}
</style>