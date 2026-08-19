<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_spacer" style="--MI_SPACER-w: 800px;">
	<div class="_gaps">
		<MkInput v-model="searchQuery" :large="true" :autofocus="true" type="search" placeholder="ネストを検索" @enter="search">
			<template #prefix><i class="ti ti-search"></i></template>
		</MkInput>
		<MkButton primary rounded @click="search"><i class="ti ti-search"></i> 検索</MkButton>
	</div>

	<MkFoldableSection v-if="channelPaginator" style="margin-top: 20px;">
		<template #header>ネスト</template>
		<MkChannelList :key="key" :paginator="channelPaginator"/>
	</MkFoldableSection>
</div>
</template>

<script lang="ts" setup>
import { markRaw, ref, shallowRef, watch } from 'vue';
import MkInput from '@/components/MkInput.vue';
import MkButton from '@/components/MkButton.vue';
import MkFoldableSection from '@/components/MkFoldableSection.vue';
import MkChannelList from '@/components/MkChannelList.vue';
import { Paginator } from '@/utility/paginator.js';

const props = withDefaults(defineProps<{
	query?: string;
}>(), {
	query: '',
});

const searchQuery = ref('');
const key = ref('');
const channelPaginator = shallowRef();

function search(): void {
	const query = searchQuery.value.trim();
	if (query.length === 0) return;
	channelPaginator.value = markRaw(new Paginator('channels/search', {
		limit: 10,
		params: {
			query,
			type: 'nameAndDescription',
		},
	}));
	key.value = query;
}

watch(() => props.query, (value) => {
	searchQuery.value = value ?? '';
	if (searchQuery.value.trim().length > 0) search();
}, { immediate: true });
</script>
