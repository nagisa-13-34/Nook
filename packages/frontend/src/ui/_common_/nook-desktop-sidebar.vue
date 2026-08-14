<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<nav :class="$style.root" :aria-label="i18n.ts.menu">
	<div :class="$style.brandArea">
		<button v-tooltip.noDelay.right="instance.name ?? i18n.ts.instance" class="_button" :class="$style.brand" @click="openInstanceMenu">
			<span :class="$style.brandMark">N</span>
			<span :class="$style.brandText">Nook</span>
		</button>
	</div>

	<div :class="$style.primary">
		<MkA v-tooltip.noDelay.right="i18n.ts.home" :class="$style.item" :activeClass="$style.active" to="/" exact>
			<i :class="$style.itemIcon" class="ti ti-home ti-fw"></i>
			<span :class="$style.itemText">{{ i18n.ts.home }}</span>
		</MkA>

		<MkA v-tooltip.noDelay.right="i18n.ts.explore" :class="$style.item" :activeClass="$style.active" to="/explore">
			<i :class="$style.itemIcon" class="ti ti-compass ti-fw"></i>
			<span :class="$style.itemText">{{ i18n.ts.explore }}</span>
		</MkA>

		<button v-tooltip.noDelay.right="i18n.ts.create" class="_button" :class="[$style.item, $style.create]" data-testid="open-post-form" @click="os.post()">
			<span :class="$style.createIcon"><i class="ti ti-plus ti-fw"></i></span>
			<span :class="$style.itemText">{{ i18n.ts.create }}</span>
		</button>

		<MkA v-tooltip.noDelay.right="i18n.ts.nookCommunity" :class="$style.item" :activeClass="$style.active" to="/channels">
			<i :class="$style.itemIcon" class="ti ti-users-group ti-fw"></i>
			<span :class="$style.itemText">{{ i18n.ts.nookCommunity }}</span>
		</MkA>

		<MkA
			v-if="$i != null && $i.policies.chatAvailability !== 'unavailable'"
			v-tooltip.noDelay.right="$i.hasUnreadChatMessages ? i18n.ts.nookUnreadChat : i18n.ts.chat"
			:class="$style.item"
			:activeClass="$style.active"
			to="/chat"
		>
			<span :class="$style.iconWrapper">
				<i :class="$style.itemIcon" class="ti ti-messages ti-fw"></i>
				<i v-if="$i.hasUnreadChatMessages" :class="$style.unread" class="_indicatorCircle"></i>
			</span>
			<span :class="$style.itemText">{{ i18n.ts.chat }}</span>
		</MkA>
		<button v-else v-tooltip.noDelay.right="i18n.ts.chat" class="_button" :class="$style.item" disabled>
			<i :class="$style.itemIcon" class="ti ti-messages ti-fw"></i>
			<span :class="$style.itemText">{{ i18n.ts.chat }}</span>
		</button>
	</div>

	<div :class="$style.secondary">
		<MkA v-if="$i != null" v-tooltip.noDelay.right="i18n.ts.notifications" :class="$style.item" :activeClass="$style.active" to="/my/notifications">
			<span :class="$style.iconWrapper">
				<i :class="$style.itemIcon" class="ti ti-bell ti-fw"></i>
				<i v-if="$i.hasUnreadNotification" :class="$style.unread" class="_indicatorCircle"></i>
			</span>
			<span :class="$style.itemText">{{ i18n.ts.notifications }}</span>
		</MkA>

		<button v-if="showWidgetButton" v-tooltip.noDelay.right="i18n.ts.widgets" class="_button" :class="$style.item" @click="emit('widgetButtonClick')">
			<i :class="$style.itemIcon" class="ti ti-apps ti-fw"></i>
			<span :class="$style.itemText">{{ i18n.ts.widgets }}</span>
		</button>

		<MkA v-if="$i != null && ($i.isAdmin || $i.isModerator)" v-tooltip.noDelay.right="i18n.ts.controlPanel" :class="$style.item" :activeClass="$style.active" to="/admin">
			<i :class="$style.itemIcon" class="ti ti-dashboard ti-fw"></i>
			<span :class="$style.itemText">{{ i18n.ts.controlPanel }}</span>
		</MkA>

		<button v-tooltip.noDelay.right="i18n.ts.more" class="_button" :class="$style.item" @click="more">
			<i :class="$style.itemIcon" class="ti ti-grid-dots ti-fw"></i>
			<span :class="$style.itemText">{{ i18n.ts.more }}</span>
			<i v-if="otherMenuItemIndicated" :class="$style.menuUnread" class="_indicatorCircle"></i>
		</button>

		<MkA v-tooltip.noDelay.right="i18n.ts.settings" :class="$style.item" :activeClass="$style.active" to="/settings">
			<i :class="$style.itemIcon" class="ti ti-settings ti-fw"></i>
			<span :class="$style.itemText">{{ i18n.ts.settings }}</span>
		</MkA>

		<button v-if="$i != null" v-tooltip.noDelay.right="`${i18n.ts.account}: @${$i.username}`" class="_button" :class="$style.account" @click="openAccountMenu">
			<MkAvatar :user="$i" :class="$style.avatar"/>
			<span :class="$style.accountText">
				<span :class="$style.accountName">{{ $i.name || $i.username }}</span>
				<MkAcct :class="$style.acct" :user="$i"/>
			</span>
			<i :class="$style.accountMore" class="ti ti-dots"></i>
		</button>
	</div>
