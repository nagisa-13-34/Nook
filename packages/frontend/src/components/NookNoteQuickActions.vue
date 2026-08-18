<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<button
	v-if="$i"
	v-tooltip="i18n.ts.nookBookmarks"
	:class="buttonClass"
	class="_button"
	:aria-label="i18n.ts.nookBookmarks"
	@click="toggleBookmark"
>
	<i :class="bookmarked === true ? 'ti ti-bookmark-filled' : 'ti ti-bookmark'"></i>
</button>
<button
	v-tooltip="i18n.ts.share"
	:class="buttonClass"
	class="_button"
	:aria-label="i18n.ts.share"
	@click="sharePost"
>
	<i class="ti ti-share-3"></i>
</button>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import * as Misskey from 'misskey-js';
import { url } from '@@/js/config.js';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { copyToClipboard } from '@/utility/copy-to-clipboard.js';

const props = defineProps<{
	note: Misskey.entities.Note;
	buttonClass: string;
}>();

const bookmarked = ref<boolean | null>(null);

async function toggleBookmark(): Promise<void> {
	if (bookmarked.value == null) {
		const state = await misskeyApi('notes/state', { noteId: props.note.id });
		bookmarked.value = state.isFavorited;
	}

	const next = !bookmarked.value;
	await misskeyApi(next ? 'notes/favorites/create' : 'notes/favorites/delete', { noteId: props.note.id });
	bookmarked.value = next;
}

async function sharePost(): Promise<void> {
	const shareUrl = `${url}/notes/${props.note.id}`;
	if ('share' in navigator) {
		try {
			await navigator.share({
				title: props.note.user.name ?? props.note.user.username,
				text: props.note.text ?? '',
				url: shareUrl,
			});
			return;
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') return;
		}
	}
	copyToClipboard(shareUrl);
}
</script>
