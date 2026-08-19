<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="[]" :tabs="[]" :swipable="false">
	<div :class="$style.page">
		<section :class="$style.hero">
			<div :class="$style.heroIcon"><i class="ti ti-calendar-event"></i></div>
			<div>
				<h1 :class="$style.title">イベント</h1>
				<p :class="$style.description">公開イベントを探したり、自分のイベントを作成できます。</p>
			</div>
		</section>

		<section :class="$style.createPanel">
			<div :class="$style.sectionHeading">
				<div>
					<h2>イベントを作成</h2>
					<p>ここで作るイベントはネストに属さない個人イベントです。</p>
				</div>
			</div>

			<form :class="$style.form" @submit.prevent="createEvent">
				<label :class="$style.field">
					<span>タイトル</span>
					<input v-model="title" required maxlength="160" placeholder="イベント名">
				</label>
				<label :class="[$style.field, $style.full]">
					<span>説明</span>
					<textarea v-model="description" maxlength="12000" placeholder="イベントの内容"></textarea>
				</label>
				<label :class="$style.field">
					<span>場所</span>
					<input v-model="location" maxlength="256" placeholder="オンライン / 会場名など">
				</label>
				<label :class="$style.field">
					<span>定員</span>
					<input v-model="maxAttendees" type="number" min="1" max="100000" placeholder="制限なし">
				</label>
				<label :class="$style.field">
					<span>開始</span>
					<input v-model="startsAt" required type="datetime-local">
				</label>
				<label :class="$style.field">
					<span>終了</span>
					<input v-model="endsAt" type="datetime-local">
				</label>
				<label :class="$style.field">
					<span>公開範囲</span>
					<select v-model="visibility">
						<option value="public">公開</option>
						<option value="unlisted">限定公開</option>
						<option value="private">自分のみ</option>
					</select>
				</label>
				<div :class="$style.field">
					<span>参加範囲</span>
					<div :class="$style.fixedValue">誰でも参加可能</div>
				</div>
				<div :class="$style.formFooter">
					<span v-if="createError" :class="$style.error">{{ createError }}</span>
					<button class="_button" :class="$style.primary" :disabled="creating">{{ creating ? '作成中...' : '作成' }}</button>
				</div>
			</form>
		</section>

		<section :class="$style.listSection">
			<div :class="$style.sectionHeading">
				<div>
					<h2>これからのイベント</h2>
					<p>公開イベントと、あなたが見られるネストイベントを表示します。</p>
				</div>
				<button class="_button" :class="$style.refresh" :disabled="loading" @click="loadEvents"><i class="ti ti-refresh"></i> 更新</button>
			</div>

			<div v-if="loading" :class="$style.state">読み込み中...</div>
			<div v-else-if="events.length === 0" :class="$style.state">予定されているイベントはありません。</div>
			<div v-else :class="$style.eventList">
				<article v-for="event in events" :key="event.id" :class="$style.eventCard">
					<div :class="$style.dateBox">
						<strong>{{ eventDay(event.startsAt) }}</strong>
						<span>{{ eventTime(event.startsAt) }}</span>
					</div>
					<div :class="$style.eventBody">
						<div :class="$style.eventTopline">
							<div :class="$style.badges">
								<span :class="$style.badge">{{ visibilityLabel(event.visibility) }}</span>
								<span v-if="event.communityId" :class="$style.badge">ネストイベント</span>
								<span v-if="event.participation === 'community'" :class="$style.badge">ネスト参加者のみ参加可</span>
								<span v-if="event.cancelledAt" :class="[$style.badge, $style.cancelled]">中止</span>
							</div>
						</div>
						<h3>{{ event.title }}</h3>
						<p v-if="event.description" :class="$style.eventDescription">{{ event.description }}</p>
						<div :class="$style.meta">
							<span><i class="ti ti-clock"></i> {{ eventRange(event) }}</span>
							<span v-if="event.location"><i class="ti ti-map-pin"></i> {{ event.location }}</span>
							<MkA v-if="event.communityId" :to="`/channels/${event.communityId}`"><i class="ti ti-users-group"></i> ネストを見る</MkA>
						</div>
						<div :class="$style.counts">
							<span>✅ {{ event.goingCount }} 参加</span>
							<span>⭐ {{ event.interestedCount }} 興味あり</span>
							<span v-if="event.maxAttendees != null">定員 {{ event.maxAttendees }}</span>
						</div>
						<div v-if="event.cancelledAt == null" :class="$style.actions">
							<button class="_button" :class="[$style.action, { [$style.selected]: event.myResponse === 'going' }]" @click="rsvp(event.id, 'going')">✅ 参加</button>
							<button class="_button" :class="[$style.action, { [$style.selected]: event.myResponse === 'interested' }]" @click="rsvp(event.id, 'interested')">⭐ 興味あり</button>
							<button v-if="event.myResponse" class="_button" :class="$style.action" @click="rsvp(event.id, 'not_going')">取り消す</button>
							<button v-if="event.communityId == null && event.creatorId === $i?.id" class="_button" :class="$style.delete" @click="deleteEvent(event)"><i class="ti ti-trash"></i> 削除</button>
						</div>
						<div v-if="eventErrors[event.id]" :class="$style.error">{{ eventErrors[event.id] }}</div>
					</div>
				</article>
			</div>
		</section>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { $i } from '@/i.js';
