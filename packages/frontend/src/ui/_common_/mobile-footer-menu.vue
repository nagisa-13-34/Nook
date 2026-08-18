<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div ref="rootEl" :class="$style.root">
	<button :class="[$style.item, { [$style.active]: currentPath === '/' }]" class="_button" :aria-label="i18n.ts.home" :aria-current="currentPath === '/' ? 'page' : undefined" @click="mainRouter.push('/')">
		<i :class="$style.itemIcon" class="ti ti-home"></i>
		<span :class="$style.itemLabel">{{ i18n.ts.home }}</span>
	</button>

	<button :class="[$style.item, { [$style.active]: currentPath.startsWith('/explore') }]" class="_button" :aria-label="i18n.ts.explore" :aria-current="currentPath.startsWith('/explore') ? 'page' : undefined" @click="mainRouter.push('/explore')">
		<i :class="$style.itemIcon" class="ti ti-compass"></i>
		<span :class="$style.itemLabel">{{ i18n.ts.explore }}</span>
	</button>

	<button :class="[$style.item, $style.create]" class="_button" :aria-label="i18n.ts.create" data-testid="open-post-form" @click="os.post()">
		<span :class="$style.createIcon"><i :class="$style.itemIcon" class="ti ti-plus"></i></span>
		<span :class="$style.itemLabel">{{ i18n.ts.create }}</span>
	</button>

	<button :class="[$style.item, { [$style.active]: currentPath.startsWith('/channels') }]" class="_button" :aria-label="i18n.ts.nookCommunity" :aria-current="currentPath.startsWith('/channels') ? 'page' : undefined" @click="mainRouter.push('/channels')">
		<i :class="$style.itemIcon" class="ti ti-users-group"></i>
		<span :class="$style.itemLabel">{{ i18n.ts.nookCommunity }}</span>
	</button>

	<button :class="[$style.item, { [$style.active]: currentPath.startsWith('/chat') }]" class="_button" :aria-label="$i?.hasUnreadChatMessages ? i18n.ts.nookUnreadChat : i18n.ts.chat" :aria-current="currentPath.startsWith('/chat') ? 'page' : undefined" :disabled="$i == null || $i.policies.chatAvailability === 'unavailable'" @click="mainRouter.push('/chat')">
		<span :class="$style.iconWrapper">
			<i :class="$style.itemIcon" class="ti ti-messages"></i>
			<i v-if="$i?.hasUnreadChatMessages" :class="$style.unread" class="_indicatorCircle"></i>
		</span>
		<span :class="$style.itemLabel">{{ i18n.ts.chat }}</span>
	</button>
</div>
</template>

<script lang="ts" setup>
import { computed, ref, useTemplateRef, watch } from 'vue';
import { $i } from '@/i.js';
import * as os from '@/os.js';
import { mainRouter } from '@/router.js';
import { i18n } from '@/i18n.js';

defineModel<boolean>('drawerMenuShowing');
defineModel<boolean>('widgetsShowing');

const rootEl = useTemplateRef('rootEl');

const currentPath = computed(() => mainRouter.currentRoute.value.path);

const rootElHeight = ref(0);

watch(rootEl, () => {
	if (rootEl.value) {
		rootElHeight.value = rootEl.value.offsetHeight;
		window.document.body.style.setProperty('--MI-minBottomSpacing', 'var(--MI-minBottomSpacingMobile)');
	} else {
		rootElHeight.value = 0;
		window.document.body.style.setProperty('--MI-minBottomSpacing', '0px');
	}
}, {
	immediate: true,
});
</script>

<style lang="scss" module>
.root {
	--nook-blue: #175cd3;
	--nook-blue-soft: #eef5ff;
	--nook-yellow: #ffd84d;
	--nook-ink: #17324d;
	--nook-border: #d7e3f1;
	position: relative;
	z-index: 1;
	padding-bottom: env(safe-area-inset-bottom, 0px);
	display: grid;
	grid-template-columns: repeat(5, 1fr);
	width: 100%;
	box-sizing: border-box;
	background: #fff;
	color: var(--nook-ink);
	border-top: 1px solid var(--nook-border);
}

.item {
	display: flex;
	min-width: 0;
	padding: 8px 2px 7px;
	flex-direction: column;
	align-items: center;
	gap: 3px;
	color: var(--nook-ink);

	&.active {
		color: var(--nook-blue);
	}

	&:disabled {
		opacity: 0.45;
	}
}

.create {
	margin-top: -9px;
}

.createIcon {
	display: grid;
	width: 42px;
	height: 42px;
	place-items: center;
	border: 1px solid #e4bd29;
	border-radius: 11px;
	background: var(--nook-yellow);
	color: var(--nook-ink);
}

.iconWrapper {
	position: relative;
}

.itemIcon {
	font-size: 20px;
}

.itemLabel {
	max-width: 100%;
	overflow: hidden;
	font-size: 10px;
	font-weight: 650;
	line-height: 1.2;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.unread {
	position: absolute;
	top: -2px;
	right: -5px;
	color: var(--nook-yellow);
}
</style>
