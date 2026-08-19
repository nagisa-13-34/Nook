<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader v-model:tab="tab" :actions="headerActions" :tabs="headerTabs" :swipable="true">
	<div v-if="tab === 'featured'">
		<XFeatured/>
	</div>
	<div v-else-if="tab === 'spark'">
		<XVideos initialTab="shorts" :showTabs="false"/>
	</div>
	<div v-else-if="tab === 'theater'">
		<XVideos initialTab="videos" :showTabs="false"/>
	</div>
	<div v-else-if="tab === 'users'">
		<XUsers/>
	</div>
	<div v-else-if="tab === 'roles'">
		<XRoles/>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import XFeatured from './explore.featured.vue';
import XVideos from './explore.videos.vue';
import XUsers from './explore.users.vue';
import XRoles from './explore.roles.vue';
import { i18n } from '@/i18n.js';
import { isNookVideoFeedAvailable } from '@/nook/video-feed.js';
import { definePage } from '@/page.js';
import { availableBasicTimelines } from '@/timelines.js';

const props = withDefaults(defineProps<{
	initialTab?: string;
}>(), {
	initialTab: 'featured',
});

const videoFeedAvailable = computed(() => isNookVideoFeedAvailable(availableBasicTimelines()));

function normalizeInitialTab(value: string): string {
	const normalized = value === 'shorts' ? 'spark' : value === 'videos' ? 'theater' : value;
	if ((normalized === 'spark' || normalized === 'theater') && !videoFeedAvailable.value) return 'featured';
	return normalized;
}

const tab = ref(normalizeInitialTab(props.initialTab));

const headerActions = computed(() => []);

const headerTabs = computed(() => [{
	key: 'featured',
	icon: 'ti ti-bolt',
	title: i18n.ts.featured,
}, ...(videoFeedAvailable.value ? [{
	key: 'spark',
	icon: 'ti ti-sparkles',
	title: i18n.ts.nookShorts,
}, {
	key: 'theater',
	icon: 'ti ti-device-tv',
	title: i18n.ts.nookVideos,
}] : []), {
	key: 'users',
	icon: 'ti ti-users',
	title: i18n.ts.users,
}, {
	key: 'roles',
	icon: 'ti ti-badges',
	title: i18n.ts.roles,
}]);

definePage(() => ({
	title: i18n.ts.explore,
	icon: 'ti ti-hash',
}));
</script>
