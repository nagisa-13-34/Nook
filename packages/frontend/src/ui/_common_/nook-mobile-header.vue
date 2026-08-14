<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<header :class="$style.root">
	<button class="_button" :class="[$style.action, $style.menu]" :aria-label="i18n.ts.menu" @click="drawerMenuShowing = true">
		<i class="ti ti-menu-2"></i>
		<i v-if="menuIndicated" :class="$style.unread" class="_indicatorCircle"></i>
	</button>
	<div :class="$style.brand">Nook</div>
	<button class="_button" :class="[$style.action, $style.widgets]" :aria-label="i18n.ts.widgets" @click="widgetsShowing = true">
		<i class="ti ti-apps"></i>
	</button>
	<button class="_button" :class="[$style.action, $style.notifications]" :aria-label="$i?.hasUnreadNotification ? i18n.tsx.nookUnreadNotifications({ count: $i.unreadNotificationsCount }) : i18n.ts.notifications" @click="mainRouter.push('/my/notifications')">
		<i class="ti ti-bell"></i>
		<i v-if="$i?.hasUnreadNotification" :class="$style.unread" class="_indicatorCircle"></i>
	</button>
</header>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';
import { mainRouter } from '@/router.js';
import { navbarItemDef } from '@/navbar.js';

const drawerMenuShowing = defineModel<boolean>('drawerMenuShowing', { required: true });
const widgetsShowing = defineModel<boolean>('widgetsShowing', { required: true });

const menuIndicated = computed(() => {
	for (const def in navbarItemDef) {
		if (def === 'notifications') continue;
		if (navbarItemDef[def].indicated) return true;
	}
	return false;
});
</script>

<style lang="scss" module>
.root {
	position: relative;
	display: grid;
	grid-template-columns: 48px 1fr 48px 48px;
	align-items: center;
	min-height: 44px;
	padding-top: env(safe-area-inset-top, 0px);
	background: var(--MI_THEME-navBg);
	border-bottom: solid 0.5px var(--MI_THEME-divider);
}

.brand {
	position: absolute;
	left: 50%;
	transform: translateX(-50%);
	text-align: center;
	font-size: 20px;
	font-weight: 800;
	letter-spacing: -0.04em;
	color: var(--MI_THEME-accent);
}

.menu {
	grid-column: 1;
}

.widgets {
	grid-column: 3;
}

.notifications {
	grid-column: 4;
}

.action {
	position: relative;
	display: grid;
	width: 100%;
	height: 44px;
	place-items: center;
	font-size: 19px;
}

.unread {
	position: absolute;
	top: 9px;
	right: 10px;
	color: var(--MI_THEME-indicator);
}
</style>
