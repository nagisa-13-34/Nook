<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="[$style.root, { '_forceShrinkSpacer': deviceKind === 'smartphone' }]">
	<XTitlebar v-if="prefer.r.showTitlebar.value && !isMobile" style="flex-shrink: 0;"/>
	<XNookMobileHeader v-if="isMobile" v-model:drawerMenuShowing="drawerMenuShowing" v-model:widgetsShowing="widgetsShowing"/>

	<div :class="$style.nonTitlebarArea">
		<XSidebar v-if="!isMobile" :class="$style.sidebar" :showWidgetButton="!showWidgetsSide" @widgetButtonClick="widgetsShowing = true"/>

		<div :class="[$style.contents, !isMobile && prefer.r.showTitlebar.value ? $style.withSidebarAndTitlebar : null]" @contextmenu.stop="onContextmenu">
			<div>
				<XReloadSuggestion v-if="shouldSuggestReload"/>
				<XPreferenceRestore v-if="shouldSuggestRestoreBackup"/>
				<XThemePreviewing v-if="isThemePreviewMode"/>
				<XAnnouncements v-if="$i"/>
				<XStatusBars :class="$style.statusbars"/>
			</div>
			<StackingRouterView v-if="prefer.s['experimental.stackingRouterView']" :class="$style.content"/>
			<RouterView v-else :class="$style.content"/>
			<XMobileFooterMenu v-if="isMobile" ref="navFooter" v-model:drawerMenuShowing="drawerMenuShowing" v-model:widgetsShowing="widgetsShowing"/>
		</div>

		<div v-if="showWidgetsSide && !pageMetadata?.needWideArea" :class="$style.widgets">
			<XWidgets/>
		</div>
	</div>

	<XCommon v-model:drawerMenuShowing="drawerMenuShowing" v-model:widgetsShowing="widgetsShowing"/>
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
const XWidgets = defineAsyncComponent(() => import('./_common_/widgets.vue'));
const XStatusBars = defineAsyncComponent(() => import('@/ui/_common_/statusbars.vue'));
const XAnnouncements = defineAsyncComponent(() => import('@/ui/_common_/announcements.vue'));

const isRoot = computed(() => mainRouter.currentRoute.value.name === 'index');

const DESKTOP_THRESHOLD = 1100;
const MOBILE_THRESHOLD = 500;

// デスクトップでウィンドウを狭くしたときモバイルUIが表示されて欲しいことはあるので deviceKind === 'desktop' の判定は行わない
const showWidgetsSide = ref(window.innerWidth >= DESKTOP_THRESHOLD);
const isMobile = ref(deviceKind === 'smartphone' || window.innerWidth <= MOBILE_THRESHOLD);

function updateResponsiveLayout() {
	showWidgetsSide.value = window.innerWidth >= DESKTOP_THRESHOLD;
	isMobile.value = deviceKind === 'smartphone' || window.innerWidth <= MOBILE_THRESHOLD;
}

window.addEventListener('resize', updateResponsiveLayout);

const pageMetadata = ref<null | PageMetadata>(null);
const widgetsShowing = ref(false);

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
$widgets-hide-threshold: 1090px;

.root {
	--nook-blue: #175cd3;
	--nook-blue-deep: #17324d;
	--nook-blue-soft: #eef5ff;
	--nook-yellow: #ffd84d;
	--nook-yellow-soft: #fff7cc;
	--nook-white: #ffffff;
	--nook-border: #d7e3f1;
	--nook-muted: #667a91;

	/* Nook UI uses a fixed product palette instead of inheriting Misskey's visual identity. */
	--MI_THEME-accent: var(--nook-blue);
	--MI_THEME-bg: var(--nook-blue-soft);
	--MI_THEME-panel: var(--nook-white);
	--MI_THEME-navBg: var(--nook-white);
	--MI_THEME-navFg: var(--nook-blue-deep);
	--MI_THEME-fg: var(--nook-blue-deep);
	--MI_THEME-divider: var(--nook-border);
	--MI_THEME-indicator: var(--nook-yellow);
	--MI_THEME-buttonGradateA: var(--nook-yellow);
	--MI_THEME-buttonGradateB: var(--nook-yellow);
	--MI_THEME-fgOnAccent: var(--nook-blue-deep);
	--MI_THEME-accentedBg: #e6f0ff;

	height: 100dvh;
	overflow: clip;
	contain: strict;
	display: flex;
	flex-direction: column;
	background: var(--nook-blue-soft);
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
	background: var(--nook-blue-soft);

	&.withSidebarAndTitlebar {
		background: var(--nook-blue-soft);
		border-radius: 0;
		overflow: clip;
	}
}

.content {
	flex: 1;
	min-height: 0;
}

.statusbars {
	position: sticky;
	top: 0;
	left: 0;
}

.widgets {
	width: 350px;
	height: 100%;
	box-sizing: border-box;
	overflow: auto;
	padding: var(--MI-margin) var(--MI-margin) calc(var(--MI-margin) + env(safe-area-inset-bottom, 0px));
	border-left: solid 1px var(--nook-border);
	background: var(--nook-white);

	@media (max-width: $widgets-hide-threshold) {
		display: none;
	}
}
</style>
