<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader>
	<div class="_spacer" style="--MI_SPACER-w: 800px;">
		<MkPagination :paginator="paginator">
			<template #empty>
				<div :class="$style.empty">
					<i class="ti ti-bookmark" :class="$style.emptyIcon"></i>
					<strong>Bookmarks</strong>
					<span>保存した投稿はここに表示されます。</span>
				</div>
			</template>

			<template #default="{ items }">
				<MkNote v-for="item in items" :key="item.id" :note="item.note" :class="$style.note"/>
			</template>
		</MkPagination>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { markRaw } from 'vue';
import MkPagination from '@/components/MkPagination.vue';
import MkNote from '@/components/MkNote.vue';
import { definePage } from '@/page.js';
import { Paginator } from '@/utility/paginator.js';

const paginator = markRaw(new Paginator('i/favorites', {
	limit: 10,
}));

definePage(() => ({
	title: 'Bookmarks',
	icon: 'ti ti-bookmark',
}));
</script>

<style lang="scss" module>
.note {
	background: var(--MI_THEME-panel);
	border-radius: var(--MI-radius);
}

.empty {
	min-height: 260px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8px;
	color: var(--MI_THEME-fg);
	text-align: center;
}

.emptyIcon {
	margin-bottom: 8px;
	font-size: 42px;
	color: var(--MI_THEME-accent);
}

.empty strong {
	font-size: 18px;
}

.empty span {
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 13px;
}
</style>
