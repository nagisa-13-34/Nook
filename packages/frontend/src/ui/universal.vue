<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="nook-ui" :class="[$style.root, { '_forceShrinkSpacer': deviceKind === 'smartphone' }]">
	<XTitlebar v-if="prefer.r.showTitlebar.value && !isMobile" style="flex-shrink: 0;"/>
	<XNookMobileHeader v-if="isMobile" v-model:drawerMenuShowing="drawerMenuShowing"/>

	<div :class="$style.nonTitlebarArea">
		<XSidebar v-if="!isMobile" :class="$style.sidebar" :showWidgetButton="false"/>

		<div :class="[$style.contents, isRoot ? $style.homeContents : null, !isMobile && prefer.r.showTitlebar.value ? $style.withSidebarAndTitlebar : null]" @contextmenu.stop="onContextmenu">
			<div>
				<XReloadSuggestion v-if="shouldSuggestReload"/>
				<XPreferenceRestore v-if="shouldSuggestRestoreBackup"/>
				<XThemePreviewing v-if="isThemePreviewMode"/>
				<XAnnouncements v-if="$i"/>
				<XStatusBars :class="$style.statusbars"/>
			</div>
			<StackingRouterView v-if="prefer.s['experimental.stackingRouterView']" :class="$style.content"/>
			<RouterView v-else :class="$style.content"/>
			<XMobileFooterMenu v-if="isMobile" ref="navFooter" v-model:drawerMenuShowing="drawerMenuShowing"/>
		</div>
	</div>

	<XCommon v-model:drawerMenuShowing="drawerMenuShowing"/>
</div>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, provide, computed, ref } from 'vue';
import { instanceName } from '@@/js/config.js';
import { isLink } from '@@/js/is-link.js';
import XCommon from './_common_/common.vue';
import type { PageMetadata } from '@/page.js';
import XMobileFooterMenu from '@/ui/_common_/mobile-footer-menu.vue';
import XNookDesktopSidebar from '@/ui/_common_/nook-desktop-sidebar.vue';
import XNookMobileHeader from '@/ui/_common_/nook-mobile-header.vue';
import XPreferenceRestore from '@/ui/_common_/PreferenceRestore.vue';
import XReloadSuggestion from '@/ui/_common_/ReloadSuggestion.vue';
import XThemePreviewing from '@/ui/_common_/ThemePreviewing.vue';
import XTitlebar from '@/ui/_common_/titlebar.vue';
import { isPreviewMode as isThemePreviewMode } from '@/theme.js';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { $i } from '@/i.js';
import { provideMetadataReceiver, provideReactiveMetadata } from '@/page.js';
import { deviceKind } from '@/utility/device-kind.js';
import { miLocalStorage } from '@/local-storage.js';
import { mainRouter } from '@/router.js';
import { prefer } from '@/preferences.js';
import { shouldSuggestRestoreBackup } from '@/preferences/utility.js';
import { DI } from '@/di.js';
import { shouldSuggestReload } from '@/utility/reload-suggest.js';

const XSidebar = XNookDesktopSidebar;
const XStatusBars = defineAsyncComponent(() => import('@/ui/_common_/statusbars.vue'));
const XAnnouncements = defineAsyncComponent(() => import('@/ui/_common_/announcements.vue'));

const isRoot = computed(() => mainRouter.currentRoute.value.name === 'index');

const MOBILE_THRESHOLD = 500;

// デスクトップでウィンドウを狭くしたときモバイルUIが表示されて欲しいことはあるので deviceKind === 'desktop' の判定は行わない
const isMobile = ref(deviceKind === 'smartphone' || window.innerWidth <= MOBILE_THRESHOLD);

function updateResponsiveLayout() {
	isMobile.value = deviceKind === 'smartphone' || window.innerWidth <= MOBILE_THRESHOLD;
}

window.addEventListener('resize', updateResponsiveLayout);

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

const drawerMenuShowing = ref(false);

mainRouter.on('change', () => {
	drawerMenuShowing.value = false;
});

if (window.innerWidth > 1024) {
	const tempUI = miLocalStorage.getItem('ui_temp');
	if (tempUI) {
		miLocalStorage.setItem('ui', tempUI);
		miLocalStorage.removeItem('ui_temp');
		window.location.reload();
	}
}

function onContextmenu(ev: PointerEvent) {
	if (isLink(ev.target as HTMLElement)) return;
	if (['INPUT', 'TEXTAREA', 'IMG', 'VIDEO', 'CANVAS'].includes((ev.target as HTMLElement).tagName) || (ev.target as HTMLElement).attributes.getNamedItem('contenteditable') != null) return;
	if (window.getSelection()?.toString() !== '') return;
	const path = mainRouter.getCurrentFullPath();
	os.contextMenu([{
		type: 'label',
		text: path,
	}, {
		icon: 'ti ti-window-maximize',
		text: i18n.ts.openInWindow,
		action: () => {
			os.pageWindow(path);
		},
	}], ev);
}
</script>

