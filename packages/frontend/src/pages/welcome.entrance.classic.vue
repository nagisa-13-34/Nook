<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="meta" :class="$style.root">
	<section :class="$style.hero">
		<div :class="$style.heroInner">
			<div :class="$style.brand">Nook</div>
			<div :class="$style.yellowBar"></div>
			<h1 :class="$style.headline">話したいことを、もっと自然に。</h1>
			<p :class="$style.lead">人とつながるための、シンプルなソーシャルスペース。</p>
		</div>
	</section>

	<main :class="$style.main">
		<div :class="$style.dashboard">
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
	display: grid;
	grid-template-columns: minmax(360px, 0.9fr) minmax(520px, 1.1fr);
	background: var(--nook-blue-soft);
	color: var(--nook-blue-deep);
	overflow: auto;
	overscroll-behavior: contain;
}

.hero {
	position: relative;
	min-height: 100cqh;
	display: flex;
	align-items: center;
	background: var(--nook-blue);
	color: var(--nook-white);
}

.heroInner {
	width: min(520px, calc(100% - 80px));
	margin: 0 auto;
	padding: 64px 0;
}

.brand {
	font-size: 38px;
	font-weight: 850;
	line-height: 1;
	letter-spacing: -0.055em;
}

.yellowBar {
	width: 50px;
	height: 6px;
	margin: 22px 0 46px;
	border-radius: 2px;
	background: var(--nook-yellow);
}

.headline {
	max-width: 480px;
	margin: 0;
	font-size: clamp(34px, 4vw, 56px);
	line-height: 1.18;
	letter-spacing: -0.045em;
}

.lead {
	max-width: 430px;
	margin: 24px 0 0;
	font-size: 17px;
	line-height: 1.85;
	opacity: 0.86;
}

.main {
	min-height: 100cqh;
	display: grid;
	place-items: center;
	padding: 64px 40px;
	box-sizing: border-box;
	background: var(--nook-blue-soft);
}

.dashboard {
	width: min(460px, 100%);
}

:global(.nook-ui-entrance ._panel) {
	box-shadow: none;
}

@media (max-width: 900px) {
	.root {
		grid-template-columns: 1fr;
	}

	.hero {
		min-height: auto;
	}

	.heroInner {
		width: min(100% - 44px, 620px);
		padding: calc(32px + env(safe-area-inset-top, 0px)) 0 36px;
	}

	.yellowBar {
		margin: 16px 0 24px;
	}

	.headline {
		font-size: clamp(30px, 9vw, 42px);
	}

	.main {
		min-height: auto;
		padding: 34px 20px calc(44px + env(safe-area-inset-bottom, 0px));
	}
}
</style>