<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="[$style.root, acrylic ? $style.acrylic : null]">
	<div :class="$style.body">
		<MkA :class="$style.brand" to="/" exact>Nook</MkA>

		<div :class="$style.mainNav">
			<MkA v-tooltip="i18n.ts.home" :class="$style.item" :activeClass="$style.active" to="/" exact>
				<i :class="$style.itemIcon" class="ti ti-home"></i>
			</MkA>
			<MkA v-tooltip="i18n.ts.nookSearchDiscover" :class="$style.item" :activeClass="$style.active" to="/search">
				<i :class="$style.itemIcon" class="ti ti-search"></i>
			</MkA>
			<MkA v-if="$i" v-tooltip="i18n.ts.notifications" :class="$style.item" :activeClass="$style.active" to="/my/notifications">
				<i :class="$style.itemIcon" class="ti ti-bell"></i>
				<span v-if="$i.hasUnreadNotification" :class="$style.indicator"><i class="_indicatorCircle"></i></span>
			</MkA>
			<MkA v-if="$i" v-tooltip="i18n.ts.nookBookmarks" :class="$style.item" :activeClass="$style.active" to="/my/favorites">
				<i :class="$style.itemIcon" class="ti ti-bookmark"></i>
			</MkA>
			<MkA v-tooltip="i18n.ts.nookCommunity" :class="$style.item" :activeClass="$style.active" to="/channels">
				<i :class="$style.itemIcon" class="ti ti-users-group"></i>
			</MkA>
			<MkA v-if="$i && $i.policies.chatAvailability !== 'unavailable'" v-tooltip="i18n.ts.chat" :class="$style.item" :activeClass="$style.active" to="/chat">
				<i :class="$style.itemIcon" class="ti ti-messages"></i>
				<span v-if="$i.hasUnreadChatMessages" :class="$style.indicator"><i class="_indicatorCircle"></i></span>
			</MkA>
		</div>

		<div :class="$style.right">
			<MkA v-if="$i && ($i.isAdmin || $i.isModerator)" v-tooltip="i18n.ts.controlPanel" :class="$style.item" :activeClass="$style.active" to="/admin">
				<i :class="$style.itemIcon" class="ti ti-dashboard"></i>
			</MkA>
			<MkA v-tooltip="i18n.ts.settings" :class="$style.item" :activeClass="$style.active" to="/settings">
				<i :class="$style.itemIcon" class="ti ti-settings"></i>
			</MkA>
			<button v-if="$i" :class="[$style.item, $style.account]" class="_button" @click="openAccountMenu">
				<MkAvatar :user="$i" :class="$style.avatar"/>
			</button>
			<button v-tooltip="i18n.ts.create" :class="$style.postButton" class="_button" data-testid="open-post-form" @click="os.post()">
				<i class="ti ti-plus"></i>
			</button>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { getAccountMenu } from '@/accounts.js';
import { $i } from '@/i.js';

defineProps<{ acrylic?: boolean }>();

async function openAccountMenu(ev: PointerEvent) {
	const menuItems = await getAccountMenu({ withExtraOperation: false });
	os.popupMenu(menuItems, ev.currentTarget ?? ev.target);
}
</script>

<style lang="scss" module>
.root { --height: 58px; --nook-blue: #175cd3; --nook-yellow: #ffd84d; --nook-ink: #17324d; --nook-border: #d7e3f1; position: sticky; top: 0; z-index: 1000; width: 100%; height: var(--height); background: #fff; border-bottom: 1px solid var(--nook-border); color: var(--nook-ink); }
.acrylic { background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(10px); }
.body { height: 100%; display: flex; align-items: center; padding: 0 12px; box-sizing: border-box; overflow-x: auto; white-space: nowrap; }
.brand { padding: 0 12px 0 4px; font-size: 21px; font-weight: 850; letter-spacing: -0.05em; color: var(--nook-blue); text-decoration: none; }
.mainNav, .right { display: flex; align-items: center; }
.right { margin-left: auto; }
.item { position: relative; width: 44px; height: 44px; display: grid; place-items: center; border-radius: 8px; color: var(--nook-ink); text-decoration: none; }
.item:hover { background: #f7faff; }
.active { color: var(--nook-blue); background: #eef5ff; }
.itemIcon { font-size: 20px; }
.indicator { position: absolute; top: 8px; right: 8px; color: var(--nook-yellow); font-size: 7px; }
.account { padding: 0; }
.avatar { width: 30px; height: 30px; }
.postButton { width: 40px; height: 40px; margin-left: 6px; border: 1px solid #e4bd29; border-radius: 8px; background: var(--nook-yellow); color: var(--nook-ink); font-size: 19px; }
@media (max-width: 720px) { .brand { display: none; } .item { width: 40px; } }
</style>
