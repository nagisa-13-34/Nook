<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<nav :class="$style.root" :aria-label="i18n.ts.menu">
	<div :class="$style.brandRow">
		<MkA v-tooltip.noDelay.right="'Nook'" :class="$style.brand" aria-label="Nook" to="/" exact>Nook</MkA>
	</div>

	<div :class="$style.primary">
		<MkA v-tooltip.noDelay.right="i18n.ts.home" :class="$style.item" :activeClass="$style.active" to="/" exact>
			<i class="ti ti-home" :class="$style.icon"></i>
			<span :class="$style.itemText">{{ i18n.ts.home }}</span>
		</MkA>
		<MkA v-tooltip.noDelay.right="i18n.ts.search" :class="$style.item" :activeClass="$style.active" to="/search">
			<i class="ti ti-search" :class="$style.icon"></i>
			<span :class="$style.itemText">{{ i18n.ts.search }}</span>
		</MkA>
		<MkA v-tooltip.noDelay.right="i18n.ts.explore" :class="$style.item" :activeClass="$style.active" to="/explore">
			<i class="ti ti-compass" :class="$style.icon"></i>
			<span :class="$style.itemText">{{ i18n.ts.explore }}</span>
		</MkA>
		<MkA v-if="$i != null" v-tooltip.noDelay.right="i18n.ts.notifications" :class="$style.item" :activeClass="$style.active" to="/my/notifications">
			<span :class="$style.iconWrap">
				<i class="ti ti-bell" :class="$style.icon"></i>
				<i v-if="$i.hasUnreadNotification" :class="$style.unread" class="_indicatorCircle"></i>
			</span>
			<span :class="$style.itemText">{{ i18n.ts.notifications }}</span>
		</MkA>
		<MkA v-if="$i != null" v-tooltip.noDelay.right="i18n.ts.nookBookmarks" :class="$style.item" :activeClass="$style.active" to="/my/favorites">
			<i class="ti ti-bookmark" :class="$style.icon"></i>
			<span :class="$style.itemText">{{ i18n.ts.nookBookmarks }}</span>
		</MkA>
		<MkA v-tooltip.noDelay.right="i18n.ts.nookCommunity" :class="$style.item" :activeClass="$style.active" to="/channels">
			<i class="ti ti-users-group" :class="$style.icon"></i>
			<span :class="$style.itemText">{{ i18n.ts.nookCommunity }}</span>
		</MkA>
		<MkA
			v-if="$i != null && $i.policies.chatAvailability !== 'unavailable'"
			v-tooltip.noDelay.right="i18n.ts.chat"
			:class="$style.item"
			:activeClass="$style.active"
			to="/chat"
		>
			<span :class="$style.iconWrap">
				<i class="ti ti-messages" :class="$style.icon"></i>
				<i v-if="$i.hasUnreadChatMessages" :class="$style.unread" class="_indicatorCircle"></i>
			</span>
			<span :class="$style.itemText">{{ i18n.ts.chat }}</span>
		</MkA>

		<button v-tooltip.noDelay.right="i18n.ts.create" class="_button" :class="$style.create" data-testid="open-post-form" @click="os.post()">
			<i class="ti ti-plus" :class="$style.createIcon"></i>
			<span :class="$style.itemText">{{ i18n.ts.create }}</span>
		</button>
	</div>

	<div :class="$style.secondary">
		<MkA v-if="$i != null && ($i.isAdmin || $i.isModerator)" v-tooltip.noDelay.right="i18n.ts.controlPanel" :class="$style.item" :activeClass="$style.active" to="/admin">
			<i class="ti ti-dashboard" :class="$style.icon"></i>
			<span :class="$style.itemText">{{ i18n.ts.controlPanel }}</span>
		</MkA>
		<MkA v-tooltip.noDelay.right="i18n.ts.settings" :class="$style.item" :activeClass="$style.active" to="/settings">
			<i class="ti ti-settings" :class="$style.icon"></i>
			<span :class="$style.itemText">{{ i18n.ts.settings }}</span>
		</MkA>

		<button v-if="$i" v-tooltip.noDelay.right="`${i18n.ts.account}: @${$i.username}`" class="_button" :class="$style.account" @click="openAccountMenu">
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
import { $i } from '@/i.js';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { getAccountMenu } from '@/accounts.js';

defineProps<{
	showWidgetButton?: boolean;
}>();

defineEmits<{
	(ev: 'widgetButtonClick'): void;
}>();

async function openAccountMenu(ev: PointerEvent) {
	const menuItems = await getAccountMenu({ withExtraOperation: false });
	os.popupMenu(menuItems, ev.currentTarget ?? ev.target);
}
</script>

<style lang="scss" module>
.root {
	--nook-blue: #175cd3;
	--nook-blue-soft: #eef5ff;
	--nook-yellow: #ffd84d;
	--nook-ink: #17324d;
	--nook-border: #d7e3f1;
	width: 248px;
	min-width: 248px;
	height: 100%;
	box-sizing: border-box;
	padding: 20px 14px 14px;
	display: flex;
	flex-direction: column;
	background: #fff;
	color: var(--nook-ink);
}

.brandRow {
	padding: 2px 10px 20px;
}

.brand {
	font-size: 27px;
	font-weight: 850;
	line-height: 1;
	letter-spacing: -0.055em;
	text-decoration: none;
	color: var(--nook-blue);
}

.primary,
.secondary {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.primary {
	flex: 1;
	overflow-y: auto;
}

.secondary {
	padding-top: 10px;
	border-top: 1px solid var(--nook-border);
}

.item {
	position: relative;
	width: 100%;
	min-height: 44px;
	padding: 0 13px;
	display: flex;
	align-items: center;
	gap: 13px;
	border-radius: 8px;
	box-sizing: border-box;
	font-size: 15px;
	font-weight: 650;
	text-align: left;
	text-decoration: none;
	color: var(--nook-ink);
	transition: background-color 0.12s ease, color 0.12s ease;

	&:hover {
		background: #f7faff;
	}
}

.itemText {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.active {
	background: var(--nook-blue-soft);
	color: var(--nook-blue);
}

.iconWrap {
	position: relative;
	display: inline-grid;
	place-items: center;
}

.icon {
	width: 22px;
	font-size: 20px;
	text-align: center;
}

.unread {
	position: absolute;
	top: -2px;
	right: -5px;
	color: var(--nook-yellow);
}

.create {
	width: 100%;
	min-height: 46px;
	margin-top: 10px;
	padding: 0 18px;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 9px;
	border: 1px solid #e4bd29;
	border-radius: 8px;
	background: var(--nook-yellow);
	color: var(--nook-ink);
	font-size: 15px;
	font-weight: 800;

	&:hover {
		background: #ffdf69;
	}
}

.createIcon {
	font-size: 19px;
}

.account {
	width: 100%;
	min-height: 56px;
	margin-top: 8px;
	padding: 7px 10px;
	display: flex;
	align-items: center;
	gap: 10px;
	border-radius: 8px;
	text-align: left;

	&:hover {
		background: #f7faff;
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
	}

	.itemText {
		display: none;
	}

	.create {
		padding: 0;
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
