<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<aside v-if="nests.length > 0" :class="$style.rail" aria-label="参加中のネスト">
	<MkA
		v-for="nest in nests"
		:key="nest.communityId"
		v-tooltip.noDelay.right="nest.name"
		:to="`/channels/${nest.communityId}`"
		:aria-label="nest.name"
		:aria-current="nest.communityId === currentCommunityId ? 'page' : undefined"
		:class="[$style.item, { [$style.active]: nest.communityId === currentCommunityId }]"
	>
		<img v-if="nest.bannerUrl" :class="$style.iconImage" :src="nest.bannerUrl" alt="">
		<span v-else :class="$style.fallback">{{ initial(nest.name) }}</span>
	</MkA>
</aside>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { nookApi } from './nook-api.js';
import { misskeyApi } from '@/utility/misskey-api.js';

interface JoinedNestRow {
	communityId: string;
	name: string;
}

interface JoinedNest extends JoinedNestRow {
	bannerUrl: string | null;
}

defineProps<{
	currentCommunityId?: string;
}>();

const nests = ref<JoinedNest[]>([]);

function initial(name: string): string {
	return name.trim().slice(0, 1).toUpperCase() || 'N';
}

async function load(): Promise<void> {
	const rows = await nookApi<JoinedNestRow[]>('nook/community/my-list').catch(() => []);
	nests.value = await Promise.all(rows.map(async row => {
		const channel = await misskeyApi('channels/show', { channelId: row.communityId }).catch(() => null);
		return {
			...row,
			bannerUrl: channel != null && !channel.isSensitive ? channel.bannerUrl ?? null : null,
		};
	}));
}

onMounted(load);
</script>

<style lang="scss" module>
.rail {
	position: sticky;
	top: 12px;
	display: flex;
	width: 64px;
	max-height: calc(100vh - 120px);
	padding: 8px 6px;
	box-sizing: border-box;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	overflow-y: auto;
	background: #fff;
	border: 1px solid #d7e3f1;
	border-radius: 12px;
}

.item {
	position: relative;
	display: grid;
	width: 46px;
	height: 46px;
	flex: 0 0 auto;
	place-items: center;
	border-radius: 14px;
	overflow: hidden;
	background: #eef5ff;
	color: #175cd3;
	text-decoration: none;
	transition: border-radius 0.12s ease, box-shadow 0.12s ease;
}

.item:hover,
.active {
	border-radius: 11px;
}

.active {
	box-shadow: inset 0 0 0 2px #175cd3;
}

.active::before {
	content: '';
	position: absolute;
	z-index: 2;
	left: 0;
	top: 10px;
	bottom: 10px;
	width: 3px;
	border-radius: 0 3px 3px 0;
	background: #175cd3;
}

.iconImage {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.fallback {
	display: grid;
	width: 100%;
	height: 100%;
	place-items: center;
	font-size: 18px;
	font-weight: 850;
}

@media (max-width: 700px) {
	.rail {
		position: static;
		width: 100%;
		max-height: none;
		padding: 7px 10px;
		flex-direction: row;
		justify-content: flex-start;
		overflow-x: auto;
		overflow-y: hidden;
		border-inline: 0;
		border-radius: 0;
	}

	.item {
		width: 42px;
		height: 42px;
	}
}
</style>
