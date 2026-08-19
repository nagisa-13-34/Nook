<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div>
	<XWidgets
		:edit="editMode"
		:widgets="widgets"
		@addWidget="addWidget"
		@removeWidget="removeWidget"
		@updateWidget="updateWidget"
		@updateWidgets="updateWidgets"
		@exit="editMode = false"
	/>

	<button v-if="editMode" class="_textButton" style="font-size: 0.9em;" @click="editMode = false"><i class="ti ti-check"></i> {{ i18n.ts.editWidgetsExit }}</button>
	<button v-else class="_textButton" data-testid="widget-edit" :class="$style.edit" style="font-size: 0.9em; margin-top: 16px;" @click="editMode = true"><i class="ti ti-pencil"></i> {{ i18n.ts.editWidgets }}</button>
</div>
</template>

<script lang="ts">
import { computed, ref } from 'vue';
const editMode = ref(false);
</script>

<script lang="ts" setup>
import type { DefaultStoredWidget, Widget } from '@/components/MkWidgets.vue';
import XWidgets from '@/components/MkWidgets.vue';
import { i18n } from '@/i18n.js';
import { prefer } from '@/preferences.js';

const props = withDefaults(defineProps<{
	// null = 全てのウィジェットを表示
	// left = place: leftだけを表示
	// right = rightとnullを表示
	place?: 'left' | null | 'right';
}>(), {
	place: null,
});

function isNookVisibleWidget(widget: DefaultStoredWidget | Widget): boolean {
	// Nook has a dedicated notifications page in the main navigation, so the
	// old notifications widget is intentionally hidden to keep the side area quiet.
	return widget.name !== 'notifications';
}

const widgets = computed(() => {
	const visibleWidgets = prefer.r.widgets.value.filter(isNookVisibleWidget);
	if (props.place === null) return visibleWidgets;
	if (props.place === 'left') return visibleWidgets.filter(w => w.place === 'left');
	return visibleWidgets.filter(w => w.place !== 'left');
});

function addWidget(widget: Widget) {
	if (!isNookVisibleWidget(widget)) return;
	prefer.commit('widgets', [{
		...widget,
		place: props.place,
	}, ...prefer.s.widgets]);
}

function removeWidget(widget: Widget) {
	prefer.commit('widgets', prefer.s.widgets.filter(w => w.id !== widget.id));
}

function updateWidget(widget: { id: Widget['id']; data: Widget['data']; }) {
	prefer.commit('widgets', prefer.s.widgets.map(w => w.id === widget.id ? {
		...w,
		data: widget.data,
		place: props.place,
	} : w));
}

function updateWidgets(thisWidgets: Widget[]) {
	if (props.place === null) {
		prefer.commit('widgets', thisWidgets.filter(isNookVisibleWidget) as DefaultStoredWidget[]);
		return;
	}

	if (props.place === 'left') {
		prefer.commit('widgets', [
			...thisWidgets.filter(isNookVisibleWidget).map(w => ({ ...w, place: 'left' })),
			...prefer.s.widgets.filter(w => w.place !== 'left' && !thisWidgets.some(t => w.id === t.id)),
		]);
		return;
	}

	prefer.commit('widgets', [
		...prefer.s.widgets.filter(w => w.place === 'left' && !thisWidgets.some(t => w.id === t.id)),
		...thisWidgets.filter(isNookVisibleWidget).map(w => ({ ...w, place: 'right' })),
	]);
}
</script>

<style lang="scss" module>
.edit {
	width: 100%;
}
</style>
