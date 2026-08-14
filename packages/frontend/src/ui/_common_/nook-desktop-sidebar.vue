<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<nav :class="$style.root" aria-label="Nook">
	<div :class="$style.brandRow">
		<button class="_button" :class="$style.brand" aria-label="Nook" @click="mainRouter.push('/')">Nook</button>
	</div>

	<div :class="$style.primary">
		<button :class="[$style.item, { [$style.active]: currentPath === '/' }]" class="_button" :aria-current="currentPath === '/' ? 'page' : undefined" @click="mainRouter.push('/')">
			<i class="ti ti-home" :class="$style.icon"></i>
			<span>{{ i18n.ts.home }}</span>
		</button>
		<button :class="[$style.item, { [$style.active]: currentPath.startsWith('/explore') }]" class="_button" :aria-current="currentPath.startsWith('/explore') ? 'page' : undefined" @click="mainRouter.push('/explore')">
			<i class="ti ti-compass" :class="$style.icon"></i>
			<span>{{ i18n.ts.explore }}</span>
		</button>
		<button :class="[$style.item, { [$style.active]: currentPath.startsWith('/channels') }]" class="_button" :aria-current="currentPath.startsWith('/channels') ? 'page' : undefined" @click="mainRouter.push('/channels')">
			<i class="ti ti-users-group" :class="$style.icon"></i>
			<span>{{ i18n.ts.nookCommunity }}</span>
		</button>
		<button :class="[$style.item, { [$style.active]: currentPath.startsWith('/chat') }]" class="_button" :aria-current="currentPath.startsWith('/chat') ? 'page' : undefined" :disabled="$i == null || $i.policies.chatAvailability === 'unavailable'" @click="mainRouter.push('/chat')">
			<span :class="$style.iconWrap">
				<i class="ti ti-messages" :class="$style.icon"></i>
				<i v-if="$i?.hasUnreadChatMessages" :class="$style.unread" class="_indicatorCircle"></i>
			</span>
			<span>{{ i18n.ts.chat }}</span>
		</button>

		<button class="_button" :class="$style.create" data-testid="open-post-form" @click="os.post()">
			<i class="ti ti-plus" :class="$style.createIcon"></i>
			<span>{{ i18n.ts.create }}</span>
		</button>
	</div>

	<div :class="$style.secondary">
		<button :class="[$style.item, { [$style.active]: currentPath.startsWith('/my/notifications') }]" class="_button" :aria-current="currentPath.startsWith('/my/notifications') ? 'page' : undefined" @click="mainRouter.push('/my/notifications')">
			<span :class="$style.iconWrap">
				<i class="ti ti-bell" :class="$style.icon"></i>
				<i v-if="$i?.hasUnreadNotification" :class="$style.unread" class="_indicatorCircle"></i>
			</span>
			<span>{{ i18n.ts.notifications }}</span>
		</button>
		<button v-if="showWidgetButton" class="_button" :class="$style.item" @click="emit('widgetButtonClick')">
			<i class="ti ti-apps" :class="$style.icon"></i>
			<span>{{ i18n.ts.widgets }}</span>
		</button>
		<button class="_button" :class="$style.item" @click="more">
			<i class="ti ti-grid-dots" :class="$style.icon"></i>
			<span>{{ i18n.ts.more }}</span>
		</button>
		<button :class="[$style.item, { [$style.active]: currentPath.startsWith('/settings') }]" class="_button" :aria-current="currentPath.startsWith('/settings') ? 'page' : undefined" @click="mainRouter.push('/settings')">
			<i class="ti ti-settings" :class="$style.icon"></i>
			<span>{{ i18n.ts.settings }}</span>
		</button>

		<button v-if="$i" class="_button" :class="$style.account" @click="openAccountMenu">
			<MkAvatar :user="$i" :class="$style.avatar"/>
			<span :class="$style.accountText">
				<strong :class="$style.accountName">{{ $i.name || $i.username }}</strong>
				<span :class="$style.accountHandle">@{{ $i.username }}</span>
			</span>
			<i class="ti ti-dots" :class="$style.accountMore"></i>
		</button>
	</div>
</nav>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { $i } from '@/i.js';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { mainRouter } from '@/router.js';
import { getAccountMenu } from '@/accounts.js';
import { getHTMLElementOrNull } from '@/utility/get-dom-node-or-null.js';

const props = defineProps<{
	showWidgetButton?: boolean;
}>();

const emit = defineEmits<{
	(ev: 'widgetButtonClick'): void;
}>();

const currentPath = computed(() => mainRouter.currentRoute.value.path);
const showWidgetButton = computed(() => props.showWidgetButton !== false);

