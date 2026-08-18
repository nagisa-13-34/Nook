<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<div v-if="!narrow && !isRoot" :class="$style.side">
		<div :class="$style.sideBrand">Nook</div>
		<div :class="$style.sideBanner" :style="{ backgroundImage: instance.backgroundImageUrl ? `url(${ instance.backgroundImageUrl })` : 'none' }"></div>
		<div :class="$style.sideDashboard">
			<MkVisitorDashboard/>
		</div>
	</div>

	<div :class="$style.main">
		<div v-if="narrow && !isRoot" :class="$style.header">
			<img :src="instance.iconUrl || '/favicon.ico'" alt="" :class="$style.headerIcon"/>
			<MkA to="/" :class="$style.headerTitle">{{ instanceName }}</MkA>
			<MkButton primary rounded :class="$style.headerButton" @click="goHome">{{ i18n.ts.signup }}</MkButton>
		</div>
		<div :class="$style.content">
			<RouterView/>
		</div>
	</div>
</div>
<XCommon/>
</template>

<script lang="ts" setup>
import { onMounted, provide, ref, computed } from 'vue';
import { instanceName } from '@@/js/config.js';
import XCommon from './_common_/common.vue';
import type { PageMetadata } from '@/page.js';
import { instance } from '@/instance.js';
import { provideMetadataReceiver, provideReactiveMetadata } from '@/page.js';
import { i18n } from '@/i18n.js';
import MkVisitorDashboard from '@/components/MkVisitorDashboard.vue';
import { mainRouter } from '@/router.js';
import { DI } from '@/di.js';
import MkButton from '@/components/MkButton.vue';

const isRoot = computed(() => mainRouter.currentRoute.value.name === 'index');

const DESKTOP_THRESHOLD = 1100;

const pageMetadata = ref<null | PageMetadata>(null);

provide(DI.router, mainRouter);
provideMetadataReceiver((metadataGetter) => {
	const info = metadataGetter();
	pageMetadata.value = info;
	if (pageMetadata.value) {
		if (isRoot.value && pageMetadata.value.title === instanceName) {
			window.document.title = pageMetadata.value.title;
		} else {
			window.document.title = `${pageMetadata.value.title} | ${instanceName}`;
		}
	}
});
provideReactiveMetadata(pageMetadata);

const isDesktop = ref(window.innerWidth >= DESKTOP_THRESHOLD);
const narrow = ref(window.innerWidth < 1280);

function goHome() {
	mainRouter.push('/');
}

onMounted(() => {
	if (!isDesktop.value) {
		window.addEventListener('resize', () => {
			if (window.innerWidth >= DESKTOP_THRESHOLD) isDesktop.value = true;
		}, { passive: true });
	}
});
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
	--MI_THEME-fg: var(--nook-blue-deep);
	--MI_THEME-divider: var(--nook-border);
	--MI_THEME-buttonGradateA: var(--nook-yellow);
	--MI_THEME-buttonGradateB: var(--nook-yellow);
	--MI_THEME-fgOnAccent: var(--nook-blue-deep);
	--MI-radius: 8px;

	display: flex;
	height: 100dvh;
	overflow: clip;
	background: var(--nook-blue-soft);
	color: var(--nook-blue-deep);
}

.main {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
	background: var(--nook-blue-soft);
}

.header {
	min-height: 58px;
	padding: 8px 16px;
	display: flex;
	align-items: center;
	box-sizing: border-box;
	background: var(--nook-white);
	border-bottom: solid 1px var(--nook-border);
}

.headerIcon {
	width: 38px;
	height: 38px;
	object-fit: cover;
	vertical-align: bottom;
	border-radius: 8px;
}

.headerTitle {
	margin: 0 14px;
	font-size: 18px;
	font-weight: 800;
	letter-spacing: -0.025em;
	color: var(--nook-blue-deep);
}

.headerButton {
	margin-left: auto;
}

.side {
	position: relative;
	width: 460px;
	overflow-y: auto;
	background: var(--nook-blue);
	color: var(--nook-white);
	border-right: solid 1px var(--nook-border);
}

.sideBrand {
	position: relative;
	z-index: 2;
	padding: 28px 32px 8px;
	font-size: 30px;
	font-weight: 850;
	letter-spacing: -0.055em;
	color: var(--nook-white);
}

.sideBrand::after {
	content: '';
	display: block;
	width: 42px;
	height: 5px;
	margin-top: 12px;
	background: var(--nook-yellow);
	border-radius: 2px;
}

.sideBanner {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	aspect-ratio: 1.5;
	background-position: center;
	background-size: cover;
	opacity: 0.16;
	-webkit-mask-image: linear-gradient(rgba(0, 0, 0, 0.55), transparent);
	mask-image: linear-gradient(rgba(0, 0, 0, 0.55), transparent);
}

.sideDashboard {
	position: relative;
	z-index: 1;
	padding: 28px 32px 32px;
}

.content {
	display: flex;
	flex-direction: column;
	height: 100dvh;
	background: var(--nook-blue-soft);
}

:global(.nook-ui-visitor ._panel) {
	box-shadow: none;
}
</style>
