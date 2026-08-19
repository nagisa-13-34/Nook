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

	<section :class="$style.section">
		<div :class="$style.sectionHeader">
			<h2>おすすめネスト</h2>
			<MkA to="/channels">もっと見る</MkA>
		</div>

		<div v-if="loadingNests" :class="$style.state">読み込み中...</div>
		<div v-else-if="recommendedNests.length === 0" :class="$style.state">おすすめはまだありません</div>
		<div v-else :class="$style.nestList">
			<MkA
				v-for="nest in recommendedNests"
				:key="nest.id"
				:to="`/channels/${nest.id}`"
				:class="$style.nest"
			>
				<img v-if="nest.bannerUrl && !nest.isSensitive" :class="$style.nestIcon" :src="nest.bannerUrl" alt="">
				<span v-else :class="$style.nestFallback">{{ initial(nest.name) }}</span>
				<div :class="$style.nestText">
					<strong>{{ nest.name }}</strong>
					<span>{{ nest.usersCount }} メンバー</span>
				</div>
				<i class="ti ti-chevron-right" :class="$style.chevron" aria-hidden="true"></i>
			</MkA>
		</div>
	</section>

	<section :class="$style.section">
		<div :class="$style.sectionHeader">
			<h2>イベント</h2>
		</div>

		<div v-if="loadingEvents" :class="$style.state">読み込み中...</div>
		<div v-else-if="upcomingEvents.length === 0" :class="$style.state">予定されているイベントはありません</div>
		<div v-else :class="$style.eventList">
			<MkA
				v-for="event in upcomingEvents"
				:key="event.id"
				:to="`/channels/${event.communityId}`"
				:class="$style.event"
			>
				<span :class="$style.eventDate">
					<strong>{{ formatEventDay(event.startsAt) }}</strong>
					<small>{{ formatEventTime(event.startsAt) }}</small>
				</span>
				<div :class="$style.eventText">
					<strong>{{ event.title }}</strong>
					<span>{{ event.communityName }}</span>
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
import { nookApi } from '@/nook/community/nook-api.js';

interface JoinedNestRow {
	communityId: string;
	name: string;
}

interface CommunityEvent {
	id: string;
	communityId: string;
	title: string;
	startsAt: string;
	cancelledAt: string | null;
}

interface DiscoveryEvent extends CommunityEvent {
	communityName: string;
}

const searchQuery = ref('');
const trends = ref<Misskey.entities.HashtagsTrendResponse>([]);
const recommendedUsers = ref<Misskey.entities.UserDetailed[]>([]);
const recommendedNests = ref<Misskey.entities.Channel[]>([]);
const upcomingEvents = ref<DiscoveryEvent[]>([]);
const loadingTrends = ref(true);
const loadingUsers = ref(true);
const loadingNests = ref(true);
const loadingEvents = ref(true);

function initial(name: string | null | undefined): string {
	return name?.trim().slice(0, 1).toUpperCase() || 'N';
}

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

function formatEventDay(value: string): string {
	return new Intl.DateTimeFormat('ja-JP', {
		month: 'numeric',
		day: 'numeric',
	}).format(new Date(value));
}

function formatEventTime(value: string): string {
	return new Intl.DateTimeFormat('ja-JP', {
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(value));
}

async function loadTrends() {
	try {
		const response = await misskeyApiGet('hashtags/trend');
		trends.value = response.slice(0, 5);
	} catch (error) {
		console.error('Failed to load Nook discovery trends', error);
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

async function loadNestsAndEvents() {
	let joinedNests: JoinedNestRow[] = [];
	try {
		joinedNests = await nookApi<JoinedNestRow[]>('nook/community/my-list').catch(() => []);
		const joinedIds = new Set(joinedNests.map(nest => nest.communityId));
		const featured = await misskeyApi('channels/featured', {});
		recommendedNests.value = featured
			.filter(nest => !joinedIds.has(nest.id) && !nest.isSensitive)
			.slice(0, 4);
	} catch (error) {
		console.error('Failed to load Nook recommended nests', error);
	} finally {
		loadingNests.value = false;
	}

	try {
		const from = new Date().toISOString();
		const eventGroups = await Promise.all(joinedNests.slice(0, 12).map(async nest => {
			const events = await nookApi<CommunityEvent[]>('nook/community/events/list', {
				communityId: nest.communityId,
				from,
				limit: 5,
			}).catch(() => []);
			return events
				.filter(event => event.cancelledAt == null)
				.map(event => ({ ...event, communityName: nest.name }));
		}));
		upcomingEvents.value = eventGroups
			.flat()
			.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
			.slice(0, 5);
	} catch (error) {
		console.error('Failed to load Nook community events', error);
	} finally {
		loadingEvents.value = false;
	}
}

onMounted(() => {
	void loadTrends();
	void loadRecommendedUsers();
	void loadNestsAndEvents();
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
.userList,
.nestList,
.eventList {
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

.user,
.nest,
.event {
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

.avatar,
.nestIcon,
.nestFallback {
	flex: 0 0 auto;
	width: 40px;
	height: 40px;
}

.nestIcon {
	border-radius: 10px;
	object-fit: cover;
}

.nestFallback {
	display: grid;
	place-items: center;
	border-radius: 10px;
	background: var(--nook-blue-soft);
	color: var(--nook-blue);
	font-weight: 800;
}

.userText,
.nestText,
.eventText {
	display: flex;
	flex: 1;
	min-width: 0;
	flex-direction: column;
	gap: 2px;
}

.userName,
.userAcct,
.nestText > strong,
.nestText > span,
.eventText > strong,
.eventText > span {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.userName,
.nestText > strong,
.eventText > strong {
	font-size: 14px;
	font-weight: 650;
}

.userAcct,
.nestText > span,
.eventText > span {
	font-size: 11px;
	color: var(--nook-muted);
}

.eventDate {
	display: flex;
	width: 44px;
	height: 44px;
	flex: 0 0 auto;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	border-radius: 10px;
	background: var(--nook-blue-soft);
	color: var(--nook-blue);
	line-height: 1.1;
}

.eventDate > strong {
	font-size: 12px;
}

.eventDate > small {
	margin-top: 3px;
	font-size: 9px;
}

.chevron {
	flex: 0 0 auto;
	font-size: 15px;
	color: var(--nook-muted);
}
</style>
