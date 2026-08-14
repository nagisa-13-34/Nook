<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_spacer" style="--MI_SPACER-w: 800px;">
	<MkNotesTimeline :noGap="true" :paginator="notesPaginator" :class="$style.tl"/>
</div>
</template>

<script lang="ts" setup>
import { computed, markRaw } from 'vue';
import * as Misskey from 'misskey-js';
import MkNotesTimeline from '@/components/MkNotesTimeline.vue';
import { Paginator } from '@/utility/paginator.js';

const props = defineProps<{
	user: Misskey.entities.UserDetailed;
	filter: 'posts' | 'media' | 'videos';
}>();

const notesPaginator = markRaw(new Paginator('users/notes', {
	limit: 10,
	computedParams: computed(() => ({
		userId: props.user.id,
		withRenotes: props.filter === 'posts',
		withReplies: props.filter === 'posts',
		withChannelNotes: props.filter === 'posts',
		...(props.filter === 'media' ? { fileType: 'image' as const } : {}),
		...(props.filter === 'videos' ? { fileType: 'video' as const } : {}),
	})),
}));
</script>

<style lang="scss" module>
.tl {
	background: var(--MI_THEME-bg);
	border-radius: var(--MI-radius);
	overflow: clip;
}
</style>
