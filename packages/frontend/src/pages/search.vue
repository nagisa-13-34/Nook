<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader v-model:tab="tab" :actions="headerActions" :tabs="headerTabs" :swipable="true">
	<div v-if="tab === 'note'" class="_spacer" style="--MI_SPACER-w: 800px;">
		<XNote v-bind="props"/>
	</div>

	<div v-else-if="tab === 'user'" class="_spacer" style="--MI_SPACER-w: 800px;">
		<div v-if="usersSearchAvailable">
			<XUser v-bind="props"/>
		</div>
		<div v-else>
			<MkInfo warn>{{ i18n.ts.usersSearchNotAvailable }}</MkInfo>
		</div>
	</div>

	<div v-else-if="tab === 'featured'">
		<XFeatured/>
	</div>

	<div v-else-if="tab === 'discoverUsers'">
		<XExploreUsers/>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, ref, toRef, watch } from 'vue';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { usersSearchAvailable } from '@/utility/check-permissions.js';
import MkInfo from '@/components/MkInfo.vue';

type SearchDiscoverTab = 'note' | 'user' | 'featured' | 'discoverUsers';

const props = withDefaults(defineProps<{
	query?: string,
	userId?: string,
	username?: string,
	host?: string | null,
	type?: SearchDiscoverTab,
	origin?: 'combined' | 'local' | 'remote',
	ignoreNotesSearchAvailable?: boolean,
}>(), {
	query: '',
	userId: undefined,
	username: undefined,
	host: undefined,
	type: 'note',
	origin: 'combined',
	ignoreNotesSearchAvailable: false,
});

const XNote = defineAsyncComponent(() => import('./search.note.vue'));
const XUser = defineAsyncComponent(() => import('./search.user.vue'));
const XFeatured = defineAsyncComponent(() => import('./explore.featured.vue'));
const XExploreUsers = defineAsyncComponent(() => import('./explore.users.vue'));

const tab = ref<SearchDiscoverTab>(toRef(props, 'type').value);

watch(() => props.type, (value) => {
	if (value != null) tab.value = value;
});

const headerActions = computed(() => []);

const headerTabs = computed(() => [{
	key: 'note',
	title: i18n.ts.notes,
	icon: 'ti ti-pencil',
}, {
	key: 'user',
	title: i18n.ts.users,
	icon: 'ti ti-search',
}, {
	key: 'featured',
	title: i18n.ts.featured,
	icon: 'ti ti-bolt',
}, {
	key: 'discoverUsers',
	title: i18n.ts.nookDiscoverUsers,
	icon: 'ti ti-users-plus',
}]);

definePage(() => ({
	title: i18n.ts.nookSearchDiscover,
	icon: 'ti ti-search',
}));
</script>
