<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader v-model:tab="tab" :tabs="headerTabs" :actions="headerActions" :swipable="true">
	<div v-if="user">
		<XHome v-if="tab === 'home'" :user="user" @showMoreFiles="() => { tab = 'files'; }"/>
		<XNotes v-else-if="tab === 'posts' || tab === 'media' || tab === 'videos'" :user="user" :filter="noteFilter"/>
		<XGallery v-else-if="tab === 'works'" :user="user"/>
		<XFiles v-else-if="tab === 'files'" :user="user"/>
		<XActivity v-else-if="tab === 'activity'" :user="user"/>
		<XAchievements v-else-if="tab === 'achievements'" :user="user"/>
		<XReactions v-else-if="tab === 'reactions'" :user="user"/>
		<XClips v-else-if="tab === 'clips'" :user="user"/>
		<XLists v-else-if="tab === 'lists'" :user="user"/>
		<XPages v-else-if="tab === 'pages'" :user="user"/>
		<XFlashs v-else-if="tab === 'flashs'" :user="user"/>
		<XRaw v-else-if="tab === 'raw'" :user="user"/>
	</div>
	<MkError v-else-if="error" @retry="fetchUser()"/>
	<MkLoading v-else/>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, computed, watch, ref } from 'vue';
import * as Misskey from 'misskey-js';
import { acct as getAcct } from '@/filters/user.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { definePage } from '@/page.js';
import { i18n } from '@/i18n.js';
import { $i } from '@/i.js';
import { serverContext, assertServerContext } from '@/server-context.js';

const XHome = defineAsyncComponent(() => import('./home.vue'));
const XNotes = defineAsyncComponent(() => import('./notes.vue'));
const XFiles = defineAsyncComponent(() => import('./files.vue'));
const XActivity = defineAsyncComponent(() => import('./activity.vue'));
const XAchievements = defineAsyncComponent(() => import('./achievements.vue'));
const XReactions = defineAsyncComponent(() => import('./reactions.vue'));
const XClips = defineAsyncComponent(() => import('./clips.vue'));
const XLists = defineAsyncComponent(() => import('./lists.vue'));
const XPages = defineAsyncComponent(() => import('./pages.vue'));
const XFlashs = defineAsyncComponent(() => import('./flashs.vue'));
const XGallery = defineAsyncComponent(() => import('./gallery.vue'));
const XRaw = defineAsyncComponent(() => import('./raw.vue'));

// contextは非ログイン状態の情報しかないためログイン時は利用できない
const CTX_USER = !$i && assertServerContext(serverContext, 'user') ? serverContext.user : null;

const props = withDefaults(defineProps<{
	acct: string;
	page?: string;
}>(), {
	page: 'home',
});

function normalizeTab(page: string): string {
	if (page === 'notes') return 'posts';
	if (page === 'gallery') return 'works';
	return page;
}

const tab = ref(normalizeTab(props.page));
const noteFilter = computed<'posts' | 'media' | 'videos'>(() => tab.value === 'media' ? 'media' : tab.value === 'videos' ? 'videos' : 'posts');

const user = ref<null | Misskey.entities.UserDetailed>(CTX_USER);
const error = ref<any>(null);

function fetchUser(): void {
	if (props.acct == null) return;

	const { username, host } = Misskey.acct.parse(props.acct);

	if (CTX_USER && CTX_USER.username === username && CTX_USER.host === host) {
		user.value = CTX_USER;
		return;
	}

	user.value = null;
	misskeyApi('users/show', {
		username,
		host,
	}).then(u => {
		user.value = u;
	}).catch(err => {
		error.value = err;
	});
}

watch(() => props.acct, fetchUser, {
	immediate: true,
});

watch(() => props.page, (page) => {
	tab.value = normalizeTab(page);
});

const headerActions = computed(() => []);

const headerTabs = computed(() => user.value ? [{
	key: 'home',
	title: i18n.ts.overview,
	icon: 'ti ti-home',
}, {
	key: 'posts',
	title: i18n.ts.nookPosts,
	icon: 'ti ti-pencil',
}, {
	key: 'media',
	title: i18n.ts.nookMedia,
	icon: 'ti ti-photo',
}, {
	key: 'videos',
	title: i18n.ts.nookVideos,
	icon: 'ti ti-video',
}, ...(($i && ($i.id === user.value.id || $i.isAdmin || $i.isModerator)) || user.value.publicReactions ? [{
	key: 'reactions',
	title: i18n.ts.reaction,
	icon: 'ti ti-mood-happy',
}] : [])] : []);

definePage(() => ({
	title: i18n.ts.user,
	icon: 'ti ti-user',
	...user.value ? {
		title: user.value.name ? `${user.value.name} (@${user.value.username})` : `@${user.value.username}`,
		subtitle: `@${getAcct(user.value)}`,
		userName: user.value,
		avatar: user.value,
		path: `/@${user.value.username}`,
		share: {
			title: user.value.name,
		},
	} : {},
}));
</script>
