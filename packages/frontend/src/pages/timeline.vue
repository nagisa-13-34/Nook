<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader v-model:tab="src" :actions="headerActions" :tabs="[]" :swipable="false" :displayMyAvatar="true" :canOmitTitle="true">
	<div class="_spacer" style="--MI_SPACER-w: 800px;">
		<nav v-if="$i" :class="$style.nookTabs" :aria-label="i18n.ts.timeline">
			<button
				v-for="tab in nookTimelineTabs"
				:key="tab.key"
				type="button"
				class="_button"
				:class="[$style.nookTab, { [$style.nookTabActive]: nookTimelineView === tab.key }]"
				:aria-current="nookTimelineView === tab.key ? 'page' : undefined"
				@click="selectNookTimeline(tab.key)"
			>
				<i :class="tab.icon"></i>
				<span>{{ tab.title }}</span>
			</button>
		</nav>
		<MkPostForm v-if="prefer.r.showFixedPostForm.value" :class="$style.postForm" class="_panel" fixed style="margin-bottom: var(--MI-margin);"/>
		<MkRecommendedNotesTimeline
			v-if="showRecommendedDiscover"
			ref="recommendedTlComponent"
			:class="$style.tl"
			:withSensitive="withSensitive"
			@unavailable="recommendedUnavailable = true"
		/>
		<MkStreamingNotesTimeline
			v-else
			ref="tlComponent"
			:key="src + withRenotes + withReplies + onlyFiles + withSensitive"
			:class="$style.tl"
			:src="(src.split(':')[0] as (BasicTimelineType | 'list'))"
			:list="src.split(':')[1]"
			:withRenotes="withRenotes"
			:withReplies="withReplies"
			:withSensitive="withSensitive"
			:onlyFiles="onlyFiles"
			:sound="true"
		/>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, watch, provide, useTemplateRef, ref, onMounted, onActivated } from 'vue';
import type { MenuItem } from '@/types/menu.js';
import type { BasicTimelineType } from '@/timelines.js';
import type { NookTimelineView } from '@/nook/timeline.js';
import type { PageHeaderItem } from '@/types/page-header.js';
import MkRecommendedNotesTimeline from '@/components/MkRecommendedNotesTimeline.vue';
import MkStreamingNotesTimeline from '@/components/MkStreamingNotesTimeline.vue';
import MkPostForm from '@/components/MkPostForm.vue';
import * as os from '@/os.js';
import { store } from '@/store.js';
import { i18n } from '@/i18n.js';
import { $i } from '@/i.js';
import { definePage } from '@/page.js';
import { deviceKind } from '@/utility/device-kind.js';
import { deepMerge } from '@/utility/merge.js';
import { availableBasicTimelines, hasWithReplies, isAvailableBasicTimeline, isBasicTimeline, basicTimelineIconClass } from '@/timelines.js';
import { prefer } from '@/preferences.js';
import { detectNookTimelineView, isNookDiscoverAvailable, resolveNookTimelineSource } from '@/nook/timeline.js';

const tlComponent = useTemplateRef('tlComponent');
const recommendedTlComponent = useTemplateRef('recommendedTlComponent');

type TimelinePageSrc = BasicTimelineType | `list:${string}`;

const srcWhenNotSignin = ref<'local' | 'global'>(isAvailableBasicTimeline('local') ? 'local' : 'global');
const src = computed<TimelinePageSrc>({
	get: () => ($i ? store.r.tl.value.src : srcWhenNotSignin.value),
	set: (x) => saveSrc(x),
});
const withRenotes = computed<boolean>({
	get: () => store.r.tl.value.filter.withRenotes,
	set: (x) => saveTlFilter('withRenotes', x),
});

const localSocialTLFilterSwitchStore = ref<'withReplies' | 'onlyFiles' | false>(
	store.r.tl.value.filter.withReplies ? 'withReplies' :
	store.r.tl.value.filter.onlyFiles ? 'onlyFiles' :
	false,
);

const withReplies = computed<boolean>({
	get: () => {
		if (!$i) return false;
		if (['local', 'social'].includes(src.value) && localSocialTLFilterSwitchStore.value === 'onlyFiles') return false;
		return store.r.tl.value.filter.withReplies;
	},
	set: (x) => saveTlFilter('withReplies', x),
});
const onlyFiles = computed<boolean>({
	get: () => {
		if (['local', 'social'].includes(src.value) && localSocialTLFilterSwitchStore.value === 'withReplies') return false;
		return store.r.tl.value.filter.onlyFiles;
	},
	set: (x) => saveTlFilter('onlyFiles', x),
});

const nookTimelineView = computed(() => detectNookTimelineView(src.value, onlyFiles.value));
const recommendedUnavailable = ref(false);
const showRecommendedDiscover = computed(() => $i != null && nookTimelineView.value === 'discover' && !recommendedUnavailable.value);
const nookTimelineTabs = computed(() => [{
	key: 'following' as const,
	title: i18n.ts.nookFollowing,
	icon: 'ti ti-users',
}, ...(isNookDiscoverAvailable(availableBasicTimelines()) ? [{
	key: 'discover' as const,
	title: i18n.ts.nookDiscover,
	icon: 'ti ti-compass',
}] : []), {
	key: 'media' as const,
	title: i18n.ts.nookMedia,
	icon: 'ti ti-photo',
}]);

