<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<section :class="$style.hero">
		<div>
			<h1>トーク</h1>
			<p>友だちやグループと、気軽にメッセージ。</p>
		</div>
		<MkButton
			v-if="$i.policies.chatAvailability === 'available'"
			primary
			rounded
			:class="$style.start"
			@click="start"
		>
			<i class="ti ti-plus"></i> 新しいトーク
		</MkButton>
	</section>

	<MkInfo v-if="$i.policies.chatAvailability !== 'available'">
		{{ $i.policies.chatAvailability === 'readonly' ? i18n.ts._chat.chatIsReadOnlyForThisAccountOrServer : i18n.ts._chat.chatNotAvailableForThisAccountOrServer }}
	</MkInfo>

	<section :class="$style.searchPanel">
		<MkInput
			v-model="searchQuery"
			placeholder="トーク内を検索"
			type="search"
			@enter="search"
		>
			<template #prefix><i class="ti ti-search"></i></template>
		</MkInput>
		<MkButton v-if="searchQuery.trim().length > 0" rounded @click="search"><i class="ti ti-search"></i> 検索</MkButton>
	</section>

	<section v-if="searched" :class="$style.section">
		<div :class="$style.sectionHeader">
			<strong>検索結果</strong>
			<button class="_button" :class="$style.clearSearch" @click="clearSearch">閉じる</button>
		</div>
		<div v-if="searchResults.length > 0" :class="$style.searchResults">
			<div v-for="message in searchResults" :key="message.id" :class="$style.searchResultItem">
				<XMessage :message="message" :isSearchResult="true"/>
			</div>
		</div>
		<div v-else :class="$style.emptySearch">一致するメッセージはありません。</div>
	</section>

	<section :class="$style.section">
		<div :class="$style.sectionHeader">
			<strong>最近のトーク</strong>
			<span>未読は青いバッジで表示</span>
		</div>
		<MkChatHistories/>
	</section>
</div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import * as Misskey from 'misskey-js';
import XMessage from './XMessage.vue';
import MkButton from '@/components/MkButton.vue';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { ensureSignin } from '@/i.js';
import { useRouter } from '@/router.js';
import * as os from '@/os.js';
import { updateCurrentAccountPartial } from '@/accounts.js';
import MkInput from '@/components/MkInput.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkChatHistories from '@/components/MkChatHistories.vue';

const $i = ensureSignin();
const router = useRouter();

const searchQuery = ref('');
const searched = ref(false);
const searchResults = ref<Misskey.entities.ChatMessage[]>([]);

function start(ev: PointerEvent) {
	os.popupMenu([{
		text: '1対1のトーク',
		caption: 'ユーザーを選んでメッセージを送ります',
		icon: 'ti ti-user-plus',
		action: () => { void startUser(); },
	}, {
		text: 'グループを作る',
		caption: '複数人で使えるトークを作ります',
		icon: 'ti ti-users-plus',
		action: () => { void createRoom(); },
	}], ev.currentTarget ?? ev.target);
}

async function startUser() {
	const user = await os.selectUser({ localOnly: true });
	router.push('/chat/user/:userId', {
		params: {
			userId: user.id,
		},
	});
}

async function createRoom() {
	const { canceled, result } = await os.inputText({
		title: 'グループ名',
		minLength: 1,
	});
	if (canceled) return;

	const room = await misskeyApi('chat/rooms/create', {
		name: result,
	});

	router.push('/chat/room/:roomId', {
		params: {
			roomId: room.id,
		},
	});
}

async function search() {
	const query = searchQuery.value.trim();
	if (query.length === 0) return;

	searchResults.value = await misskeyApi('chat/messages/search', { query });
	searched.value = true;
}

function clearSearch() {
	searched.value = false;
	searchResults.value = [];
}

onMounted(() => {
	updateCurrentAccountPartial({ hasUnreadChatMessages: false });
});
</script>

<style lang="scss" module>
.root {
	--nook-blue: #175cd3;
	--nook-ink: #17324d;
	--nook-soft: #eef5ff;
	--nook-border: #d7e3f1;
	display: grid;
	gap: 14px;
	color: var(--nook-ink);
}

.hero {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 18px;
	padding: 20px;
	background: #fff;
	border: 1px solid var(--nook-border);
	border-radius: 14px;
}

.hero h1,
.hero p {
	margin: 0;
}

.hero h1 {
	font-size: 22px;
	font-weight: 850;
}

.hero p {
	margin-top: 4px;
	color: #667a91;
	font-size: 13px;
}

.start {
	flex: 0 0 auto;
}

.searchPanel {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 8px;
	align-items: center;
	padding: 12px;
	background: #fff;
	border: 1px solid var(--nook-border);
	border-radius: 12px;
}

.section {
	padding: 12px;
	background: #fff;
	border: 1px solid var(--nook-border);
	border-radius: 14px;
}

.sectionHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	min-height: 34px;
	padding: 0 4px 8px;
}

.sectionHeader strong {
	font-size: 14px;
}

.sectionHeader span,
.clearSearch {
	color: #667a91;
	font-size: 11px;
}

.clearSearch:hover {
	color: var(--nook-blue);
}

.searchResults {
	display: grid;
	gap: 8px;
}

.searchResultItem {
	padding: 12px;
	background: #f8fbff;
	border: 1px solid var(--nook-border);
	border-radius: 12px;
}

.emptySearch {
	padding: 24px 12px;
	text-align: center;
	color: #667a91;
}

@media (max-width: 600px) {
	.hero {
		align-items: stretch;
		flex-direction: column;
	}

	.start {
		width: 100%;
	}

	.searchPanel {
		grid-template-columns: 1fr;
	}

	.sectionHeader span {
		display: none;
	}
}
</style>