import { nookApi } from '@/nook/community/nook-api.js';
import type { NookEvent, NookEventResponse, NookEventVisibility } from '@/nook/community/types.js';
import * as os from '@/os.js';
import { definePage } from '@/page.js';

const events = ref<NookEvent[]>([]);
const loading = ref(true);
const creating = ref(false);
const title = ref('');
const description = ref('');
const location = ref('');
const startsAt = ref('');
const endsAt = ref('');
const maxAttendees = ref('');
const visibility = ref<NookEventVisibility>('public');
const createError = ref('');
const eventErrors = ref<Record<string, string>>({});

function errorMessage(error: unknown): string {
	if (error instanceof Error && error.message) return error.message;
	return '操作に失敗しました。';
}

async function loadEvents(): Promise<void> {
	loading.value = true;
	try {
		events.value = await nookApi<NookEvent[]>('nook/events/list', {
			from: new Date().toISOString(),
			limit: 100,
		});
	} catch (error) {
		events.value = [];
		createError.value = errorMessage(error);
	} finally {
		loading.value = false;
	}
}

async function createEvent(): Promise<void> {
	createError.value = '';
	creating.value = true;
	try {
		await nookApi<{ id: string }>('nook/events/create', {
			communityId: null,
			title: title.value.trim(),
			description: description.value.trim() || null,
			location: location.value.trim() || null,
			startsAt: new Date(startsAt.value).toISOString(),
			endsAt: endsAt.value ? new Date(endsAt.value).toISOString() : null,
			maxAttendees: maxAttendees.value ? Number(maxAttendees.value) : null,
			visibility: visibility.value,
			participation: 'anyone',
		});
		title.value = '';
		description.value = '';
		location.value = '';
		startsAt.value = '';
		endsAt.value = '';
		maxAttendees.value = '';
		visibility.value = 'public';
		await loadEvents();
	} catch (error) {
		createError.value = errorMessage(error);
	} finally {
		creating.value = false;
	}
}

async function rsvp(eventId: string, response: NookEventResponse): Promise<void> {
	eventErrors.value[eventId] = '';
	try {
		await nookApi('nook/events/rsvp', { eventId, response });
		await loadEvents();
	} catch (error) {
		eventErrors.value[eventId] = errorMessage(error);
	}
}

async function deleteEvent(event: NookEvent): Promise<void> {
	const result = await os.confirm({
		type: 'warning',
		text: `「${event.title}」を削除しますか？`,
	});
	if (result.canceled) return;

	eventErrors.value[event.id] = '';
	try {
		await nookApi('nook/events/delete', { eventId: event.id });
		await loadEvents();
	} catch (error) {
		eventErrors.value[event.id] = errorMessage(error);
	}
}

function visibilityLabel(value: NookEventVisibility): string {
	if (value === 'community') return 'ネストのみ';
	if (value === 'unlisted') return '限定公開';
	if (value === 'private') return '自分のみ';
	return '公開';
}

function eventDay(value: string): string {
	return new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric' }).format(new Date(value));
}

