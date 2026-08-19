<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions" :tabs="[]">
	<div class="_spacer" style="--MI_SPACER-w: 800px;">
		<div :class="$style.root">
			<form :class="$style.searchForm" @submit.prevent="search">
				<MkInput
					v-model="inputQuery"
					large
					autofocus
					type="search"
					placeholder="投稿、ユーザー、ネスト、イベントを検索"
				>
					<template #prefix><i class="ti ti-search"></i></template>
				</MkInput>
				<MkButton
					type="submit"
					large
					primary
					gradate
					:disabled="inputQuery.trim() === ''"
				>
					検索
				</MkButton>
			</form>

			<template v-if="submittedQuery !== ''">
				<nav :class="$style.tabs" aria-label="検索結果">
					<button
						v-for="item in resultTabs"
						:key="item.key"
						class="_button"
						:class="[$style.tab, { [$style.activeTab]: tab === item.key }]"
						:aria-current="tab === item.key ? 'page' : undefined"
						@click="selectTab(item.key)"
					>
						<i :class="item.icon"></i>
						<span>{{ item.title }}</span>
					</button>
				</nav>

				<div :class="$style.results">
					<XSearchResults :query="submittedQuery" :tab="tab"/>
				</div>
			</template>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { useRouter } from '@/router.js';
import MkInput from '@/components/MkInput.vue';
import MkButton from '@/components/MkButton.vue';

type SearchResultTab = 'note' | 'user' | 'nest' | 'event';
type SearchDiscoverTab = SearchResultTab | 'featured' | 'discoverUsers';

const props = withDefaults(defineProps<{
	query?: string,
	userId?: string,
	username?: string,
	host?: string | null,
	type?: SearchDiscoverTab,
	origin?: 'combined' | 'local' | 'remote',
	ignoreNotesSearchAvailable?: boolean,
}>(), {
	query: '',
	userId: undefined,
	username: undefined,
	host: undefined,
	type: 'note',
	origin: 'combined',
	ignoreNotesSearchAvailable: false,
});

const router = useRouter();
const XSearchResults = defineAsyncComponent(() => import('./search.results.vue'));

function normalizeTab(value: SearchDiscoverTab | undefined): SearchResultTab {
	if (value === 'user' || value === 'nest' || value === 'event') return value;
	return 'note';
}

const inputQuery = ref(props.query ?? '');
const submittedQuery = ref((props.query ?? '').trim());
const tab = ref<SearchResultTab>(normalizeTab(props.type));

watch(() => props.query, value => {
	inputQuery.value = value ?? '';
	submittedQuery.value = (value ?? '').trim();
});

watch(() => props.type, value => {
	tab.value = normalizeTab(value);
});

const headerActions = computed(() => []);
const resultTabs: Array<{ key: SearchResultTab; title: string; icon: string }> = [{
	key: 'note',
	title: i18n.ts.notes,
	icon: 'ti ti-pencil',
}, {
	key: 'user',
	title: i18n.ts.users,
	icon: 'ti ti-user-search',
}, {
	key: 'nest',
	title: i18n.ts.nookCommunity,
	icon: 'ti ti-users-group',
}, {
	key: 'event',
	title: 'イベント',
	icon: 'ti ti-calendar-event',
}];

function syncUrl() {
	if (submittedQuery.value === '') return;
	router.replace('/search', {
		query: {
			q: submittedQuery.value,
			type: tab.value,
		},
	});
}

function search() {
	const query = inputQuery.value.trim();
	if (query === '') {
		submittedQuery.value = '';
		return;
	}

	submittedQuery.value = query;
	syncUrl();
}

function selectTab(nextTab: SearchResultTab) {
	tab.value = nextTab;
	syncUrl();
}

definePage(() => ({
	title: i18n.ts.nookSearchDiscover,
	icon: 'ti ti-search',
}));
</script>

<style lang="scss" module>
.root {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 18px 0;
}

.searchForm {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 10px;
	align-items: end;
}

.tabs {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	background: var(--MI_THEME-panel);
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 8px;
	overflow: hidden;
}

.tab {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 7px;
	min-height: 44px;
	padding: 0 12px;
	color: var(--MI_THEME-fg);
	font-weight: 650;
}

.tab + .tab {
	border-left: 1px solid var(--MI_THEME-divider);
}

.tab:hover {
	background: var(--MI_THEME-panelHighlight);
}

.activeTab {
	color: var(--MI_THEME-accent);
	background: var(--MI_THEME-accentedBg);
}

.activeTab::after {
	content: '';
	position: absolute;
	left: 12px;
	right: 12px;
	bottom: 0;
	height: 2px;
	background: var(--MI_THEME-accent);
}

.results {
	min-width: 0;
}

@media (max-width: 600px) {
	.root {
		padding: 12px 0;
	}

	.searchForm {
		grid-template-columns: 1fr;
	}

	.tabs {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.tab {
		min-height: 42px;
		padding-inline: 6px;
		font-size: 13px;
	}

	.tab:nth-child(3),
	.tab:nth-child(4) {
		border-top: 1px solid var(--MI_THEME-divider);
	}

	.tab:nth-child(3) {
		border-left: 0;
	}
}
</style>
