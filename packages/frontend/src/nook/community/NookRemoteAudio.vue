<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template><audio ref="audio" autoplay playsinline></audio></template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
const props = defineProps<{ stream: MediaStream }>();
const audio = ref<HTMLAudioElement | null>(null);

function apply() { if (audio.value) audio.value.srcObject = props.stream; }

onMounted(apply); watch(() => props.stream, apply);
</script>
