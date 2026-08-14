<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions" :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 760px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
		<div class="_gaps">
			<MkInfo>{{ i18n.ts._nookAdmin.description }}</MkInfo>

			<MkFolder :defaultOpen="true">
				<template #icon><i class="ti ti-toggle-left"></i></template>
				<template #label>{{ i18n.ts._nookAdmin.featureFlags }}</template>

				<div class="_gaps_s">
					<div>{{ i18n.ts._nookAdmin.featureFlagsDescription }}</div>
					<div v-for="flag in featureFlags" :key="flag.name" class="_panel" :class="$style.item">
						<MkSwitch
							:modelValue="flag.enabled"
							:disabled="updatingFlags.has(flag.name)"
							@update:modelValue="value => updateFeatureFlag(flag, value)"
						>
							<template #label>{{ featureLabels[flag.name] }}</template>
							<template #caption>{{ flag.updatedAt == null ? i18n.ts._nookAdmin.defaultValue : dateTimeFormat.format(new Date(flag.updatedAt)) }}</template>
						</MkSwitch>
					</div>
				</div>
			</MkFolder>

			<MkFolder :defaultOpen="true">
				<template #icon><i class="ti ti-shield-check"></i></template>
				<template #label>{{ i18n.ts._nookAdmin.policies }}</template>
				<template #footer>
					<MkButton primary rounded @click="createPolicy"><i class="ti ti-plus"></i> {{ i18n.ts._nookAdmin.newPolicy }}</MkButton>
				</template>

				<div class="_gaps_s">
					<div>{{ i18n.ts._nookAdmin.policiesDescription }}</div>
					<MkInfo v-if="policies.length === 0">{{ i18n.ts._nookAdmin.noPolicies }}</MkInfo>
					<button v-for="policy in policies" :key="policy.id" class="_button _panel" :class="$style.policy" @click="editPolicy(policy.id)">
						<div :class="$style.policyHeader">
							<strong>{{ policy.id }}</strong>
							<span :class="[$style.status, { [$style.statusDisabled]: !policy.enabled }]">{{ policy.enabled ? i18n.ts._nookAdmin.enabled : i18n.ts._nookAdmin.disabled }}</span>
						</div>
						<div :class="$style.policyMeta">{{ policy.country }} · {{ ageGroupLabels[policy.ageGroup] }} · {{ i18n.ts._nookAdmin.priority }} {{ policy.priority }}</div>
					</button>
				</div>
			</MkFolder>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';
import type * as Misskey from 'misskey-js';
import MkButton from '@/components/MkButton.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { definePage } from '@/page.js';
import { useRouter } from '@/router.js';
import { misskeyApi } from '@/utility/misskey-api.js';

type Settings = Misskey.entities.AdminNookGetSettingsResponse;
type FeatureFlag = Settings['featureFlags'][number];

const router = useRouter();
const settings = await misskeyApi('admin/nook/get-settings');
const featureFlags = ref(settings.featureFlags);
const policies = ref(settings.policies);
const updatingFlags = reactive(new Set<FeatureFlag['name']>());
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const featureLabels: Record<FeatureFlag['name'], string> = {
	policy_enforcement: i18n.ts._nookAdmin.features.policyEnforcement,
	video: i18n.ts._nookAdmin.features.video,
	chat: i18n.ts._nookAdmin.features.chat,
	voice_call: i18n.ts._nookAdmin.features.voiceCall,
	video_call: i18n.ts._nookAdmin.features.videoCall,
	community: i18n.ts._nookAdmin.features.community,
	spaces: i18n.ts._nookAdmin.features.spaces,
	recommendations: i18n.ts._nookAdmin.features.recommendations,
	external_links: i18n.ts._nookAdmin.features.externalLinks,
	migration: i18n.ts._nookAdmin.features.migration,
	federation: i18n.ts._nookAdmin.features.federation,
};

const ageGroupLabels: Record<Settings['policies'][number]['ageGroup'], string> = {
	U13: i18n.ts._nookAdmin.ageGroups.u13,
	'13_15': i18n.ts._nookAdmin.ageGroups.age13To15,
	'16_17': i18n.ts._nookAdmin.ageGroups.age16To17,
	'18_PLUS': i18n.ts._nookAdmin.ageGroups.adult,
	UNKNOWN: i18n.ts._nookAdmin.ageGroups.unknown,
};

async function updateFeatureFlag(flag: FeatureFlag, enabled: boolean) {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: enabled
			? i18n.tsx._nookAdmin.enableFeatureConfirm({ name: featureLabels[flag.name] })
			: i18n.tsx._nookAdmin.disableFeatureConfirm({ name: featureLabels[flag.name] }),
	});
	if (canceled) return;

	const previous = flag.enabled;
	flag.enabled = enabled;
	updatingFlags.add(flag.name);
	try {
		const updated = await os.apiWithDialog('admin/nook/update-feature-flag', { name: flag.name, enabled });
		Object.assign(flag, updated);
	} catch {
		flag.enabled = previous;
	} finally {
		updatingFlags.delete(flag.name);
	}
}

function createPolicy() {
	router.push('/admin/nook-policies/new');
}

function editPolicy(id: string) {
	router.push('/admin/nook-policies/:id/edit', { params: { id } });
}

const headerActions = computed(() => []);
const headerTabs = computed(() => []);

definePage(() => ({
	title: i18n.ts._nookAdmin.title,
	icon: 'ti ti-shield-cog',
}));
</script>

<style lang="scss" module>
.item {
	padding: 16px;
}

.policy {
	display: block;
	width: 100%;
	padding: 16px;
	text-align: left;
}

.policyHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.policyMeta {
	margin-top: 6px;
	color: color-mix(in srgb, var(--MI_THEME-fg) 65%, transparent);
}

.status {
	color: var(--MI_THEME-success);
}

.statusDisabled {
	color: var(--MI_THEME-warn);
}
</style>
