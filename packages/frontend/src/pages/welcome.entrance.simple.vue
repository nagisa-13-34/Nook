<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="meta" :class="$style.root">
	<header :class="$style.header">
		<div :class="$style.brand">Nook</div>
		<div :class="$style.yellowBar"></div>
	</header>
	<main :class="$style.main">
		<div :class="$style.contents">
			<MkVisitorDashboard/>
		</div>
	</main>
</div>
</template>

<script lang="ts" setup>
import MkVisitorDashboard from '@/components/MkVisitorDashboard.vue';
import { instance as meta } from '@/instance.js';
</script>

<style lang="scss" module>
.root {
	--nook-blue: #175cd3;
	--nook-blue-deep: #17324d;
	--nook-blue-soft: #eef5ff;
	--nook-yellow: #ffd84d;
	--nook-white: #ffffff;
	--nook-border: #d7e3f1;

	--MI_THEME-accent: var(--nook-blue);
	--MI_THEME-bg: var(--nook-blue-soft);
	--MI_THEME-panel: var(--nook-white);
	--MI_THEME-popup: var(--nook-white);
	--MI_THEME-fg: var(--nook-blue-deep);
	--MI_THEME-divider: var(--nook-border);
	--MI_THEME-buttonGradateA: var(--nook-yellow);
	--MI_THEME-buttonGradateB: var(--nook-yellow);
	--MI_THEME-fgOnAccent: var(--nook-blue-deep);
	--MI-radius: 8px;

	min-height: 100cqh;
	background: var(--nook-blue-soft);
	color: var(--nook-blue-deep);
	overflow: auto;
	overscroll-behavior: contain;
}

.header {
	padding: calc(26px + env(safe-area-inset-top, 0px)) 30px 24px;
	background: var(--nook-blue);
	color: var(--nook-white);
}

.brand {
	font-size: 32px;
	font-weight: 850;
	line-height: 1;
	letter-spacing: -0.055em;
}

.yellowBar {
	width: 44px;
	height: 5px;
	margin-top: 15px;
	border-radius: 2px;
	background: var(--nook-yellow);
}

.main {
	padding: 48px 20px calc(52px + env(safe-area-inset-bottom, 0px));
}

.contents {
	width: min(460px, 100%);
	margin: auto;
}

@media (max-width: 500px) {
	.header {
		padding-inline: 22px;
	}

	.main {
		padding-top: 30px;
	}
}
</style>
