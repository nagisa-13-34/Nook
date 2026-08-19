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
		<MkA v-tooltip.noDelay.right="i18n.ts.nookSearchDiscover" :class="$style.item" :activeClass="$style.active" to="/search">
			<i class="ti ti-search" :class="$style.icon"></i>
			<span :class="$style.itemText">{{ i18n.ts.nookSearchDiscover }}</span>
		</MkA>
		<MkA v-if="videoFeedAvailable" v-tooltip.noDelay.right="i18n.ts.nookVideo" :class="$style.item" :activeClass="$style.active" to="/videos">
			<i class="ti ti-video" :class="$style.icon"></i>
			<span :class="$style.itemText">{{ i18n.ts.nookVideo }}</span>
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
		<div v-if="$i" :class="$style.accountRow">
			<MkA
				v-tooltip.noDelay.right="`${i18n.ts.profile}: @${$i.username}`"
				:class="$style.accountMain"
				:to="`/@${$i.username}`"
			>
				<MkAvatar :user="$i" :class="$style.avatar"/>
				<span :class="$style.accountText">
					<strong :class="$style.accountName">{{ $i.name || $i.username }}</strong>
					<span :class="$style.accountHandle">@{{ $i.username }}</span>
				</span>
			</MkA>
			<button
				v-tooltip.noDelay.right="i18n.ts.menu"
				class="_button"
				:class="$style.accountMoreButton"
				:aria-label="i18n.ts.menu"
				@click="openAccountMenu"
			>
				<i class="ti ti-dots"></i>
			</button>
		</div>
	</div>
</nav>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { $i } from '@/i.js';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { getAccountMenu } from '@/accounts.js';
import type { MenuItem } from '@/types/menu.js';
import { isNookVideoFeedAvailable } from '@/nook/video-feed.js';
import { availableBasicTimelines } from '@/timelines.js';

defineProps<{
	showWidgetButton?: boolean;
}>();

defineEmits<{
	(ev: 'widgetButtonClick'): void;
}>();

const videoFeedAvailable = computed(() => isNookVideoFeedAvailable(availableBasicTimelines()));

async function openAccountMenu(ev: PointerEvent) {
	if ($i == null) return;
	const menuItems: MenuItem[] = [{
		type: 'link',
		icon: 'ti ti-settings',
		text: i18n.ts.settings,
		to: '/settings',
	}];

	if ($i.isAdmin || $i.isModerator) {
		menuItems.push({
			type: 'link',
			icon: 'ti ti-shield-cog',
			text: '管理',
			to: '/admin',
		});
	}

	const accountItems = await getAccountMenu({ withExtraOperation: false });
	if (accountItems.length > 0) {
		menuItems.push({ type: 'divider' }, ...accountItems);
	}

	os.popupMenu(menuItems, ev.currentTarget ?? ev.target);
}
</script>

<style lang="scss" module>
.root {
	--nook-blue: #3657d6;
	--nook-blue-soft: #eef1ff;
	--nook-yellow: #f6c94c;
	--nook-ink: #1d2939;
	--nook-border: #e2e7ee;
	--nook-surface: #ffffff;
	--nook-hover: #f9fafb;
	--nook-on-yellow: #1d2939;
	--nook-create-border: #d6aa2e;
	--nook-create-hover: #f8d469;
	width: 248px;
	min-width: 248px;
	height: 100%;
	box-sizing: border-box;
	padding: 20px 14px 14px;
	display: flex;
	flex-direction: column;
	background: var(--nook-surface);
	color: var(--nook-ink);
}

:global(html[data-color-scheme='dark']) .root {
	--nook-blue: #8ea2ff;
	--nook-blue-soft: #202a4d;
	--nook-yellow: #f4ca5c;
	--nook-ink: #f2f4f7;
	--nook-border: #2c3542;
	--nook-surface: #161c26;
	--nook-hover: #1d2531;
	--nook-create-border: #9a7b2e;
	--nook-create-hover: #f6d66d;
}

.brandRow { padding: 2px 10px 20px; }
.brand { font-size: 27px; font-weight: 850; line-height: 1; letter-spacing: -0.055em; text-decoration: none; color: var(--nook-blue); }
.primary, .secondary { display: flex; flex-direction: column; gap: 2px; }
.primary { flex: 1; overflow-y: auto; }
.secondary { padding-top: 10px; border-top: 1px solid var(--nook-border); }
.item { position: relative; width: 100%; min-height: 44px; padding: 0 13px; display: flex; align-items: center; gap: 13px; border-radius: 8px; box-sizing: border-box; font-size: 15px; font-weight: 650; text-align: left; text-decoration: none; color: var(--nook-ink); transition: background-color 0.12s ease, color 0.12s ease; }
.item:hover { background: var(--nook-hover); }
.itemText { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.active { background: var(--nook-blue-soft); color: var(--nook-blue); }
.iconWrap { position: relative; display: inline-grid; place-items: center; }
.icon { width: 22px; font-size: 20px; text-align: center; }
.unread { position: absolute; top: -2px; right: -5px; color: var(--nook-yellow); }
.create { width: 100%; min-height: 46px; margin-top: 10px; padding: 0 18px; display: flex; align-items: center; justify-content: center; gap: 9px; border: 1px solid var(--nook-create-border); border-radius: 8px; background: var(--nook-yellow); color: var(--nook-on-yellow); font-size: 15px; font-weight: 800; }
.create:hover { background: var(--nook-create-hover); }
.createIcon { font-size: 19px; }
.accountRow { width: 100%; min-height: 56px; margin-top: 4px; display: flex; align-items: center; border-radius: 8px; overflow: hidden; }
.accountRow:hover { background: var(--nook-hover); }
.accountMain { min-width: 0; min-height: 56px; padding: 7px 4px 7px 10px; display: flex; flex: 1; align-items: center; gap: 10px; box-sizing: border-box; color: var(--nook-ink); text-decoration: none; }
.avatar { width: 36px; height: 36px; flex: 0 0 auto; }
.accountText { min-width: 0; display: flex; flex: 1; flex-direction: column; gap: 1px; }
.accountName, .accountHandle { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.accountName { font-size: 13px; font-weight: 700; }
.accountHandle { font-size: 11px; opacity: 0.58; }
.accountMoreButton { width: 38px; min-width: 38px; height: 40px; margin-right: 4px; display: grid; place-items: center; border-radius: 7px; font-size: 18px; opacity: 0.62; }
.accountMoreButton:hover { background: var(--nook-blue-soft); color: var(--nook-blue); opacity: 1; }

@media (max-width: 1279px) {
	.root { width: 78px; min-width: 78px; padding-inline: 10px; }
	.brandRow { padding-inline: 0; text-align: center; }
	.brand { font-size: 0; }
	.brand::after { content: 'N'; font-size: 24px; }
	.item { justify-content: center; padding: 0; }
	.itemText { display: none; }
	.create { padding: 0; }
	.accountRow { justify-content: center; overflow: visible; }
	.accountMain { min-width: 32px; padding: 0; justify-content: center; }
	.avatar { width: 32px; height: 32px; }
	.accountText { display: none; }
	.accountMoreButton { width: 24px; min-width: 24px; margin-right: 0; font-size: 16px; }
}
</style>