function eventTime(value: string): string {
	return new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function eventRange(event: NookEvent): string {
	const start = new Date(event.startsAt).toLocaleString();
	if (event.endsAt == null) return start;
	return `${start} – ${new Date(event.endsAt).toLocaleString()}`;
}

onMounted(() => {
	void loadEvents();
});

definePage(() => ({
	title: 'イベント',
	icon: 'ti ti-calendar-event',
}));
</script>

<style lang="scss" module>
.page {
	--nook-blue: #175cd3;
	--nook-blue-soft: #eef5ff;
	--nook-ink: #17324d;
	--nook-muted: #667a91;
	--nook-border: #d7e3f1;
	width: min(1040px, 100%);
	margin: 0 auto;
	padding: 18px 20px 48px;
	box-sizing: border-box;
	color: var(--nook-ink);
}

.hero,
.createPanel,
.listSection {
	background: var(--MI_THEME-panel);
	border: 1px solid var(--nook-border);
	border-radius: 14px;
}

.hero {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 22px 24px;
	margin-bottom: 16px;
}

.heroIcon {
	display: grid;
	width: 48px;
	height: 48px;
	flex: 0 0 auto;
	place-items: center;
	border-radius: 12px;
	background: var(--nook-blue-soft);
	color: var(--nook-blue);
	font-size: 24px;
}

.title,
.sectionHeading h2,
.eventBody h3 {
	margin: 0;
}

.title {
	font-size: 24px;
	font-weight: 850;
}

.description,
.sectionHeading p {
	margin: 5px 0 0;
	color: var(--nook-muted);
	font-size: 13px;
}

.createPanel,
.listSection {
	padding: 18px;
	margin-bottom: 16px;
}

.sectionHeading {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
	margin-bottom: 14px;
}

.sectionHeading h2 {
	font-size: 17px;
}

.form {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12px;
}

.field {
	display: flex;
	min-width: 0;
	flex-direction: column;
	gap: 6px;
	font-size: 12px;
	font-weight: 700;
}

.full,
.formFooter {
	grid-column: 1 / -1;
}

.field input,
.field textarea,
.field select,
.fixedValue {
	width: 100%;
	min-height: 42px;
	box-sizing: border-box;
	padding: 9px 10px;
	border: 1px solid var(--nook-border);
	border-radius: 9px;
	outline: 0;
	background: var(--MI_THEME-bg);
	color: var(--MI_THEME-fg);
	font: inherit;
	font-weight: 500;
}

.field textarea {
	min-height: 92px;
	resize: vertical;
}

.field input:focus,
.field textarea:focus,
.field select:focus {
	border-color: var(--nook-blue);
}

.fixedValue {
	display: flex;
	align-items: center;
	color: var(--nook-muted);
}

.formFooter {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 12px;
}

.primary,
.refresh,
.action,
.delete {
	min-height: 36px;
	padding: 0 14px;
	border-radius: 8px;
	font-weight: 750;
}

.primary {
	background: var(--nook-blue);
	color: #fff;
}

.refresh,
.action {
	border: 1px solid var(--nook-border);
	background: var(--MI_THEME-panel);
}

.state {
	padding: 34px 18px;
	border: 1px dashed var(--nook-border);
	border-radius: 10px;
	color: var(--nook-muted);
	text-align: center;
}

.eventList {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.eventCard {
	display: grid;
	grid-template-columns: 60px minmax(0, 1fr);
	gap: 14px;
	padding: 16px;
	border: 1px solid var(--nook-border);
	border-radius: 12px;
	background: var(--MI_THEME-bg);
}

.dateBox {
	display: flex;
	width: 60px;
	height: 60px;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	border-radius: 12px;
	background: var(--nook-blue-soft);
	color: var(--nook-blue);
}

.dateBox strong {
	font-size: 14px;
}

.dateBox span {
	margin-top: 3px;
	font-size: 10px;
}

.eventBody {
	min-width: 0;
}

.eventTopline,
.badges,
.meta,
.counts,
.actions {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
}

.badges {
	margin-bottom: 7px;
}

.badge {
	padding: 3px 7px;
	border-radius: 999px;
	background: var(--nook-blue-soft);
	color: var(--nook-blue);
	font-size: 10px;
	font-weight: 750;
}

.cancelled {
	background: color(from var(--MI_THEME-warn) srgb r g b / 0.12);
	color: var(--MI_THEME-warn);
}

.eventBody h3 {
	font-size: 17px;
}

.eventDescription {
	margin: 7px 0;
	white-space: pre-wrap;
	color: var(--MI_THEME-fg);
	font-size: 13px;
}

.meta,
.counts {
	margin-top: 9px;
	color: var(--nook-muted);
	font-size: 11px;
}

.meta a {
	color: var(--nook-blue);
}

.actions {
	margin-top: 12px;
}

.selected {
	border-color: var(--nook-blue);
	background: var(--nook-blue-soft);
	color: var(--nook-blue);
}

.delete {
	margin-left: auto;
	color: var(--MI_THEME-warn);
}

.error {
	color: var(--MI_THEME-error);
	font-size: 12px;
}

.eventBody > .error {
	margin-top: 8px;
}

@media (max-width: 700px) {
	.page {
		padding: 10px 10px 36px;
	}

	.hero {
		padding: 18px;
	}

	.form {
		grid-template-columns: 1fr;
	}

	.full,
	.formFooter {
		grid-column: auto;
	}

	.eventCard {
		grid-template-columns: 48px minmax(0, 1fr);
		padding: 12px;
	}

	.dateBox {
		width: 48px;
		height: 48px;
	}

	.delete {
		margin-left: 0;
	}
}
</style>
