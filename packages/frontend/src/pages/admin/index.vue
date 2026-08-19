<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div ref="el" class="hiyeyicy" :class="{ wide: !narrow }">
	<div v-if="!narrow || currentPage?.route.name == null" class="nav">
		<div class="navInner">
			<header class="adminHeader">
				<div class="adminMark"><i class="ti ti-shield-cog"></i></div>
				<div class="adminHeaderText">
					<strong>管理</strong>
					<span>Nookの運営とサーバー設定</span>
				</div>
			</header>

			<div class="warnings _gaps_s">
				<MkInfo v-if="thereIsUnresolvedAbuseReport" warn>{{ i18n.ts.thereIsUnresolvedAbuseReportWarning }} <MkA to="/admin/abuses" class="_link">{{ i18n.ts.check }}</MkA></MkInfo>
				<MkInfo v-if="noMaintainerInformation" warn>{{ i18n.ts.noMaintainerInformationWarning }} <MkA to="/admin/settings" class="_link">{{ i18n.ts.configure }}</MkA></MkInfo>
				<MkInfo v-if="noInquiryUrl" warn>{{ i18n.ts.noInquiryUrlWarning }} <MkA to="/admin/settings" class="_link">{{ i18n.ts.configure }}</MkA></MkInfo>
				<MkInfo v-if="noBotProtection" warn>{{ i18n.ts.noBotProtectionWarning }} <MkA to="/admin/security" class="_link">{{ i18n.ts.configure }}</MkA></MkInfo>
				<MkInfo v-if="noEmailServer" warn>{{ i18n.ts.noEmailServerWarning }} <MkA to="/admin/email-settings" class="_link">{{ i18n.ts.configure }}</MkA></MkInfo>
			</div>

			<MkSuperMenu :def="menuDef" :grid="narrow"></MkSuperMenu>
		</div>
	</div>
	<div v-if="!(narrow && currentPage?.route.name == null)" class="main _pageContainer" style="height: 100%;">
		<NestedRouterView/>
	</div>
</div>
</template>

<script lang="ts" setup>
import { onActivated, onMounted, onUnmounted, provide, watch, ref, computed } from 'vue';
import type { SuperMenuDef } from '@/components/MkSuperMenu.vue';
import type { PageMetadata } from '@/page.js';
import { i18n } from '@/i18n.js';
import MkSuperMenu from '@/components/MkSuperMenu.vue';
import MkInfo from '@/components/MkInfo.vue';
import { instance } from '@/instance.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { definePage, provideMetadataReceiver, provideReactiveMetadata } from '@/page.js';
import { useRouter } from '@/router.js';
import { iAmAdmin } from '@/i.js';

const isEmpty = (x: string | null) => x == null || x === '';
const router = useRouter();

const indexInfo = {
	title: '管理',
	icon: 'ti ti-shield-cog',
	hideHeader: true,
};

provide('shouldOmitHeaderTitle', false);

const INFO = ref<PageMetadata>(indexInfo);
const childInfo = ref<null | PageMetadata>(null);
const narrow = ref(false);
const el = ref<HTMLDivElement | null>(null);
const noMaintainerInformation = computed(() => isEmpty(instance.maintainerName) || isEmpty(instance.maintainerEmail));
const noBotProtection = computed(() => !instance.disableRegistration && !instance.enableHcaptcha && !instance.enableRecaptcha && !instance.enableTurnstile && !instance.enableMcaptcha);
const noEmailServer = computed(() => !instance.enableEmail);
const noInquiryUrl = computed(() => isEmpty(instance.inquiryUrl));
const thereIsUnresolvedAbuseReport = ref(false);
const currentPage = computed(() => router.currentRef.value.child);

misskeyApi('admin/abuse-user-reports', {
	state: 'unresolved',
	limit: 1,
}).then(reports => {
	if (reports.length > 0) thereIsUnresolvedAbuseReport.value = true;
});

const NARROW_THRESHOLD = 600;
const ro = new ResizeObserver((entries) => {
	if (entries.length === 0) return;
	narrow.value = entries[0].borderBoxSize[0].inlineSize < NARROW_THRESHOLD;
});

