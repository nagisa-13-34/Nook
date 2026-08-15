<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<component :is="prefer.s.enablePullToRefresh ? MkPullToRefresh : 'div'" :refresher="reload">
	<MkLoading v-if="loading"/>

	<MkError v-else-if="error" @retry="reload"/>

	<div v-else-if="notes.length === 0">
		<MkResult type="empty" :text="i18n.ts.noNotes"/>
	</div>

	<div v-else>
		<div :class="$style.notes">
			<MkNote
				v-for="note in notes"
				:key="note.id"
				:class="$style.note"
				:note="note"
				:withHardMute="true"
				:data-scroll-anchor="note.id"
			/>
		</div>

		<MkError v-if="loadMoreError" @retry="loadMore"/>
		<button
			v-else-if="hasMore"
			v-appear="prefer.s.enableInfiniteScroll ? loadMore : null"
			class="_button"
			:class="$style.more"
			:disabled="loadingMore"
			@click="loadMore"
		>
			<span v-if="!loadingMore">{{ i18n.ts.loadMore }}</span>
			<MkLoading v-else :inline="true"/>
		</button>
	</div>
</component>
</template>

<script lang="ts" setup>
import { computed, onMounted, provide, ref } from 'vue';
import * as Misskey from 'misskey-js';
import MkNote from '@/components/MkNote.vue';
import MkPullToRefresh from '@/components/MkPullToRefresh.vue';
import { useGlobalEvent } from '@/events.js';
import { i18n } from '@/i18n.js';
import { isNookRecommendationUnavailableError, mergeNookRecommendationPage } from '@/nook/timeline.js';
import { prefer } from '@/preferences.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const PAGE_SIZE = 20;
const MAX_RECOMMENDATION_OFFSET = 400;

const props = withDefaults(defineProps<{
	withSensitive?: boolean;
}>(), {
	withSensitive: true,
});

const emit = defineEmits<{
	unavailable: [];
}>();

provide('inTimeline', true);
provide('tl_withSensitive', computed(() => props.withSensitive));

const notes = ref<Misskey.entities.Note[]>([]);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref(false);
const loadMoreError = ref(false);
const hasMore = ref(true);
const nextOffset = ref(0);

async function fetchPage(reset: boolean): Promise<void> {
	const offset = reset ? 0 : nextOffset.value;

	if (reset) {
		loading.value = true;
		error.value = false;
		loadMoreError.value = false;
		hasMore.value = true;
		nextOffset.value = 0;
		notes.value = [];
	} else {
		loadingMore.value = true;
		loadMoreError.value = false;
	}

	try {
		const page = await misskeyApi('notes/recommended', {
			limit: PAGE_SIZE,
			offset,
		});

		notes.value = reset ? page : mergeNookRecommendationPage(notes.value, page);
		nextOffset.value = offset + page.length;
		hasMore.value = page.length === PAGE_SIZE && nextOffset.value <= MAX_RECOMMENDATION_OFFSET;
	} catch (err) {
		if (isNookRecommendationUnavailableError(err)) {
			emit('unavailable');
			return;
		}
		if (reset) {
			error.value = true;
		} else {
			loadMoreError.value = true;
		}
	} finally {
		if (reset) {
			loading.value = false;
		} else {
			loadingMore.value = false;
		}
	}
}

async function reload(): Promise<void> {
	await fetchPage(true);
}

async function loadMore(): Promise<void> {
	if (!hasMore.value || loading.value || loadingMore.value) return;
	await fetchPage(false);
}

useGlobalEvent('noteDeleted', (noteId) => {
	notes.value = notes.value.filter(note => note.id !== noteId);
});

onMounted(() => {
	void reload();
});

defineExpose({
	reload,
});
</script>

<style lang="scss" module>
.notes {
	background: var(--MI_THEME-panel);
}

.note {
	border-bottom: solid 0.5px var(--MI_THEME-divider);

	&:last-child {
		border-bottom: 0;
	}
}

.more {
	display: block;
	margin: var(--MI-margin) auto;
	padding: 8px 16px;
	border-radius: 32px;
}
</style>
