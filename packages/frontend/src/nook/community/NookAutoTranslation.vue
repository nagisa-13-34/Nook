<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<div v-if="enabled && (loading || translated)" :class="$style.root">
	<span v-if="loading">🌐 …</span>
	<div v-else-if="translated"><small>🌐 {{ translated.sourceLang }}</small><div>{{ translated.text }}</div></div>
</div>
</template>
<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { nookApi } from './nook-api.js';
import { nookAutoTranslateEnabled, nookAutoTranslateTargetLang } from './translation-preferences.js';
const props = defineProps<{ kind: 'note' | 'communityMessage' | 'communityAnnouncement' | 'communityEvent'; objectId: string; text: string | null }>();
const loading = ref(false);
const translated = ref<{ sourceLang: string; text: string } | null>(null);
const enabled = computed(() => nookAutoTranslateEnabled.value && !!props.text);

let requestId = 0;
async function refresh() {
	const id = ++requestId;
	translated.value = null;
	if (!enabled.value || !props.text) return;
	loading.value = true;
	try {
		const result = await nookApi<{ sourceLang: string; text: string }>('nook/translate', { kind: props.kind, id: props.objectId, targetLang: nookAutoTranslateTargetLang.value });
		if (id !== requestId) return;
		const target = nookAutoTranslateTargetLang.value.split('-')[0].toUpperCase();
		translated.value = result.sourceLang.toUpperCase() === target ? null : result;
	} catch {
		if (id === requestId) translated.value = null;
	} finally {
		if (id === requestId) loading.value = false;
	}
}

watch([enabled, nookAutoTranslateTargetLang, () => props.objectId, () => props.text], refresh, { immediate: true });
</script>
<style module>.root{margin-top:8px;padding:8px 10px;border-left:3px solid var(--MI_THEME-accent);background:color(from var(--MI_THEME-accent) srgb r g b / .08);border-radius:6px;white-space:pre-wrap}</style>
