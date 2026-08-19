<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<MkNotesTimeline
		v-if="tab === 'note' && notesPaginator"
		:key="`nook-search-notes:${searchKey}`"
		:paginator="notesPaginator"
	/>

	<div v-else-if="tab === 'user'">
		<MkInfo v-if="!usersSearchAvailable" warn>{{ i18n.ts.usersSearchNotAvailable }}</MkInfo>
		<MkUserList
			v-else-if="usersPaginator"
			:key="`nook-search-users:${searchKey}`"
			:paginator="usersPaginator"
		/>
	</div>

	<MkChannelList
		v-else-if="tab === 'nest' && nestsPaginator"
		:key="`nook-search-nests:${searchKey}`"
		:paginator="nestsPaginator"
	/>

	<section v-else-if="tab === 'event'" :class="$style.events">
		<MkLoading v-if="eventsLoading"/>
		<MkError v-else-if="eventsError" @retry="retryEvents"/>
		<div v-else-if="eventResults.length === 0" :class="$style.empty">
			<i class="ti ti-calendar-off"></i>
			<span>一致するイベントはありません</span>
		</div>
		<div v-else :class="$style.eventList">
			<MkA
				v-for="event in eventResults"
				:key="`${event.communityId}:${event.id}`"
				:to="`/channels/${event.communityId}`"
				:class="$style.eventCard"
			>
				<div :class="$style.eventDate">
					<span>{{ formatEventMonth(event.startsAt) }}</span>
					<strong>{{ formatEventDay(event.startsAt) }}</strong>
				</div>
				<div :class="$style.eventBody">
					<div :class="$style.eventMeta">
						<span>{{ event.communityName }}</span>
						<span>{{ formatEventTime(event.startsAt) }}</span>
					</div>
					<strong :class="$style.eventTitle">{{ event.cancelledAt ? '中止 · ' : '' }}{{ event.title }}</strong>
					<p v-if="event.description" :class="$style.eventDescription">{{ event.description }}</p>
					<div v-if="event.location" :class="$style.eventLocation"><i class="ti ti-map-pin"></i>{{ event.location }}</div>
				</div>
				<i class="ti ti-chevron-right" :class="$style.eventChevron"></i>
			</MkA>
		</div>
	</section>
</div>
</template>

<script lang="ts" setup>
import { markRaw, shallowRef, ref, watch } from 'vue';
import MkNotesTimeline from '@/components/MkNotesTimeline.vue';
import MkUserList from '@/components/MkUserList.vue';
import MkChannelList from '@/components/MkChannelList.vue';
import MkInfo from '@/components/MkInfo.vue';
import { Paginator } from '@/utility/paginator.js';
import { instance } from '@/instance.js';
import { usersSearchAvailable } from '@/utility/check-permissions.js';
import { i18n } from '@/i18n.js';
import { nookApi } from '@/nook/community/nook-api.js';
import type { CommunityEvent } from '@/nook/community/types.js';

type SearchResultTab = 'note' | 'user' | 'nest' | 'event';

interface JoinedNestRow {
	communityId: string;
	name: string;
}

interface SearchableEvent extends CommunityEvent {
	communityName: string;
}

const props = defineProps<{
	query: string;
	tab: SearchResultTab;
}>();

const notesPaginator = shallowRef();
const usersPaginator = shallowRef();
const nestsPaginator = shallowRef();
const searchKey = ref(0);
const eventResults = ref<SearchableEvent[]>([]);
const eventsLoading = ref(false);
const eventsError = ref(false);
let eventSearchGeneration = 0;

function eventMatchesQuery(event: SearchableEvent, needle: string): boolean {
	return [event.title, event.description, event.location, event.communityName]
		.filter((value): value is string => typeof value === 'string')
		.some(value => value.toLocaleLowerCase().includes(needle));
}

