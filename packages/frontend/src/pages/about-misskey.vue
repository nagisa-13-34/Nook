<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions" :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 680px; --MI_SPACER-min: 20px;">
		<div class="_gaps_m" :class="$style.root">
			<section :class="$style.hero">
				<div :class="$style.name">Nook</div>
				<div :class="$style.yellowBar"></div>
				<p :class="$style.description">つながる、見つかる、あなたのためのソーシャルプラットフォーム。</p>
				<div :class="$style.version">v{{ version }}</div>
			</section>

			<section :class="$style.section">
				<h2>Nookについて</h2>
				<p>Nookは、使いやすく安心できるソーシャル体験を目指して開発されています。</p>
				<a :class="$style.source" href="https://github.com/Nagisa-13-34/Nook" target="_blank" rel="noopener noreferrer">
					<i class="ti ti-brand-github"></i>
					<span>ソースコードを見る</span>
				</a>
			</section>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { version } from '@@/js/config.js';
import { definePage } from '@/page.js';

const headerActions = computed(() => []);
const headerTabs = computed(() => []);

definePage(() => ({
	title: 'Nookについて',
	icon: 'ti ti-info-circle',
}));
</script>

<style lang="scss" module>
.root {
	--nook-blue: #175cd3;
	--nook-blue-deep: #17324d;
	--nook-yellow: #ffd84d;
	--nook-white: #ffffff;
	--nook-border: #d7e3f1;
	color: var(--nook-blue-deep);
}

.hero,
.section {
	box-sizing: border-box;
	background: var(--nook-white);
	border: solid 1px var(--nook-border);
	border-radius: 8px;
	box-shadow: none;
}

.hero {
	padding: 46px 36px 42px;
	text-align: left;
	border-top: solid 5px var(--nook-blue);
}

.name {
	font-size: 42px;
	font-weight: 850;
	line-height: 1;
	letter-spacing: -0.055em;
	color: var(--nook-blue);
}

.yellowBar {
	width: 46px;
	height: 5px;
	margin: 18px 0 24px;
	border-radius: 2px;
	background: var(--nook-yellow);
}

.version {
	margin-top: 22px;
	font-size: 12px;
	opacity: 0.58;
}

.description {
	margin: 0;
	max-width: 500px;
	font-size: 18px;
	font-weight: 650;
	line-height: 1.7;
}

.section {
	padding: 28px 30px;
	line-height: 1.8;
}

.section h2 {
	margin: 0 0 10px;
	font-size: 20px;
	letter-spacing: -0.02em;
}

.section p {
	margin: 0 0 18px;
}

.source {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	color: var(--nook-blue);
	font-weight: 700;
	text-decoration: none;
}

.source:hover {
	text-decoration: underline;
	text-underline-offset: 3px;
}

@media (max-width: 600px) {
	.hero {
		padding: 34px 24px 30px;
	}

	.name {
		font-size: 36px;
	}

	.section {
		padding: 22px;
	}
}
</style>