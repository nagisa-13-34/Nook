<!--
SPDX-FileCopyrightText: syuilo and other misskey contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-panel :class="$style.root">
	<span :class="$style.mark" aria-hidden="true"><i class="ti ti-sparkles"></i></span>
	<div :class="$style.text">
		<slot></slot>
	</div>
</div>
</template>

<script setup lang="ts">
// Keep the existing props for compatibility with pages that still pass them.
defineProps<{
	icon: string;
	color: string;
}>();
</script>

<style module lang="scss">
.root {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 16px 18px;
	text-align: left;
	border: 1px solid var(--MI_THEME-divider);
	border-left: 3px solid var(--MI_THEME-accent);
	border-radius: 8px;
	background: var(--MI_THEME-panel);
	box-shadow: none;
}

.mark {
	display: grid;
	width: 34px;
	height: 34px;
	flex: 0 0 auto;
	place-items: center;
	border-radius: 8px;
	background: var(--MI_THEME-accentedBg);
	color: var(--MI_THEME-accent);
	font-size: 17px;
}

.text {
	min-width: 0;
	color: var(--MI_THEME-fg);
	font-size: 0.9em;
	line-height: 1.55;
}
</style>
