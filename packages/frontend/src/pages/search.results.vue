<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<MkNotesTimeline
		v-if="tab === 'note' && notesPaginator"
		:key="`nook-search-notes:${searchKey}`"
		:paginator="notesPaginator"
	/>

	<div v-else-if="tab === 'user'">
		<MkInfo v-if="!usersSearchAvailable" warn>{{ i18n.ts.usersSearchNotAvailable }}</MkInfo>
		<MkUserList
			v-else-if="usersPaginator"
			:key="`nook-search-users:${searchKey}`"
			:paginator="usersPaginator"
		/>
	</div>

	<MkChannelList
		v-else-if="tab === 'nest' && nestsPaginator"
		:key="`nook-search-nests:${searchKey}`"
		:paginator="nestsPaginator"
	/>
</div>
</template>

<script lang="ts" setup>
import { markRaw, shallowRef, ref, watch } from 'vue';
import MkNotesTimeline from '@/components/MkNotesTimeline.vue';
import MkUserList from '@/components/MkUserList.vue';
import MkChannelList from '@/components/MkChannelList.vue';
import MkInfo from '@/components/MkInfo.vue';
import { Paginator } from '@/utility/paginator.js';
import { instance } from '@/instance.js';
import { usersSearchAvailable } from '@/utility/check-permissions.js';
import { i18n } from '@/i18n.js';

type SearchResultTab = 'note' | 'user' | 'nest';

const props = defineProps<{
	query: string;
	tab: SearchResultTab;
}>();

const notesPaginator = shallowRef();
const usersPaginator = shallowRef();
const nestsPaginator = shallowRef();
const searchKey = ref(0);

function rebuildResults() {
	const query = props.query.trim();
	if (query === '') {
		notesPaginator.value = null;
		usersPaginator.value = null;
		nestsPaginator.value = null;
		return;
	}

	notesPaginator.value = markRaw(new Paginator('notes/search', {
		limit: 10,
		params: {
			query,
			...(instance.federation === 'none' || instance.noteSearchableScope === 'local' ? { host: '.' } : {}),
		},
	}));

	usersPaginator.value = markRaw(new Paginator('users/search', {
		limit: 10,
		offsetMode: true,
		params: {
			query,
			origin: instance.federation === 'none' ? 'local' : 'combined',
		},
	}));

	nestsPaginator.value = markRaw(new Paginator('channels/search', {
		limit: 10,
		params: {
			query,
			type: 'nameAndDescription',
		},
	}));

	searchKey.value++;
}

watch(() => props.query, rebuildResults, { immediate: true });
</script>

<style lang="scss" module>
.root {
	min-width: 0;
}
</style>
