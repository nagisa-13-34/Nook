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
	--nook-blue: #3657d6;
	--nook-yellow: #f6c94c;
	--nook-ink: #1d2939;
	--nook-border: #e2e7ee;
	position: relative;
	display: grid;
	grid-template-columns: 48px 1fr 48px;
	align-items: center;
	min-height: 48px;
	padding-top: env(safe-area-inset-top, 0px);
	background: #fff;
	color: var(--nook-ink);
	border-bottom: 1px solid var(--nook-border);
}

.brand {
	position: absolute;
	left: 50%;
	transform: translateX(-50%);
	text-align: center;
	font-size: 20px;
	font-weight: 850;
	letter-spacing: -0.045em;
	color: var(--nook-blue);
}

.menu {
	grid-column: 1;
}

.notifications {
	grid-column: 3;
}

.action {
	position: relative;
	display: grid;
	width: 100%;
	height: 48px;
	place-items: center;
	font-size: 19px;
	color: var(--nook-ink);
}

.unread {
	position: absolute;
	top: 9px;
	right: 10px;
	color: var(--nook-yellow);
}
</style>
