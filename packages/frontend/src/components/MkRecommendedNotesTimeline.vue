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

	<div v-else :class="$style.notes">
		<MkNote
			v-for="note in notes"
			:key="note.id"
			:class="$style.note"
			:note="note"
			:withHardMute="true"
			:data-scroll-anchor="note.id"
		/>
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
import { isNookRecommendationUnavailableError } from '@/nook/timeline.js';
import { prefer } from '@/preferences.js';
import { misskeyApi } from '@/utility/misskey-api.js';

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
const error = ref(false);

async function reload(): Promise<void> {
	loading.value = true;
	error.value = false;

	try {
		notes.value = await misskeyApi('notes/recommended', { limit: 40 });
	} catch (err) {
		if (isNookRecommendationUnavailableError(err)) {
			emit('unavailable');
			return;
		}
		error.value = true;
	} finally {
		loading.value = false;
	}
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
</style>