async function rebuildEventResults(query: string): Promise<void> {
	const generation = ++eventSearchGeneration;
	if (query === '') {
		eventResults.value = [];
		eventsLoading.value = false;
		eventsError.value = false;
		return;
	}

	eventsLoading.value = true;
	eventsError.value = false;

	try {
		const nests = await nookApi<JoinedNestRow[]>('nook/community/my-list');
		const from = new Date().toISOString();
		const groups = await Promise.all(nests.map(async nest => {
			const events = await nookApi<CommunityEvent[]>('nook/community/events/list', {
				communityId: nest.communityId,
				from,
				limit: 50,
			}).catch(() => []);
			return events.map(event => ({ ...event, communityName: nest.name }));
		}));

		if (generation !== eventSearchGeneration) return;
		const needle = query.toLocaleLowerCase();
		eventResults.value = groups
			.flat()
			.filter(event => eventMatchesQuery(event, needle))
			.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
			.slice(0, 50);
	} catch {
		if (generation !== eventSearchGeneration) return;
		eventResults.value = [];
		eventsError.value = true;
	} finally {
		if (generation === eventSearchGeneration) eventsLoading.value = false;
	}
}

function rebuildResults() {
	const query = props.query.trim();
	if (query === '') {
		notesPaginator.value = null;
		usersPaginator.value = null;
		nestsPaginator.value = null;
		void rebuildEventResults('');
		return;
	}

	notesPaginator.value = markRaw(new Paginator('notes/search', {
		limit: 10,
		params: {
			query,
			...(instance.federation === 'none' || instance.noteSearchableScope === 'local' ? { host: '.' } : {}),
		},
	}));

	usersPaginator.value = markRaw(new Paginator('users/search', {
		limit: 10,
		offsetMode: true,
		params: {
			query,
			origin: instance.federation === 'none' ? 'local' : 'combined',
		},
	}));

	nestsPaginator.value = markRaw(new Paginator('channels/search', {
		limit: 10,
		params: {
			query,
			type: 'nameAndDescription',
		},
	}));

	void rebuildEventResults(query);
	searchKey.value++;
}

function retryEvents(): void {
	void rebuildEventResults(props.query.trim());
}

function formatEventMonth(value: string): string {
	return new Date(value).toLocaleDateString('ja-JP', { month: 'short' });
}

function formatEventDay(value: string): string {
	return new Date(value).toLocaleDateString('ja-JP', { day: 'numeric' });
}

function formatEventTime(value: string): string {
	return new Date(value).toLocaleString('ja-JP', {
		month: 'numeric',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

watch(() => props.query, rebuildResults, { immediate: true });
</script>

<style lang="scss" module>
.root {
	min-width: 0;
}

.events {
	min-width: 0;
}

.eventList {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.eventCard {
	display: grid;
	grid-template-columns: 52px minmax(0, 1fr) auto;
	align-items: center;
	gap: 12px;
	padding: 13px 14px;
	background: var(--MI_THEME-panel);
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 9px;
	color: var(--MI_THEME-fg);
	text-decoration: none;
}

.eventCard:hover {
	background: var(--MI_THEME-panelHighlight);
}

.eventDate {
	display: flex;
	width: 52px;
	height: 52px;
	box-sizing: border-box;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	border-radius: 9px;
	background: var(--MI_THEME-accentedBg);
	color: var(--MI_THEME-accent);
}

.eventDate span {
	font-size: 10px;
	font-weight: 700;
}

.eventDate strong {
	font-size: 20px;
	line-height: 1.1;
}

.eventBody {
	min-width: 0;
}

.eventMeta {
	display: flex;
	gap: 8px;
	margin-bottom: 3px;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 11px;
}

.eventTitle {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 14px;
}

.eventDescription {
	display: -webkit-box;
	overflow: hidden;
	margin: 4px 0 0;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 12px;
	line-height: 1.45;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
}

.eventLocation {
	display: flex;
	align-items: center;
	gap: 4px;
	margin-top: 5px;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 11px;
}

.eventChevron {
	color: var(--MI_THEME-fgTransparentWeak);
}

.empty {
	min-height: 220px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.empty i {
	font-size: 34px;
	color: var(--MI_THEME-accent);
}

@media (max-width: 560px) {
	.eventCard {
		grid-template-columns: 44px minmax(0, 1fr);
		padding: 11px;
	}

	.eventDate {
		width: 44px;
		height: 48px;
	}

	.eventChevron {
		display: none;
	}
}
</style>