async function openAccountMenu(ev: PointerEvent) {
	const menuItems = await getAccountMenu({ withExtraOperation: true });
	os.popupMenu(menuItems, ev.currentTarget ?? ev.target);
}

async function more(ev: PointerEvent) {
	const target = getHTMLElementOrNull(ev.currentTarget ?? ev.target);
	if (!target) return;
	const { dispose } = await os.popupAsyncWithDialog(import('@/components/MkLaunchPad.vue').then(x => x.default), {
		anchorElement: target,
	}, {
		closed: () => dispose(),
	});
}
</script>

<style lang="scss" module>
.root {
	width: 248px;
	min-width: 248px;
	height: 100%;
	box-sizing: border-box;
	padding: 18px 14px 14px;
	display: flex;
	flex-direction: column;
	background: var(--MI_THEME-navBg);
	color: var(--MI_THEME-navFg);
}

.brandRow {
	padding: 2px 8px 18px;
}

.brand {
	font-size: 27px;
	font-weight: 850;
	line-height: 1;
	letter-spacing: -0.055em;
	color: var(--MI_THEME-accent);
}

.primary,
.secondary {
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.primary {
	flex: 1;
}

.secondary {
	padding-top: 10px;
	border-top: solid 0.5px var(--MI_THEME-divider);
}

.item {
	position: relative;
	width: 100%;
	min-height: 48px;
	padding: 0 13px;
	display: flex;
	align-items: center;
	gap: 14px;
	border-radius: 14px;
	box-sizing: border-box;
	font-size: 15px;
	font-weight: 650;
	text-align: left;
	color: var(--MI_THEME-navFg);
	transition: background-color 0.15s ease, color 0.15s ease, transform 0.15s ease;

	&:hover {
		background: color(from var(--MI_THEME-navFg) srgb r g b / 0.07);
	}

	&:active {
		transform: scale(0.985);
	}

	&:disabled {
		opacity: 0.42;
		cursor: default;
	}
}

.active {
	background: color(from var(--MI_THEME-accent) srgb r g b / 0.12);
	color: var(--MI_THEME-accent);
}

.iconWrap {
	position: relative;
	display: inline-grid;
	place-items: center;
}

.icon {
	width: 22px;
	font-size: 21px;
	text-align: center;
}

.unread {
	position: absolute;
	top: -2px;
	right: -5px;
	color: var(--MI_THEME-indicator);
}

.create {
	width: 100%;
	min-height: 50px;
	margin-top: 12px;
	padding: 0 18px;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	border-radius: 15px;
	background: linear-gradient(90deg, var(--MI_THEME-buttonGradateA), var(--MI_THEME-buttonGradateB));
	color: var(--MI_THEME-fgOnAccent);
	font-size: 15px;
	font-weight: 750;
	box-shadow: 0 5px 16px color(from var(--MI_THEME-accent) srgb r g b / 0.18);
	transition: transform 0.15s ease, filter 0.15s ease;

	&:hover {
		filter: brightness(1.05);
	}

	&:active {
		transform: scale(0.985);
	}
}

.createIcon {
	font-size: 19px;
}

.account {
	width: 100%;
	min-height: 58px;
	margin-top: 8px;
	padding: 7px 10px;
	display: flex;
	align-items: center;
	gap: 10px;
	border-radius: 14px;
	text-align: left;
	transition: background-color 0.15s ease;

	&:hover {
		background: color(from var(--MI_THEME-navFg) srgb r g b / 0.07);
	}
}

.avatar {
	width: 36px;
	height: 36px;
	flex: 0 0 auto;
}

.accountText {
	min-width: 0;
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: 1px;
}

.accountName,
.accountHandle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.accountName {
	font-size: 13px;
	font-weight: 700;
}

.accountHandle {
	font-size: 11px;
	opacity: 0.58;
}

.accountMore {
	font-size: 17px;
	opacity: 0.55;
}

@media (max-width: 1279px) {
	.root {
		width: 78px;
		min-width: 78px;
		padding-inline: 10px;
	}

	.brandRow {
		padding-inline: 0;
		text-align: center;
	}

	.brand {
		font-size: 0;

		&::after {
			content: 'N';
			font-size: 24px;
		}
	}

	.item {
		justify-content: center;
		padding: 0;

		> span:last-child {
			display: none;
		}
	}

	.create {
		padding: 0;

		> span {
			display: none;
		}
	}

	.account {
		justify-content: center;
		padding-inline: 0;
	}

	.accountText,
	.accountMore {
		display: none;
	}
}
</style>
