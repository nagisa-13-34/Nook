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

		<MkError v-if="loadMoreError" @retry="retryLoadMore"/>
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
const MAX_RECOMMENDATION_LIMIT = 400;

type RecommendationPageRequest = Misskey.Endpoints['notes/recommended-page']['req'];

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
const cursor = ref<string | null>(null);
const requestGeneration = ref(0);

function isInvalidRecommendationCursorError(err: unknown): boolean {
	if (typeof err !== 'object' || err == null || !('code' in err)) return false;
	return (err as { code?: unknown }).code === 'INVALID_RECOMMENDATION_CURSOR';
}

async function fetchPage(reset: boolean): Promise<void> {
	if (!reset && (!hasMore.value || loading.value || loadingMore.value)) return;

	if (reset) {
		requestGeneration.value++;
		cursor.value = null;
		loading.value = true;
		loadingMore.value = false;
		error.value = false;
		loadMoreError.value = false;
		hasMore.value = true;
		notes.value = [];
	} else {
		loadingMore.value = true;
		loadMoreError.value = false;
	}

	const generation = requestGeneration.value;
	const remaining = MAX_RECOMMENDATION_LIMIT - notes.value.length;
	const limit = Math.min(PAGE_SIZE, remaining);

	if (limit <= 0) {
		hasMore.value = false;
		loading.value = false;
		loadingMore.value = false;
		return;
	}

	const request: RecommendationPageRequest = {
		limit,
		...(reset || cursor.value == null ? {} : { cursor: cursor.value }),
	};

	try {
		const page = await misskeyApi('notes/recommended-page', request);
		if (generation !== requestGeneration.value) return;

		notes.value = reset ? page.notes : mergeNookRecommendationPage(notes.value, page.notes);
		cursor.value = page.cursor;
		hasMore.value = page.cursor != null && notes.value.length < MAX_RECOMMENDATION_LIMIT;
	} catch (err) {
		if (generation !== requestGeneration.value) return;
		if (isNookRecommendationUnavailableError(err)) {
			emit('unavailable');
			return;
		}
		if (reset) {
			error.value = true;
		} else {
			if (isInvalidRecommendationCursorError(err)) {
				cursor.value = null;
				hasMore.value = false;
			}
			loadMoreError.value = true;
		}
	} finally {
		if (generation === requestGeneration.value) {
			if (reset) {
				loading.value = false;
			} else {
				loadingMore.value = false;
			}
		}
	}
}

async function reload(): Promise<void> {
	await fetchPage(true);
}

async function loadMore(): Promise<void> {
	await fetchPage(false);
}

async function retryLoadMore(): Promise<void> {
	if (cursor.value == null) {
		await reload();
		return;
	}
	await loadMore();
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
	width: 100%;
	padding: 16px;
}
</style>
