<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<aside :class="$style.root" aria-label="発見">
	<form :class="$style.search" @submit.prevent="submitSearch">
		<i class="ti ti-search" aria-hidden="true"></i>
		<input
			v-model="searchQuery"
			type="search"
			placeholder="検索"
			aria-label="検索"
			autocomplete="off"
		/>
	</form>

	<section :class="$style.section">
		<div :class="$style.sectionHeader">
			<h2>トレンド</h2>
		</div>

		<div v-if="loadingTrends" :class="$style.state">読み込み中...</div>
		<div v-else-if="trends.length === 0" :class="$style.state">トレンドはまだありません</div>
		<div v-else :class="$style.trendList">
			<MkA
				v-for="trend in trends"
				:key="trend.tag"
				:to="`/tags/${encodeURIComponent(trend.tag)}`"
				:class="$style.trend"
			>
				<strong>#{{ trend.tag }}</strong>
				<span>{{ trend.usersCount }}人が話題にしています</span>
			</MkA>
		</div>
	</section>

	<section :class="$style.section">
		<div :class="$style.sectionHeader">
			<h2>おすすめユーザー</h2>
			<MkA to="/search?type=discoverUsers">もっと見る</MkA>
		</div>

		<div v-if="loadingUsers" :class="$style.state">読み込み中...</div>
		<div v-else-if="recommendedUsers.length === 0" :class="$style.state">おすすめはまだありません</div>
		<div v-else :class="$style.userList">
			<MkA
				v-for="user in recommendedUsers"
				:key="user.id"
				:to="userPage(user)"
				:class="$style.user"
			>
				<MkAvatar :class="$style.avatar" :user="user" indicator/>
				<div :class="$style.userText">
					<MkUserName :class="$style.userName" :user="user"/>
					<span :class="$style.userAcct"><MkAcct :user="user"/></span>
				</div>
				<i class="ti ti-chevron-right" :class="$style.chevron" aria-hidden="true"></i>
			</MkA>
		</div>
	</section>
</aside>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import * as Misskey from 'misskey-js';
import { mainRouter } from '@/router.js';
import { misskeyApi, misskeyApiGet } from '@/utility/misskey-api.js';
import { userPage } from '@/filters/user.js';

const searchQuery = ref('');
const trends = ref<Misskey.entities.HashtagsTrendResponse>([]);
const recommendedUsers = ref<Misskey.entities.UserDetailed[]>([]);
const loadingTrends = ref(true);
const loadingUsers = ref(true);

function submitSearch() {
	const query = searchQuery.value.trim();
	if (query === '') {
		mainRouter.pushByPath('/search');
		return;
	}

	mainRouter.push('/search', {
		query: {
			q: query,
			type: 'note',
		},
	});
}

async function loadTrends() {
	try {
		const response = await misskeyApiGet('hashtags/trend');
		trends.value = response.slice(0, 5);
	} catch (error) {
		console.error('Failed to load Nook home trends', error);
	} finally {
		loadingTrends.value = false;
	}
}

async function loadRecommendedUsers() {
	try {
		recommendedUsers.value = await misskeyApi('users/recommendation', {
			limit: 5,
		});
	} catch (error) {
		console.error('Failed to load Nook recommended users', error);
	} finally {
		loadingUsers.value = false;
	}
}

onMounted(() => {
	void loadTrends();
	void loadRecommendedUsers();
});
</script>

<style lang="scss" module>
.root {
	display: flex;
	flex-direction: column;
	gap: 16px;
	width: 320px;
	box-sizing: border-box;
	color: var(--nook-blue-deep);
}

.search {
	display: flex;
	align-items: center;
	gap: 10px;
	height: 44px;
	padding: 0 14px;
	box-sizing: border-box;
	background: var(--nook-white);
	border: solid 1px var(--nook-border);
	border-radius: 10px;

	> i {
		font-size: 18px;
		color: var(--nook-muted);
	}

	> input {
		min-width: 0;
		width: 100%;
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--nook-blue-deep);
		font: inherit;

		&::placeholder {
			color: var(--nook-muted);
			opacity: 1;
		}
	}

	&:focus-within {
		border-color: var(--nook-blue);
	}
}

.section {
	background: var(--nook-white);
	border: solid 1px var(--nook-border);
	border-radius: 10px;
	overflow: clip;
}

.sectionHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 14px 16px 10px;

	> h2 {
		margin: 0;
		font-size: 16px;
		font-weight: 700;
	}

	> a {
		font-size: 12px;
		font-weight: 600;
		color: var(--nook-blue);
	}
}

.state {
	padding: 18px 16px 20px;
	font-size: 13px;
	color: var(--nook-muted);
}

.trendList,
.userList {
	display: flex;
	flex-direction: column;
}

.trend {
	display: flex;
	flex-direction: column;
	gap: 3px;
	padding: 10px 16px;
	border-top: solid 1px var(--nook-border);
	color: inherit;
	text-decoration: none;

	> strong {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 14px;
		font-weight: 650;
	}

	> span {
		font-size: 11px;
		color: var(--nook-muted);
	}

	&:hover {
		background: var(--nook-panel-highlight);
	}
}

.user {
	display: flex;
	align-items: center;
	gap: 10px;
	min-width: 0;
	padding: 11px 14px;
	border-top: solid 1px var(--nook-border);
	color: inherit;
	text-decoration: none;

	&:hover {
		background: var(--nook-panel-highlight);
	}
}

.avatar {
	flex: 0 0 auto;
	width: 40px;
	height: 40px;
}

.userText {
	display: flex;
	flex: 1;
	min-width: 0;
	flex-direction: column;
	gap: 2px;
}

.userName,
.userAcct {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.userName {
	font-size: 14px;
	font-weight: 650;
}

.userAcct {
	font-size: 11px;
	color: var(--nook-muted);
}

.chevron {
	flex: 0 0 auto;
	font-size: 15px;
	color: var(--nook-muted);
}
</style>
