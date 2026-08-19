<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions" :tabs="[]" :swipable="false">
	<div :class="$style.page">
		<section :class="$style.hero">
			<div :class="$style.heroIcon"><i class="ti ti-video"></i></div>
			<div>
				<h1 :class="$style.title">{{ i18n.ts.nookVideo }}</h1>
				<p :class="$style.description">{{ i18n.ts.nookVideoDescription }}</p>
			</div>
		</section>

		<form v-if="videoFeedAvailable" :class="$style.search" @submit.prevent="submitVideoSearch">
			<i class="ti ti-search" aria-hidden="true"></i>
			<input
				v-model="videoSearchInput"
				type="search"
				placeholder="動画を検索"
				aria-label="動画を検索"
				autocomplete="off"
			>
			<button
				v-if="videoSearchQuery !== ''"
				type="button"
				class="_button"
				:class="$style.clearSearch"
				aria-label="検索をクリア"
				@click="clearVideoSearch"
			>
				<i class="ti ti-x"></i>
			</button>
			<button
				type="submit"
				class="_button"
				:class="$style.searchButton"
				:disabled="videoSearchInput.trim() === ''"
			>
				検索
			</button>
		</form>

		<div v-if="videoFeedAvailable" :class="$style.modePicker" role="tablist" :aria-label="i18n.ts.nookVideo">
			<button
				class="_button"
				:class="[$style.mode, { [$style.active]: tab === 'shorts' }]"
				role="tab"
				:aria-selected="tab === 'shorts'"
				@click="tab = 'shorts'"
			>
				<span :class="$style.modeIcon"><i class="ti ti-sparkles"></i></span>
				<span :class="$style.modeText">
					<strong>{{ i18n.ts.nookShorts }}</strong>
					<small>{{ i18n.ts.nookShortsDescription }}</small>
				</span>
			</button>
			<button
				class="_button"
				:class="[$style.mode, { [$style.active]: tab === 'videos' }]"
				role="tab"
				:aria-selected="tab === 'videos'"
				@click="tab = 'videos'"
			>
				<span :class="$style.modeIcon"><i class="ti ti-device-tv"></i></span>
				<span :class="$style.modeText">
					<strong>{{ i18n.ts.nookVideos }}</strong>
					<small>{{ i18n.ts.nookVideosDescription }}</small>
				</span>
			</button>
		</div>

		<div v-if="!videoFeedAvailable" :class="$style.unavailable">
			<i class="ti ti-video-off"></i>
			<span>{{ i18n.ts.noNotes }}</span>
		</div>
		<XVideos v-else :initialTab="tab" :showTabs="false" :searchQuery="videoSearchQuery"/>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import XVideos from './explore.videos.vue';
import { i18n } from '@/i18n.js';
import { isNookVideoFeedAvailable } from '@/nook/video-feed.js';
import type { NookVideoTab } from '@/nook/video-feed.js';
import { definePage } from '@/page.js';
import { availableBasicTimelines } from '@/timelines.js';

const tab = ref<NookVideoTab>('shorts');
const videoSearchInput = ref('');
const videoSearchQuery = ref('');
const videoFeedAvailable = computed(() => isNookVideoFeedAvailable(availableBasicTimelines()));
const headerActions = computed(() => []);

function submitVideoSearch(): void {
	const query = videoSearchInput.value.trim();
	if (query === '') return;
	videoSearchQuery.value = query;
}

function clearVideoSearch(): void {
	videoSearchInput.value = '';
	videoSearchQuery.value = '';
}

definePage(() => ({
	title: i18n.ts.nookVideo,
	icon: 'ti ti-video',
}));
</script>

<style lang="scss" module>
.page {
	--nook-blue: #175cd3;
	--nook-blue-soft: #eef5ff;
	--nook-ink: #17324d;
	--nook-border: #d7e3f1;
	width: min(1120px, 100%);
	margin: 0 auto;
	padding: 18px 20px 48px;
	box-sizing: border-box;
}