<style lang="scss" module>
.root {
	--nook-blue: #3657d6;
	--nook-blue-deep: #1d2939;
	--nook-blue-soft: #eef1ff;
	--nook-bg: #f7f8fa;
	--nook-yellow: #f6c94c;
	--nook-yellow-soft: #fff5d6;
	--nook-white: #ffffff;
	--nook-border: #e2e7ee;
	--nook-muted: #667085;

	/* Nook owns the visual system while keeping Misskey's internals intact. */
	--MI_THEME-accent: var(--nook-blue);
	--MI_THEME-bg: var(--nook-bg);
	--MI_THEME-panel: var(--nook-white);
	--MI_THEME-popup: var(--nook-white);
	--MI_THEME-navBg: var(--nook-white);
	--MI_THEME-navFg: var(--nook-blue-deep);
	--MI_THEME-fg: var(--nook-blue-deep);
	--MI_THEME-fgHighlighted: var(--nook-blue);
	--MI_THEME-divider: var(--nook-border);
	--MI_THEME-indicator: var(--nook-yellow);
	--MI_THEME-buttonGradateA: var(--nook-yellow);
	--MI_THEME-buttonGradateB: var(--nook-yellow);
	--MI_THEME-fgOnAccent: #ffffff;
	--MI_THEME-accentedBg: var(--nook-blue-soft);
	--MI_THEME-panelHighlight: #f9fafb;
	--MI_THEME-focus: var(--nook-blue);
	--MI_THEME-link: var(--nook-blue);
	--MI_THEME-switchOnBg: var(--nook-blue);
	--MI_THEME-switchOnFg: #ffffff;
	--MI_THEME-switchOffBg: #d8dee8;
	--MI_THEME-switchOffFg: #ffffff;
	--MI_THEME-inputBorder: var(--nook-border);
	--MI_THEME-inputBorderHover: #aab4c4;
	--MI-radius: 8px;

	height: 100dvh;
	overflow: clip;
	contain: strict;
	display: flex;
	flex-direction: column;
	background: var(--nook-bg);
	color: var(--nook-blue-deep);
}

.nonTitlebarArea {
	display: flex;
	flex: 1;
	min-height: 0;
}

.sidebar {
	border-right: solid 1px var(--nook-border);
}

.contents {
	display: flex;
	flex-direction: column;
	flex: 1;
	height: 100%;
	min-width: 0;
	background: var(--nook-bg);

	&.withSidebarAndTitlebar {
		background: var(--nook-bg);
		border-radius: 0;
		overflow: clip;
	}
}

.content {
	flex: 1;
	min-height: 0;
}

.homeContents > .content {
	width: min(100%, 720px);
	margin-inline: auto;
	box-sizing: border-box;
	background: var(--nook-white);
	border-inline: solid 1px var(--nook-border);
}

.statusbars {
	position: sticky;
	top: 0;
	left: 0;
}

/* Shared surfaces: flat, quiet and product-like rather than card-heavy. */
:global(.nook-ui ._panel) {
	background: var(--nook-white);
	border: solid 1px var(--nook-border);
	border-radius: 8px;
	box-shadow: none;
}

:global(.nook-ui article) {
	background: var(--nook-white);
	border-bottom: solid 1px var(--nook-border);
	box-shadow: none;
}

/* Composer: white writing surface with a solid yellow action. */
:global(.nook-ui div:has(> header [data-testid="post-form-submit"])) {
	background: var(--nook-white);
	border: solid 1px var(--nook-border);
	border-radius: 8px;
	box-shadow: none;
	overflow: clip;
}

:global(.nook-ui div:has(> header [data-testid="post-form-submit"]) > header) {
	background: var(--nook-white);
	border-bottom: solid 1px var(--nook-border);
}

:global(.nook-ui [data-testid="post-form-text"]) {
	color: var(--nook-blue-deep);
	font-size: 16px;
	line-height: 1.6;
}

:global(.nook-ui [data-testid="post-form-text"]::placeholder) {
	color: var(--nook-muted);
	opacity: 0.8;
}

:global(.nook-ui [data-testid="post-form-submit"] > div) {
	background: var(--nook-yellow) !important;
	color: var(--nook-blue-deep) !important;
	border-radius: 6px;
	box-shadow: none !important;
}

:global(.nook-ui [data-testid="post-form-submit"]:not(:disabled):hover > div) {
	background: #f8d469 !important;
}

/* Tabs use a simple blue underline instead of pill-like selected states. */
:global(.nook-ui [role="tablist"]) {
	background: var(--nook-white);
	border-bottom: solid 1px var(--nook-border);
}

:global(.nook-ui [role="tab"]) {
	border-radius: 0 !important;
	box-shadow: none !important;
}

:global(.nook-ui [role="tab"][aria-selected="true"]) {
	background: transparent !important;
	color: var(--nook-blue) !important;
	box-shadow: inset 0 -2px var(--nook-blue) !important;
}

/* Keep controls crisp: no decorative gradient or floating-card shadow. */
:global(.nook-ui ._buttonGradate) {
	background: var(--nook-yellow) !important;
	color: var(--nook-blue-deep) !important;
	box-shadow: none !important;
}

:global(.nook-ui a) {
	text-underline-offset: 2px;
}

@media (max-width: 500px) {
	.homeContents > .content {
		width: 100%;
		border-inline: 0;
	}

	:global(.nook-ui ._panel) {
		border-radius: 0;
		border-inline: 0;
	}

	:global(.nook-ui div:has(> header [data-testid="post-form-submit"])) {
		border-radius: 0;
		border-inline: 0;
	}
}
</style>
