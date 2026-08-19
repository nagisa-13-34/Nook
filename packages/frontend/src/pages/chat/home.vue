<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader v-model:tab="tab" :actions="headerActions" :tabs="headerTabs" :swipable="true">
	<div class="_spacer" style="--MI_SPACER-w: 900px; --MI_SPACER-min: 12px; --MI_SPACER-max: 24px;">
		<XHome v-if="tab === 'home'"/>
		<XInvitations v-else-if="tab === 'invitations'"/>
		<XJoiningRooms v-else-if="tab === 'joiningRooms'"/>
		<XOwnedRooms v-else-if="tab === 'ownedRooms'"/>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import XHome from './home.home.vue';
import XInvitations from './home.invitations.vue';
import XJoiningRooms from './home.joiningRooms.vue';
import XOwnedRooms from './home.ownedRooms.vue';
import { definePage } from '@/page.js';

const tab = ref('home');

const headerActions = computed(() => []);

const headerTabs = computed(() => [{
	key: 'home',
	title: 'トーク',
	icon: 'ti ti-message-circle',
}, {
	key: 'invitations',
	title: '招待',
	icon: 'ti ti-mail-opened',
}, {
	key: 'joiningRooms',
	title: 'グループ',
	icon: 'ti ti-users-group',
}, {
	key: 'ownedRooms',
	title: 'グループ管理',
	icon: 'ti ti-settings',
}]);

definePage(() => ({
	title: 'Chat',
	icon: 'ti ti-message-circle',
}));
</script>

<style lang="scss" module>
</style>