const menuDef = computed<SuperMenuDef[]>(() => [{
	title: '運営',
	items: [{
		icon: 'ti ti-layout-dashboard',
		text: '概要',
		to: '/admin/overview',
		active: currentPage.value?.route.name === 'overview',
	}, {
		icon: 'ti ti-users',
		text: 'ユーザー',
		to: '/admin/users',
		active: currentPage.value?.route.name === 'users',
	}, {
		icon: 'ti ti-user-plus',
		text: '招待',
		to: '/admin/invites',
		active: currentPage.value?.route.name === 'invites',
	}, {
		icon: 'ti ti-mood-smile',
		text: '絵文字',
		to: '/admin/emojis',
		active: currentPage.value?.route.name === 'emojis',
	}, {
		icon: 'ti ti-speakerphone',
		text: 'お知らせ',
		to: '/admin/announcements',
		active: currentPage.value?.route.name === 'announcements',
	}, {
		icon: 'ti ti-flag',
		text: '通報',
		to: '/admin/abuses',
		active: currentPage.value?.route.name === 'abuses',
	}, {
		icon: 'ti ti-history',
		text: '操作ログ',
		to: '/admin/modlog',
		active: currentPage.value?.route.name === 'modlog',
	}],
}, {
	title: '設定',
	items: [{
		icon: 'ti ti-adjustments',
		text: '基本設定',
		to: '/admin/settings',
		active: currentPage.value?.route.name === 'settings',
	}, ...(iAmAdmin ? [{
		icon: 'ti ti-shield-cog',
		text: 'Nook設定',
		to: '/admin/nook-settings',
		active: currentPage.value?.route.name === 'nookSettings' || currentPage.value?.route.name === 'nookPolicyEdit',
	}] : []), {
		icon: 'ti ti-paint',
		text: 'ブランド',
		to: '/admin/branding',
		active: currentPage.value?.route.name === 'branding',
	}, {
		icon: 'ti ti-shield',
		text: 'モデレーション',
		to: '/admin/moderation',
		active: currentPage.value?.route.name === 'moderation',
	}, {
		icon: 'ti ti-lock',
		text: 'セキュリティ',
		to: '/admin/security',
		active: currentPage.value?.route.name === 'security',
	}, {
		icon: 'ti ti-mail',
		text: 'メール',
		to: '/admin/email-settings',
		active: currentPage.value?.route.name === 'email-settings',
	}, {
		icon: 'ti ti-database',
		text: 'ストレージ',
		to: '/admin/object-storage',
		active: currentPage.value?.route.name === 'object-storage',
	}],
}]);

onMounted(() => {
	if (el.value != null) {
		ro.observe(el.value);
		narrow.value = el.value.offsetWidth < NARROW_THRESHOLD;
	}
	if (currentPage.value?.route.name == null && !narrow.value) router.replace('/admin/overview');
});

onActivated(() => {
	if (el.value != null) narrow.value = el.value.offsetWidth < NARROW_THRESHOLD;
	if (currentPage.value?.route.name == null && !narrow.value) router.replace('/admin/overview');
});

onUnmounted(() => {
	ro.disconnect();
});

watch(router.currentRef, (to) => {
	if (to.route.path === '/admin' && to.child?.route.name == null && !narrow.value) {
		router.replace('/admin/overview');
	}
});

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
.hiyeyicy {
	height: 100%;
	background: var(--MI_THEME-bg);

	&.wide {
		display: flex;
		margin: 0 auto;

		> .nav {
			position: sticky;
			top: 0;
			width: 300px;
			min-width: 300px;
			box-sizing: border-box;
			border-right: solid 1px var(--MI_THEME-divider);
			background: var(--MI_THEME-panel);
			overflow: auto;
			height: 100cqh;
		}

		> .main {
			flex: 1;
			min-width: 0;
		}
	}
}

.navInner {
	padding: 18px 14px 28px;
}

.adminHeader {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 4px 6px 18px;
	margin-bottom: 14px;
	border-bottom: 1px solid var(--MI_THEME-divider);
}

.adminMark {
	display: grid;
	width: 38px;
	height: 38px;
	flex: 0 0 auto;
	place-items: center;
	border-radius: 9px;
	background: var(--MI_THEME-accentedBg);
	color: var(--MI_THEME-accent);
	font-size: 20px;
}

.adminHeaderText {
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.adminHeaderText strong {
	font-size: 18px;
	line-height: 1.25;
}

.adminHeaderText span {
	color: color(from var(--MI_THEME-fg) srgb r g b / 0.62);
	font-size: 11px;
	line-height: 1.4;
}

.warnings {
	margin-bottom: 16px;
}

@media (max-width: 600px) {
	.navInner {
		padding: 14px;
	}
}
</style>
