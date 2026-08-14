<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkStickyContainer>
	<template #header>
		<MkTab
			v-model="tab"
			:tabs="[
				{ key: 'posts', label: i18n.ts.nookPosts },
				{ key: 'media', label: i18n.ts.nookMedia },
				{ key: 'videos', label: i18n.ts.nookVideos },
				{ key: 'works', label: i18n.ts.nookWorks },
			]"
			:class="$style.tab"
		>
		</MkTab>
	</template>
	<XGallery v-if="tab === 'works'" :user="user"/>
	<MkNotesTimeline v-else :noGap="true" :paginator="notesPaginator" :pullToRefresh="false" :class="$style.tl"/>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { ref, computed, defineAsyncComponent, markRaw } from 'vue';
import * as Misskey from 'misskey-js';
import MkNotesTimeline from '@/components/MkNotesTimeline.vue';
import MkTab from '@/components/MkTab.vue';
import { i18n } from '@/i18n.js';
import { Paginator } from '@/utility/paginator.js';

const props = defineProps<{
	user: Misskey.entities.UserDetailed;
}>();

const XGallery = defineAsyncComponent(() => import('./gallery.vue'));
const tab = ref<'posts' | 'media' | 'videos' | 'works'>('posts');

const notesPaginator = markRaw(new Paginator('users/notes', {
	limit: 10,
	computedParams: computed(() => ({
		userId: props.user.id,
		withRenotes: tab.value === 'posts',
		withReplies: tab.value === 'posts',
		withChannelNotes: tab.value === 'posts',
		...(tab.value === 'media' ? { fileType: 'image' as const } : {}),
		...(tab.value === 'videos' ? { fileType: 'video' as const } : {}),
	})),
}));
</script>

<style lang="scss" module>
.tab {
	padding: calc(var(--MI-margin) / 2) 0;
	background: var(--MI_THEME-bg);
}

.tl {
	background: var(--MI_THEME-bg);
	border-radius: var(--MI-radius);
	overflow: clip;
}
</style>
