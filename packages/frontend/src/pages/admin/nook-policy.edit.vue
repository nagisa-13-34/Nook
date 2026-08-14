<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 700px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
		<div class="_gaps">
			<MkInput v-model="form.id" :readonly="existingPolicy != null" pattern="[A-Z0-9_*\-]+">
				<template #label>{{ i18n.ts._nookAdmin.policyId }}</template>
			</MkInput>
			<MkInput v-model="form.country">
				<template #label>{{ i18n.ts._nookAdmin.country }}</template>
				<template #caption>{{ i18n.ts._nookAdmin.countryCaption }}</template>
			</MkInput>
			<MkSelect v-model="form.ageGroup" :items="ageGroupItems">
				<template #label>{{ i18n.ts._nookAdmin.ageGroup }}</template>
			</MkSelect>
			<MkInput v-model="form.priority" type="number" :min="-100000" :max="100000">
				<template #label>{{ i18n.ts._nookAdmin.priority }}</template>
			</MkInput>
			<MkSwitch v-model="form.enabled">{{ i18n.ts._nookAdmin.enabled }}</MkSwitch>

			<MkFolder :defaultOpen="true">
				<template #label>{{ i18n.ts._nookAdmin.accountStates }}</template>
				<div class="_gaps_s">
					<MkSwitch v-for="state in accountStateDefinitions" :key="state.key" :modelValue="form.accountStates.includes(state.key)" @update:modelValue="value => setAccountState(state.key, value)">
						{{ state.label }}
					</MkSwitch>
				</div>
			</MkFolder>

			<MkFolder :defaultOpen="true">
				<template #label>{{ i18n.ts._nookAdmin.permissions }}</template>
				<div :class="$style.permissionGrid">
					<MkSwitch v-for="permission in permissionDefinitions" :key="permission.key" v-model="form.permissions[permission.key]">
						{{ permission.label }}
					</MkSwitch>
				</div>
			</MkFolder>
		</div>
	</div>
	<template #footer>
		<div :class="$style.footer">
			<div class="_spacer" style="--MI_SPACER-w: 700px; --MI_SPACER-min: 16px; --MI_SPACER-max: 16px;">
				<MkButton primary rounded :disabled="saving" @click="save"><i class="ti ti-check"></i> {{ i18n.ts.save }}</MkButton>
			</div>
		</div>
	</template>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, reactive, ref, toRef } from 'vue';
import type * as Misskey from 'misskey-js';
import MkButton from '@/components/MkButton.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkInput from '@/components/MkInput.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { definePage } from '@/page.js';
import { useRouter } from '@/router.js';
import { misskeyApi } from '@/utility/misskey-api.js';

type PolicyRequest = Misskey.entities.AdminNookUpsertPolicyRequest;
type Permission = keyof PolicyRequest['permissions'];
type AccountState = PolicyRequest['accountStates'][number];

const props = withDefaults(defineProps<{ id?: string }>(), {
	id: undefined,
});
const id = toRef(props, 'id');
const router = useRouter();
const settings = await misskeyApi('admin/nook/get-settings');
const existingPolicy = id.value == null ? null : settings.policies.find(policy => policy.id === id.value) ?? null;
if (id.value != null && existingPolicy == null) {
	await os.alert({ type: 'error', text: i18n.ts._nookAdmin.policyNotFound });
	router.push('/admin/nook-settings');
}
const saving = ref(false);

const emptyPermissions = Object.fromEntries([
	'create_post', 'create_image_post', 'create_video_post', 'public_profile', 'discoverable_profile', 'follow_user', 'receive_follow', 'send_chat', 'receive_chat', 'chat_with_stranger', 'chat_with_adult', 'voice_call', 'video_call', 'call_with_stranger', 'call_with_adult', 'join_community', 'create_community', 'join_space', 'speak_in_space', 'create_space', 'external_link', 'location_share', 'recommendation', 'personalized_ads',
].map(key => [key, false])) as PolicyRequest['permissions'];

const form = reactive<PolicyRequest>(existingPolicy == null ? {
	id: '',
	country: 'JP',
	ageGroup: 'UNKNOWN',
	accountStates: ['active'],
	permissions: emptyPermissions,
	priority: 0,
	enabled: true,
} : {
	id: existingPolicy.id,
	country: existingPolicy.country,
	ageGroup: existingPolicy.ageGroup,
	accountStates: [...existingPolicy.accountStates],
	permissions: { ...existingPolicy.permissions },
	priority: existingPolicy.priority,
	enabled: existingPolicy.enabled,
});

const ageGroupItems: { label: string; value: PolicyRequest['ageGroup'] }[] = [
	{ label: i18n.ts._nookAdmin.ageGroups.u13, value: 'U13' },
	{ label: i18n.ts._nookAdmin.ageGroups.age13To15, value: '13_15' },
	{ label: i18n.ts._nookAdmin.ageGroups.age16To17, value: '16_17' },
	{ label: i18n.ts._nookAdmin.ageGroups.adult, value: '18_PLUS' },
	{ label: i18n.ts._nookAdmin.ageGroups.unknown, value: 'UNKNOWN' },
];

