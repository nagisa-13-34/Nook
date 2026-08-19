<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="[$style.root]">
	<div :inert="disabled" :class="[{ [$style.disabled]: disabled }]">
		<slot></slot>
	</div>
	<div v-if="disabled" :class="[$style.cover]"></div>
</div>
</template>

<script lang="ts" setup>
defineProps<{
	disabled?: boolean;
}>();
</script>

<style lang="scss" module>
.root {
	position: relative;
}

.disabled {
	opacity: 0.42;
	filter: grayscale(0.15);
}

.cover {
	position: absolute;
	inset: 0;
	cursor: not-allowed;
	background: transparent;
}
</style>
