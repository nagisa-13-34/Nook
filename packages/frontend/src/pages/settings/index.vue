<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :tabs="headerTabs" :actions="headerActions">
	<div class="_spacer" style="--MI_SPACER-w: 900px; --MI_SPACER-min: 20px; --MI_SPACER-max: 32px;">
		<div ref="el" class="vvcocwet" :class="{ wide: !narrow }">
			<div class="body">
				<div v-if="!narrow || currentPage?.route.name == null" class="nav">
					<div class="_gaps_s">
						<MkInfo v-if="emailNotConfigured" warn class="info">{{ i18n.ts.emailNotConfiguredWarning }} <MkA to="/settings/email" class="_link">{{ i18n.ts.configure }}</MkA></MkInfo>
						<MkSuperMenu :def="menuDef" :grid="narrow"></MkSuperMenu>

						<section class="appearance" aria-label="表示モード">
							<div class="appearanceLabel"><i class="ti ti-adjustments-horizontal"></i><span>表示</span></div>
							<div class="appearanceButtons" role="group" aria-label="Light / Dark">
								<button
									type="button"
									class="_button appearanceButton"
									:class="{ active: !store.r.darkMode.value }"
									:aria-pressed="!store.r.darkMode.value"
									@click="setColorMode(false)"
								>
									<i class="ti ti-sun"></i><span>{{ i18n.ts.light }}</span>
								</button>
								<button
									type="button"
									class="_button appearanceButton"
									:class="{ active: store.r.darkMode.value }"
									:aria-pressed="store.r.darkMode.value"
									@click="setColorMode(true)"
								>
									<i class="ti ti-moon"></i><span>{{ i18n.ts.dark }}</span>
								</button>
							</div>
						</section>
					</div>
				</div>
				<div v-if="!(narrow && currentPage?.route.name == null)" class="main">
					<div style="container-type: inline-size;">
						<NestedRouterView/>
					</div>
				</div>
			</div>
		</div>
	</div>
</PageWithHeader>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import type { PageMetadata } from '@/page.js';
import type { SuperMenuDef } from '@/components/MkSuperMenu.vue';
import { i18n } from '@/i18n.js';
import MkInfo from '@/components/MkInfo.vue';
import MkSuperMenu from '@/components/MkSuperMenu.vue';
import { $i } from '@/i.js';
import { clearCache } from '@/utility/clear-cache.js';
import { instance } from '@/instance.js';
import { definePage, provideMetadataReceiver, provideReactiveMetadata } from '@/page.js';
import * as os from '@/os.js';
import { useRouter } from '@/router.js';
import { signout } from '@/signout.js';
import { store } from '@/store.js';
import { prefer } from '@/preferences.js';

const indexInfo = {
	title: i18n.ts.settings,
	icon: 'ti ti-settings',
	hideHeader: true,
};
const INFO = ref<PageMetadata>(indexInfo);
const el = useTemplateRef('el');
const childInfo = ref<null | PageMetadata>(null);
const router = useRouter();
const narrow = ref(false);
const NARROW_THRESHOLD = 600;
const currentPage = computed(() => router.currentRef.value.child);
const syncDeviceDarkMode = prefer.model('syncDeviceDarkMode');

const ro = new ResizeObserver((entries) => {
	if (entries.length === 0) return;
	narrow.value = entries[0].borderBoxSize[0].inlineSize < NARROW_THRESHOLD;
});

function setColorMode(dark: boolean) {
	// Nook only exposes explicit Light / Dark modes. Manual selection wins over device sync.
	if (syncDeviceDarkMode.value) syncDeviceDarkMode.value = false;
	store.set('darkMode', dark);
}

