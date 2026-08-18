<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template></template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import { miLocalStorage } from '@/local-storage.js';

const emit = defineEmits<{
	(ev: 'closed'): void;
}>();

onMounted(() => {
	// Nook does not reuse the upstream Misskey donation prompt.
	miLocalStorage.setItem('neverShowDonationInfo', 'true');
	emit('closed');
});
</script>