</nav>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { openInstanceMenu } from './common.js';
import * as os from '@/os.js';
import { navbarItemDef } from '@/navbar.js';
import { i18n } from '@/i18n.js';
import { instance } from '@/instance.js';
import { getHTMLElementOrNull } from '@/utility/get-dom-node-or-null.js';
import { getAccountMenu } from '@/accounts.js';
import { $i } from '@/i.js';

const props = defineProps<{
	showWidgetButton?: boolean;
}>();

const emit = defineEmits<{
	(ev: 'widgetButtonClick'): void;
}>();

const showWidgetButton = computed(() => props.showWidgetButton === true);

const otherMenuItemIndicated = computed(() => {
	for (const def in navbarItemDef) {
		if (['notifications', 'chat'].includes(def)) continue;
		if (navbarItemDef[def].indicated) return true;
	}
	return false;
});

async function openAccountMenu(ev: PointerEvent) {
	const menuItems = await getAccountMenu({
		withExtraOperation: true,
	});

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
	--nook-sidebar-width: 248px;

	flex: 0 0 var(--nook-sidebar-width);
	width: var(--nook-sidebar-width);
	height: 100%;
	padding: 18px 12px 14px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	gap: 12px;
	overflow: auto;
	overflow-x: hidden;
	background: var(--MI_THEME-navBg);
	color: var(--MI_THEME-navFg);
}

.brandArea {
	flex-shrink: 0;
	padding: 0 6px 4px;
}

.brand {
	display: flex;
	width: 100%;
	align-items: center;
	gap: 11px;
	padding: 7px 8px;
	border-radius: 12px;
	color: var(--MI_THEME-navFg);
	text-align: left;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

.brandMark {
	display: grid;
	width: 34px;
	height: 34px;
	flex: 0 0 34px;
	place-items: center;
	border-radius: 11px;
	background: linear-gradient(135deg, var(--MI_THEME-buttonGradateA), var(--MI_THEME-buttonGradateB));
	color: var(--MI_THEME-fgOnAccent);
	font-size: 18px;
	font-weight: 900;
}

.brandText {
	font-size: 24px;
	font-weight: 900;
	letter-spacing: -0.045em;
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
	flex-shrink: 0;
	padding-top: 10px;
	border-top: solid 0.5px var(--MI_THEME-divider);
}

.item {
	position: relative;
	display: flex;
	width: 100%;
	min-height: 46px;
	box-sizing: border-box;
	align-items: center;
	gap: 13px;
	padding: 9px 12px;
	border-radius: 13px;
	color: var(--MI_THEME-navFg);
	text-decoration: none;
	font-weight: 600;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}

	&.active {
		background: color(from var(--MI_THEME-accent) srgb r g b / 0.12);
		color: var(--MI_THEME-accent);
	}

	&:disabled {
		opacity: 0.4;
		cursor: default;
	}
}

.itemIcon {
	width: 24px;
	flex: 0 0 24px;
	font-size: 21px;
	text-align: center;
}

.itemText {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.create {
	margin: 6px 0;
	background: linear-gradient(90deg, var(--MI_THEME-buttonGradateA), var(--MI_THEME-buttonGradateB));
	color: var(--MI_THEME-fgOnAccent);
	box-shadow: 0 5px 18px color(from var(--MI_THEME-accent) srgb r g b / 0.18);

	&:hover {
		background: linear-gradient(90deg, var(--MI_THEME-buttonGradateA), var(--MI_THEME-buttonGradateB));
		filter: brightness(1.05);
	}
}

.createIcon {
	display: grid;
	width: 24px;
	flex: 0 0 24px;
	place-items: center;
	font-size: 21px;
}

.iconWrapper {
	position: relative;
	display: grid;
	width: 24px;
	flex: 0 0 24px;
	place-items: center;
}

.unread {
	position: absolute;
	top: -3px;
	right: -4px;
	color: var(--MI_THEME-indicator);
}

.menuUnread {
	position: absolute;
	top: 10px;
	right: 10px;
	color: var(--MI_THEME-indicator);
}

.account {
	display: flex;
	width: 100%;
	min-width: 0;
	align-items: center;
	gap: 10px;
	padding: 9px 8px;
	border-radius: 13px;
	color: var(--MI_THEME-navFg);
	text-align: left;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

.avatar {
	width: 36px;
	height: 36px;
	flex: 0 0 36px;
}

.accountText {
	display: flex;
	min-width: 0;
	flex: 1;
	flex-direction: column;
	line-height: 1.25;
}

.accountName,
.acct {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.accountName {
	font-weight: 700;
}

.acct {
	opacity: 0.65;
	font-size: 11px;
}

.accountMore {
	flex: 0 0 auto;
	opacity: 0.6;
}

@media (max-width: 1279px) {
	.root {
		--nook-sidebar-width: 76px;
		padding-inline: 10px;
	}

	.brandArea {
		padding-inline: 0;
	}

	.brand,
	.item,
	.account {
		justify-content: center;
		padding-inline: 9px;
	}

	.brandText,
	.itemText,
	.accountText,
	.accountMore {
		display: none;
	}

	.brandMark {
		width: 38px;
		height: 38px;
		flex-basis: 38px;
	}

	.menuUnread {
		top: 8px;
		right: 8px;
	}
}
</style>
