<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_spacer" style="--MI_SPACER-w: 900px;">
	<MkTab
		v-model="tab"
		:tabs="[
			{ key: 'shorts', label: i18n.ts.nookShorts },
			{ key: 'videos', label: i18n.ts.nookVideos },
		]"
		:class="$style.tabs"
	>
	</MkTab>

	<MkLoading v-if="fetching && videoNotes.length === 0"/>
	<MkError v-else-if="error && videoNotes.length === 0" @retry="reload"/>

	<div v-else :class="[$style.feed, { [$style.shortsFeed]: tab === 'shorts' }]">
		<MkNote
			v-for="note in activeNotes"
			:key="note.id"
			:note="note"
			:withHardMute="true"
			:class="$style.note"
		/>

		<div v-if="activeNotes.length === 0 && !fetching" :class="$style.empty">
			<i class="ti ti-video-off" :class="$style.emptyIcon"></i>
			<span>{{ i18n.ts.noNotes }}</span>
		</div>

		<div v-if="canFetchMore" :class="$style.more">
			<MkButton :wait="fetching" @click="loadMore">{{ i18n.ts.loadMore }}</MkButton>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, onMounted, provide, ref, watch } from 'vue';
import type * as Misskey from 'misskey-js';
import MkButton from '@/components/MkButton.vue';
import MkNote from '@/components/MkNote.vue';
import MkTab from '@/components/MkTab.vue';
import { useGlobalEvent } from '@/events.js';
import { i18n } from '@/i18n.js';
import { hasNookVideo, noteMatchesNookVideoTab, resolveNookVideoTimelineSource } from '@/nook/video-feed.js';
import type { NookVideoTab } from '@/nook/video-feed.js';
import { store } from '@/store.js';
import { availableBasicTimelines } from '@/timelines.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const FETCH_LIMIT = 50;
const MAX_BACKFILL_PAGES = 4;
const TARGET_TAB_NOTES = 12;

const tab = ref<NookVideoTab>('shorts');
const videoNotes = ref<Misskey.entities.Note[]>([]);
const fetching = ref(false);
const error = ref(false);
const canFetchMore = ref(true);
const untilId = ref<string | null>(null);

const source = computed(() => resolveNookVideoTimelineSource(availableBasicTimelines()));
const withSensitive = computed(() => store.r.tl.value.filter.withSensitive);
const activeNotes = computed(() => videoNotes.value.filter(note => noteMatchesNookVideoTab(note, tab.value)));

provide('inTimeline', true);
provide('tl_withSensitive', withSensitive);

async function fetchVideoPage(cursor: string | null): Promise<Misskey.entities.Note[]> {
	const pagination = cursor == null ? {} : { untilId: cursor };

	if (source.value === 'local') {
		return await misskeyApi('notes/local-timeline', {
			withFiles: true,
			withRenotes: false,
			withReplies: false,
			allowPartial: false,
			limit: FETCH_LIMIT,
			...pagination,
		});
	}

	if (source.value === 'global') {
		return await misskeyApi('notes/global-timeline', {
			withFiles: true,
			withRenotes: false,
			limit: FETCH_LIMIT,
			...pagination,
		});
	}

	return [];
}

async function loadMore(): Promise<void> {
	if (fetching.value || !canFetchMore.value) return;
	if (source.value == null) {
		canFetchMore.value = false;
		return;
	}

	fetching.value = true;
	error.value = false;

	const requestedTab = tab.value;
	const initialMatchingCount = videoNotes.value.filter(note => noteMatchesNookVideoTab(note, requestedTab)).length;

	try {
		for (let pagesFetched = 0; pagesFetched < MAX_BACKFILL_PAGES && canFetchMore.value; pagesFetched++) {
			const previousUntilId = untilId.value;
			const page = await fetchVideoPage(previousUntilId);

			if (page.length === 0) {
				canFetchMore.value = false;
				break;
			}

			const nextUntilId = page.at(-1)?.id;
			if (nextUntilId == null || nextUntilId === previousUntilId) {
				canFetchMore.value = false;
				break;
			}
			untilId.value = nextUntilId;

			const seen = new Set(videoNotes.value.map(note => note.id));
			for (const note of page) {
				if (seen.has(note.id) || !hasNookVideo(note)) continue;
				seen.add(note.id);
				videoNotes.value.push(note);
			}

			if (page.length < FETCH_LIMIT) {
				canFetchMore.value = false;
			}

			const matchingCount = videoNotes.value.filter(note => noteMatchesNookVideoTab(note, requestedTab)).length;
			if (matchingCount - initialMatchingCount >= TARGET_TAB_NOTES) break;
		}
	} catch {
		error.value = true;
	} finally {
		fetching.value = false;
	}
}

async function reload(): Promise<void> {
	videoNotes.value = [];
	untilId.value = null;
	canFetchMore.value = source.value != null;
	await loadMore();
}

watch(tab, () => {
	if (activeNotes.value.length === 0 && canFetchMore.value) void loadMore();
});

watch(source, () => {
	void reload();
});

useGlobalEvent('noteDeleted', (noteId) => {
	videoNotes.value = videoNotes.value.filter(note => note.id !== noteId);
});

onMounted(() => {
	void loadMore();
});
</script>

<style lang="scss" module>
.tabs {
	margin-bottom: var(--MI-margin);
}

.feed {
	display: flex;
	flex-direction: column;
	gap: var(--MI-margin);
}

.shortsFeed {
	max-width: 560px;
	margin-inline: auto;
}

.note {
	background: var(--MI_THEME-panel);
	border-radius: var(--MI-radius);
	overflow: clip;
}

.empty {
	min-height: 240px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10px;
	color: var(--MI_THEME-fgTransparentWeak);
	text-align: center;
}

.emptyIcon {
	font-size: 42px;
	color: var(--MI_THEME-accent);
}

.more {
	display: flex;
	justify-content: center;
	padding: 8px 0 16px;
}
</style>