const menuDef = computed<SuperMenuDef[]>(() => [{
	title: i18n.ts.account,
	items: [{
		icon: 'ti ti-user',
		text: i18n.ts.profile,
		to: '/settings/profile',
		active: currentPage.value?.route.name === 'profile',
	}, {
		icon: 'ti ti-lock-open',
		text: i18n.ts.privacy,
		to: '/settings/privacy',
		active: currentPage.value?.route.name === 'privacy',
	}, {
		icon: 'ti ti-bell',
		text: i18n.ts.notifications,
		to: '/settings/notifications',
		active: currentPage.value?.route.name === 'notifications',
	}, {
		icon: 'ti ti-mail',
		text: i18n.ts.email,
		to: '/settings/email',
		active: currentPage.value?.route.name === 'email',
	}, {
		icon: 'ti ti-lock',
		text: i18n.ts.security,
		to: '/settings/security',
		active: currentPage.value?.route.name === 'security',
	}],
}, {
	title: i18n.ts.settings,
	items: [{
		icon: 'ti ti-adjustments',
		text: i18n.ts.preferences,
		to: '/settings/preferences',
		active: currentPage.value?.route.name === 'preferences',
	}, {
		icon: 'ti ti-ban',
		text: i18n.ts.muteAndBlock,
		to: '/settings/mute-block',
		active: currentPage.value?.route.name === 'mute-block',
	}, {
		icon: 'ti ti-package',
		text: i18n.ts._settings.accountData,
		to: '/settings/account-data',
		active: currentPage.value?.route.name === 'account-data',
	}],
}, {
	items: [{
		type: 'button',
		icon: 'ti ti-trash',
		text: i18n.ts.clearCache,
		action: async () => {
			await clearCache();
		},
	}, {
		type: 'button',
		icon: 'ti ti-power',
		text: i18n.ts.logout,
		action: async () => {
			const { canceled } = await os.confirm({
				type: 'warning',
				title: i18n.ts.logoutConfirm,
				text: i18n.ts.logoutWillClearClientData,
			});
			if (canceled) return;
			signout();
		},
		danger: true,
	}],
}]);

onMounted(() => {
	if (el.value == null) return;
	ro.observe(el.value);
	narrow.value = el.value.offsetWidth < NARROW_THRESHOLD;
	if (!narrow.value && currentPage.value?.route.name == null) router.replace('/settings/profile');
});

onActivated(() => {
	if (el.value == null) return;
	narrow.value = el.value.offsetWidth < NARROW_THRESHOLD;
	if (!narrow.value && currentPage.value?.route.name == null) router.replace('/settings/profile');
});

onUnmounted(() => {
	ro.disconnect();
});

watch(router.currentRef, (to) => {
	if (to.route.name === 'settings' && to.child?.route.name == null && !narrow.value) {
		router.replace('/settings/profile');
	}
});

const emailNotConfigured = computed(() => $i && instance.enableEmail && ($i.email == null || !$i.emailVerified));

provideMetadataReceiver((metadataGetter) => {
	const info = metadataGetter();
	if (info == null) {
		childInfo.value = null;
	} else {
		childInfo.value = info;
		INFO.value.needWideArea = info.needWideArea ?? undefined;
	}
});
provideReactiveMetadata(INFO);

const headerActions = computed(() => []);
const headerTabs = computed(() => []);

definePage(() => INFO.value);
</script>

<style lang="scss" scoped>
.vvcocwet {
	&.wide {
		> .body {
			display: flex;
			height: 100%;

			> .nav {
				width: 34%;
				padding-right: 32px;
				box-sizing: border-box;
			}

			> .main {
				flex: 1;
				min-width: 0;
			}
		}
	}
}

.appearance {
	padding: 12px;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 10px;
	background: var(--MI_THEME-panel);
}

.appearanceLabel {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 10px;
	color: color(from var(--MI_THEME-fg) srgb r g b / 0.72);
	font-size: 12px;
	font-weight: 700;
}

.appearanceButtons {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 6px;
	padding: 4px;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 9px;
	background: var(--MI_THEME-bg);
}

.appearanceButton {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 7px;
	min-height: 38px;
	border-radius: 7px;
	color: var(--MI_THEME-fg);
	font-size: 13px;
	font-weight: 750;
}

.appearanceButton:hover {
	background: var(--MI_THEME-panelHighlight);
}

.appearanceButton.active {
	background: var(--MI_THEME-accentedBg);
	color: var(--MI_THEME-accent);
}
</style>