const accountStateDefinitions: { key: AccountState; label: string }[] = [
	{ key: 'active', label: i18n.ts._nookAdmin.states.active },
	{ key: 'limited', label: i18n.ts._nookAdmin.states.limited },
	{ key: 'suspended', label: i18n.ts._nookAdmin.states.suspended },
	{ key: 'banned', label: i18n.ts._nookAdmin.states.banned },
];

const permissionDefinitions: { key: Permission; label: string }[] = [
	{ key: 'create_post', label: i18n.ts._nookAdmin.permissionLabels.createPost },
	{ key: 'create_image_post', label: i18n.ts._nookAdmin.permissionLabels.createImagePost },
	{ key: 'create_video_post', label: i18n.ts._nookAdmin.permissionLabels.createVideoPost },
	{ key: 'public_profile', label: i18n.ts._nookAdmin.permissionLabels.publicProfile },
	{ key: 'discoverable_profile', label: i18n.ts._nookAdmin.permissionLabels.discoverableProfile },
	{ key: 'follow_user', label: i18n.ts._nookAdmin.permissionLabels.followUser },
	{ key: 'receive_follow', label: i18n.ts._nookAdmin.permissionLabels.receiveFollow },
	{ key: 'send_chat', label: i18n.ts._nookAdmin.permissionLabels.sendChat },
	{ key: 'receive_chat', label: i18n.ts._nookAdmin.permissionLabels.receiveChat },
	{ key: 'chat_with_stranger', label: i18n.ts._nookAdmin.permissionLabels.chatWithStranger },
	{ key: 'chat_with_adult', label: i18n.ts._nookAdmin.permissionLabels.chatWithAdult },
	{ key: 'voice_call', label: i18n.ts._nookAdmin.permissionLabels.voiceCall },
	{ key: 'video_call', label: i18n.ts._nookAdmin.permissionLabels.videoCall },
	{ key: 'call_with_stranger', label: i18n.ts._nookAdmin.permissionLabels.callWithStranger },
	{ key: 'call_with_adult', label: i18n.ts._nookAdmin.permissionLabels.callWithAdult },
	{ key: 'join_community', label: i18n.ts._nookAdmin.permissionLabels.joinCommunity },
	{ key: 'create_community', label: i18n.ts._nookAdmin.permissionLabels.createCommunity },
	{ key: 'join_space', label: i18n.ts._nookAdmin.permissionLabels.joinSpace },
	{ key: 'speak_in_space', label: i18n.ts._nookAdmin.permissionLabels.speakInSpace },
	{ key: 'create_space', label: i18n.ts._nookAdmin.permissionLabels.createSpace },
	{ key: 'external_link', label: i18n.ts._nookAdmin.permissionLabels.externalLink },
	{ key: 'location_share', label: i18n.ts._nookAdmin.permissionLabels.locationShare },
	{ key: 'recommendation', label: i18n.ts._nookAdmin.permissionLabels.recommendation },
	{ key: 'personalized_ads', label: i18n.ts._nookAdmin.permissionLabels.personalizedAds },
];

function setAccountState(state: AccountState, enabled: boolean) {
	if (enabled && !form.accountStates.includes(state)) form.accountStates.push(state);
	if (!enabled) form.accountStates = form.accountStates.filter(value => value !== state);
}

async function save() {
	form.id = form.id.trim().toUpperCase();
	form.country = form.country.trim().toUpperCase();
	if (!/^[A-Z0-9_*\-]+$/.test(form.id) || !/^(\*|[A-Z]{2})$/.test(form.country) || form.accountStates.length === 0) {
		await os.alert({ type: 'warning', text: i18n.ts._nookAdmin.validationError });
		return;
	}

	saving.value = true;
	try {
		await os.apiWithDialog('admin/nook/upsert-policy', { ...form, accountStates: [...form.accountStates], permissions: { ...form.permissions } });
		os.toast(i18n.ts._nookAdmin.saved);
		router.push('/admin/nook-settings');
	} catch {
		// apiWithDialog already displays the API error.
	} finally {
		saving.value = false;
	}
}

const headerTabs = computed(() => []);

definePage(() => ({
	title: existingPolicy == null ? i18n.ts._nookAdmin.newPolicy : i18n.ts._nookAdmin.editPolicy,
	icon: 'ti ti-shield-cog',
}));
</script>

<style lang="scss" module>
.permissionGrid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
	gap: 16px;
}

.footer {
	-webkit-backdrop-filter: var(--MI-blur, blur(15px));
	backdrop-filter: var(--MI-blur, blur(15px));
}
</style>
