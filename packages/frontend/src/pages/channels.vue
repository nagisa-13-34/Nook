<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader v-model:tab="tab" :actions="headerActions" :tabs="headerTabs" :swipable="true">
	<div class="_spacer" style="--MI_SPACER-w: 1200px;">
		<div :class="$style.pageLayout">
			<NookCommunityRail v-if="$i"/>
			<div :class="$style.content">
				<div v-if="tab === 'featured'">
					<MkPagination v-slot="{items}" :paginator="featuredPaginator">
						<div :class="$style.root">
							<MkChannelPreview v-for="channel in items" :key="channel.id" :channel="channel"/>
						</div>
					</MkPagination>
				</div>
				<div v-else-if="tab === 'favorites'">
					<MkPagination v-slot="{items}" :paginator="favoritesPaginator">
						<div :class="$style.root">
							<MkChannelPreview v-for="channel in items" :key="channel.id" :channel="channel"/>
						</div>
					</MkPagination>
				</div>
				<div v-else-if="tab === 'following'">
					<MkPagination v-slot="{items}" :paginator="followingPaginator">
						<div :class="$style.root">
							<MkChannelPreview v-for="channel in items" :key="channel.id" :channel="channel"/>
						</div>
					</MkPagination>
				</div>
			</div>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, markRaw, ref } from 'vue';
import MkChannelPreview from '@/components/MkChannelPreview.vue';
import MkPagination from '@/components/MkPagination.vue';
import NookCommunityRail from '@/nook/community/NookCommunityRail.vue';
import { definePage } from '@/page.js';
import { i18n } from '@/i18n.js';
import { Paginator } from '@/utility/paginator.js';
import { $i } from '@/i.js';

const tab = ref('featured');
const showDiscoveryTabs = ref(false);

const featuredPaginator = markRaw(new Paginator('channels/featured', { limit: 10, noPaging: true }));
const favoritesPaginator = markRaw(new Paginator('channels/my-favorites', { limit: 100, noPaging: true }));
const followingPaginator = markRaw(new Paginator('channels/followed', { limit: 10 }));

function toggleDiscoveryTabs(): void {
	showDiscoveryTabs.value = !showDiscoveryTabs.value;
}

const headerActions = computed(() => []);
const headerTabs = computed(() => showDiscoveryTabs.value ? [
	{ key: 'featured', title: i18n.ts._channel.featured, icon: 'ti ti-sparkles' },
	{ key: 'favorites', title: 'ブックマーク', icon: 'ti ti-bookmark' },
	{ key: 'following', title: '参加中', icon: 'ti ti-users' },
] : []);

definePage(() => ({
	title: i18n.ts.nookCommunity,
	icon: 'ti ti-users',
	onTitleClick: toggleDiscoveryTabs,
	titleActive: !showDiscoveryTabs.value,
}));
</script>

<style lang="scss" module>
.pageLayout {
	display: flex;
	align-items: flex-start;
	gap: 14px;
}

.content {
	min-width: 0;
	flex: 1;
}

.root { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: var(--MI-margin); }

@media (max-width: 700px) {
	.pageLayout {
		display: block;
	}

	.content {
		margin-top: 10px;
	}
}
</style>
