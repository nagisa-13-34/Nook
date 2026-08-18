<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions" :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 600px; --MI_SPACER-min: 20px;">
		<div class="_gaps_m">
			<div class="_panel" :class="$style.hero">
				<div :class="$style.name">Nook</div>
				<div :class="$style.version">v{{ version }}</div>
				<p :class="$style.description">つながる、見つかる、あなたのためのソーシャルプラットフォーム。</p>
			</div>

			<div class="_panel" :class="$style.section">
				<h2>Nookについて</h2>
				<p>Nookは、使いやすく安心できるソーシャル体験を目指して開発されています。</p>
				<a class="_link" href="https://github.com/Nagisa-13-34/Nook" target="_blank" rel="noopener noreferrer">ソースコードを見る</a>
			</div>
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
.hero {
	padding: 40px 24px;
	text-align: center;
}

.name {
	font-size: 2.4rem;
	font-weight: 800;
}

.version {
	margin-top: 4px;
	opacity: 0.65;
}

.description {
	margin: 20px auto 0;
	max-width: 440px;
	line-height: 1.8;
}

.section {
	padding: 24px;
	line-height: 1.8;
}

.section h2 {
	margin-top: 0;
}
</style>