.hero {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 22px 24px;
	margin-bottom: 16px;
	background: var(--nook-white, #fff);
	border: 1px solid var(--nook-border);
	border-radius: 14px;
}

.heroIcon {
	display: grid;
	width: 48px;
	height: 48px;
	flex: 0 0 auto;
	place-items: center;
	border-radius: 12px;
	background: var(--nook-blue-soft);
	color: var(--nook-blue);
	font-size: 24px;
}

.title {
	margin: 0;
	color: var(--nook-ink);
	font-size: 24px;
	font-weight: 850;
	letter-spacing: -0.03em;
}

.description {
	margin: 5px 0 0;
	color: var(--nook-muted, #667a91);
	font-size: 13px;
}

.search {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr) auto auto;
	align-items: center;
	gap: 9px;
	min-height: 48px;
	margin-bottom: 14px;
	padding: 5px 6px 5px 14px;
	box-sizing: border-box;
	background: var(--nook-white, #fff);
	border: 1px solid var(--nook-border);
	border-radius: 11px;
}

.search > i {
	color: var(--nook-muted, #667a91);
	font-size: 18px;
}

.search input {
	min-width: 0;
	width: 100%;
	border: 0;
	outline: 0;
	background: transparent;
	color: var(--nook-blue-deep, var(--nook-ink));
	font: inherit;
}

.search input::placeholder {
	color: var(--nook-muted, #667a91);
}

.search:focus-within {
	border-color: var(--nook-blue);
}

.clearSearch {
	display: grid;
	width: 34px;
	height: 34px;
	place-items: center;
	border-radius: 7px;
	color: var(--nook-muted, #667a91);
}

.clearSearch:hover {
	background: var(--nook-blue-soft);
	color: var(--nook-blue);
}

.searchButton {
	min-width: 72px;
	height: 36px;
	padding: 0 15px;
	border-radius: 7px;
	background: var(--nook-yellow, #f6c94c);
	color: var(--nook-on-yellow, #1d2939);
	font-weight: 800;
}

.searchButton:disabled {
	opacity: 0.45;
}

.modePicker {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 10px;
	margin-bottom: 18px;
}

.mode {
	display: flex;
	align-items: center;
	gap: 13px;
	min-height: 74px;
	padding: 13px 16px;
	box-sizing: border-box;
	border: 1px solid var(--nook-border);
	border-radius: 12px;
	background: var(--nook-white, #fff);
	color: var(--nook-ink);
	text-align: left;
	transition: border-color 0.12s ease, background-color 0.12s ease, color 0.12s ease;
}

.mode:hover {
	background: var(--nook-panel-highlight, #f8fbff);
}

.active {
	border-color: var(--nook-blue);
	background: var(--nook-blue-soft);
	color: var(--nook-blue);
}

.modeIcon {
	display: grid;
	width: 38px;
	height: 38px;
	flex: 0 0 auto;
	place-items: center;
	border-radius: 10px;
	background: rgba(23, 92, 211, 0.08);
	font-size: 20px;
}

.modeText {
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.modeText strong {
	font-size: 15px;
	font-weight: 800;
}

.modeText small {
	color: var(--nook-muted, #667a91);
	font-size: 12px;
	font-weight: 500;
}

.unavailable {
	min-height: 260px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10px;
	color: var(--nook-muted, #667a91);
	font-size: 14px;
}

.unavailable i {
	font-size: 36px;
	color: var(--nook-blue);
}

@media (max-width: 700px) {
	.page {
		padding: 12px 10px 36px;
	}

	.hero {
		padding: 16px;
	}

	.search {
		grid-template-columns: auto minmax(0, 1fr) auto;
	}

	.clearSearch {
		grid-column: 3;
	}

	.searchButton {
		grid-column: 1 / -1;
		width: 100%;
	}

	.modePicker {
		grid-template-columns: 1fr;
	}
}
</style>
