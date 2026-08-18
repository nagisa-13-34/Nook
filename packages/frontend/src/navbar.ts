/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { computed, reactive } from 'vue';
import type { ComputedRef } from 'vue';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';

/**
 * Nook intentionally exposes a small, stable set of navigation items.
 * Misskey-compatible routes can continue to exist internally without being
 * presented as first-class Nook features.
 */
export const navbarItemDef = reactive<{
	[key: string]: {
		title: string;
		icon: string;
		show?: ComputedRef<boolean>;
		indicated?: ComputedRef<boolean>;
		indicateValue?: ComputedRef<string>;
		to?: string;
		action?: (ev: PointerEvent) => void;
	};
}>({
	explore: {
		title: i18n.ts.explore,
		icon: 'ti ti-compass',
		to: '/explore',
	},
	search: {
		title: i18n.ts.search,
		icon: 'ti ti-search',
		to: '/search',
	},
	notifications: {
		title: i18n.ts.notifications,
		icon: 'ti ti-bell',
		show: computed(() => $i != null),
		indicated: computed(() => $i != null && $i.hasUnreadNotification),
		indicateValue: computed(() => {
			if (!$i || $i.unreadNotificationsCount === 0) return '';
			return $i.unreadNotificationsCount > 99 ? '99+' : $i.unreadNotificationsCount.toString();
		}),
		to: '/my/notifications',
	},
	favorites: {
		title: i18n.ts.nookBookmarks,
		icon: 'ti ti-bookmark',
		show: computed(() => $i != null),
		to: '/my/favorites',
	},
	channels: {
		title: i18n.ts.nookCommunity,
		icon: 'ti ti-users-group',
		to: '/channels',
	},
	chat: {
		title: i18n.ts.chat,
		icon: 'ti ti-messages',
		to: '/chat',
		show: computed(() => $i != null && $i.policies.chatAvailability !== 'unavailable'),
		indicated: computed(() => $i != null && $i.hasUnreadChatMessages),
	},
	profile: {
		title: i18n.ts.profile,
		icon: 'ti ti-user',
		show: computed(() => $i != null),
		to: `/@${$i?.username}`,
	},
});