function selectNookTimeline(view: NookTimelineView): void {
	const target = resolveNookTimelineSource(view, availableBasicTimelines());
	if (target == null) return;
	if (view === 'discover') recommendedUnavailable.value = false;
	onlyFiles.value = target.onlyFiles;
	src.value = target.src;
}

watch(nookTimelineView, (view) => {
	if (view !== 'discover') recommendedUnavailable.value = false;
});

watch([withReplies, onlyFiles], ([withRepliesTo, onlyFilesTo]) => {
	if (withRepliesTo) localSocialTLFilterSwitchStore.value = 'withReplies';
	else if (onlyFilesTo) localSocialTLFilterSwitchStore.value = 'onlyFiles';
	else localSocialTLFilterSwitchStore.value = false;
});

const withSensitive = computed<boolean>({
	get: () => store.r.tl.value.filter.withSensitive,
	set: (x) => saveTlFilter('withSensitive', x),
});

const showFixedPostForm = prefer.model('showFixedPostForm');

function saveSrc(newSrc: TimelinePageSrc): void {
	const out = deepMerge({ src: newSrc }, store.s.tl);
	store.set('tl', out);
	if (['local', 'global'].includes(newSrc)) srcWhenNotSignin.value = newSrc as 'local' | 'global';
}

function saveTlFilter(key: keyof typeof store.s.tl.filter, newValue: boolean) {
	if (key !== 'withReplies' || $i) {
		const out = deepMerge({ filter: { [key]: newValue }, }, store.s.tl);
		store.set('tl', out);
	}
}

function switchTlIfNeeded() {
	if (isBasicTimeline(src.value) && !isAvailableBasicTimeline(src.value)) src.value = availableBasicTimelines()[0];
}

onMounted(switchTlIfNeeded);
onActivated(switchTlIfNeeded);

const headerActions = computed<PageHeaderItem[]>(() => {
	const items: PageHeaderItem[] = [{
		icon: 'ti ti-dots',
		text: i18n.ts.options,
		handler: (ev) => {
			const menuItems: MenuItem[] = [];
			if (!showRecommendedDiscover.value) {
				menuItems.push({ type: 'switch', icon: 'ti ti-repeat', text: i18n.ts.showRenotes, ref: withRenotes });
				if (isBasicTimeline(src.value) && hasWithReplies(src.value)) {
					menuItems.push({ type: 'switch', icon: 'ti ti-messages', text: i18n.ts.showRepliesToOthersInTimeline, ref: withReplies, disabled: onlyFiles });
				}
			}
			menuItems.push({ type: 'switch', icon: 'ti ti-eye-exclamation', text: i18n.ts.withSensitive, ref: withSensitive });
			if (!showRecommendedDiscover.value) {
				menuItems.push({ type: 'switch', icon: 'ti ti-photo', text: i18n.ts.fileAttachedOnly, ref: onlyFiles, disabled: isBasicTimeline(src.value) && hasWithReplies(src.value) ? withReplies : false });
			}
			menuItems.push({ type: 'divider' }, { type: 'switch', text: i18n.ts.showFixedPostForm, ref: showFixedPostForm });
			os.popupMenu(menuItems, ev.currentTarget ?? ev.target);
		},
	}];

	if (deviceKind === 'desktop') {
		items.unshift({
			icon: 'ti ti-refresh',
			text: i18n.ts.reload,
			handler: () => {
				if (showRecommendedDiscover.value) void recommendedTlComponent.value?.reload();
				else tlComponent.value?.reloadTimeline();
			},
		});
	}
	return items;
});

definePage(() => ({
	title: i18n.ts.timeline,
	icon: isBasicTimeline(src.value) ? basicTimelineIconClass(src.value) : 'ti ti-home',
}));
</script>

<style lang="scss" module>
.postForm {
	border-radius: var(--MI-radius);
}

.nookTabs {
	display: grid;
	grid-auto-flow: column;
	grid-auto-columns: minmax(0, 1fr);
	margin-bottom: var(--MI-margin);
	padding: 4px;
	background: #fff;
	border: 1px solid #d7e3f1;
	border-radius: 9px;
}

.nookTab {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 7px;
	min-height: 42px;
	padding: 6px 10px;
	border-radius: 7px;
	color: #667a91;
	font-weight: 700;

	&:hover {
		background: #f7faff;
		color: #17324d;
	}

	&:focus-visible {
		outline: 2px solid #175cd3;
		outline-offset: -2px;
	}
}

.nookTabActive {
	background: #eef5ff;
	color: #175cd3;
}

.tl {
	background: var(--MI_THEME-bg);
	border-radius: var(--MI-radius);
	overflow: clip;
}
</style>
