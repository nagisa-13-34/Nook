<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkNotesTimeline :noGap="true" :paginator="notesPaginator" :pullToRefresh="false" :class="$style.tl"/>
</template>

<script lang="ts" setup>
import { computed, markRaw } from 'vue';
import * as Misskey from 'misskey-js';
import MkNotesTimeline from '@/components/MkNotesTimeline.vue';
import { Paginator } from '@/utility/paginator.js';

const props = defineProps<{
	user: Misskey.entities.UserDetailed;
}>();

const notesPaginator = markRaw(new Paginator('users/notes', {
	limit: 10,
	computedParams: computed(() => ({
		userId: props.user.id,
		withRenotes: true,
		withReplies: true,
		withChannelNotes: true,
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
