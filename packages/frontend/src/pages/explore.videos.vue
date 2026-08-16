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
import { computed, onMounted, ref } from 'vue';
import type * as Misskey from 'misskey-js';
import MkButton from '@/components/MkButton.vue';
import MkNote from '@/components/MkNote.vue';
import MkTab from '@/components/MkTab.vue';
import { i18n } from '@/i18n.js';
import { hasNookVideo, noteMatchesNookVideoTab } from '@/nook/video-feed.js';
import type { NookVideoTab } from '@/nook/video-feed.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const FETCH_LIMIT = 100;

const tab = ref<NookVideoTab>('shorts');
const videoNotes = ref<Misskey.entities.Note[]>([]);
const fetching = ref(false);
const error = ref(false);
const canFetchMore = ref(true);
const untilId = ref<string | null>(null);

const activeNotes = computed(() => videoNotes.value.filter(note => noteMatchesNookVideoTab(note, tab.value)));

async function loadMore(): Promise<void> {
	if (fetching.value || !canFetchMore.value) return;

	fetching.value = true;
	error.value = false;

	try {
		const page = await misskeyApi('notes/local-timeline', {
			withFiles: true,
			withRenotes: false,
			withReplies: false,
			allowPartial: true,
			limit: FETCH_LIMIT,
			...(untilId.value == null ? {} : { untilId: untilId.value }),
		});

		if (page.length === 0) {
			canFetchMore.value = false;
			return;
		}

		untilId.value = page.at(-1)?.id ?? untilId.value;

		const seen = new Set(videoNotes.value.map(note => note.id));
		for (const note of page) {
			if (seen.has(note.id) || !hasNookVideo(note)) continue;
			seen.add(note.id);
			videoNotes.value.push(note);
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
	canFetchMore.value = true;
	await loadMore();
}

onMounted(loadMore);
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
