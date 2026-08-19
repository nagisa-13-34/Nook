<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<SearchMarker path="/settings/preferences" :label="i18n.ts.preferences" :keywords="['general', 'preferences']" icon="ti ti-adjustments">
	<div class="_gaps_m">
		<MkFolder :defaultOpen="true">
			<template #label><SearchLabel>{{ i18n.ts.general }}</SearchLabel></template>
			<template #icon><SearchIcon><i class="ti ti-settings"></i></SearchIcon></template>

			<div class="_gaps_m">
				<MkSelect v-model="lang" :items="langs.map(x => ({ label: x[1], value: x[0] }))">
					<template #label><SearchLabel>{{ i18n.ts.uiLanguage }}</SearchLabel></template>
				</MkSelect>

				<MkRadios
					v-model="overridedDeviceKind"
					:options="[
						{ value: null, label: i18n.ts.auto },
						{ value: 'smartphone', label: i18n.ts.smartphone, icon: 'ti ti-device-mobile' },
						{ value: 'tablet', label: i18n.ts.tablet, icon: 'ti ti-device-tablet' },
						{ value: 'desktop', label: i18n.ts.desktop, icon: 'ti ti-device-desktop' },
					]"
				>
					<template #label><SearchLabel>{{ i18n.ts.overridedDeviceKind }}</SearchLabel></template>
				</MkRadios>

				<MkSwitch v-model="realtimeMode">
					<template #label><SearchLabel>{{ i18n.ts.realtimeMode }}</SearchLabel></template>
				</MkSwitch>

				<MkSwitch v-model="showTitlebar">
					<template #label><SearchLabel>{{ i18n.ts.showTitlebar }}</SearchLabel></template>
				</MkSwitch>

				<MkSwitch v-model="enableInfiniteScroll">
					<template #label><SearchLabel>{{ i18n.ts.enableInfiniteScroll }}</SearchLabel></template>
				</MkSwitch>

				<MkSwitch v-model="reduceAnimation">
					<template #label><SearchLabel>{{ i18n.ts.reduceUiAnimation }}</SearchLabel></template>
				</MkSwitch>
			</div>
		</MkFolder>

		<MkFolder>
			<template #label><SearchLabel>投稿と表示</SearchLabel></template>
			<template #icon><SearchIcon><i class="ti ti-message"></i></SearchIcon></template>

			<div class="_gaps_m">
				<MkSwitch v-model="showFixedPostForm">
					<template #label><SearchLabel>{{ i18n.ts.showFixedPostForm }}</SearchLabel></template>
				</MkSwitch>

				<MkSwitch v-model="showNoteActionsOnlyHover">
					<template #label><SearchLabel>{{ i18n.ts.showNoteActionsOnlyHover }}</SearchLabel></template>
				</MkSwitch>

				<MkSwitch v-model="showReactionsCount">
					<template #label><SearchLabel>{{ i18n.ts.showReactionsCount }}</SearchLabel></template>
				</MkSwitch>

				<MkSwitch v-model="alwaysConfirmFollow">
					<template #label><SearchLabel>{{ i18n.ts.alwaysConfirmFollow }}</SearchLabel></template>
				</MkSwitch>

				<MkSwitch v-model="highlightSensitiveMedia">
					<template #label><SearchLabel>{{ i18n.ts.highlightSensitiveMedia }}</SearchLabel></template>
				</MkSwitch>

				<MkSwitch v-model="confirmWhenRevealingSensitiveMedia">
					<template #label><SearchLabel>{{ i18n.ts.confirmWhenRevealingSensitiveMedia }}</SearchLabel></template>
				</MkSwitch>
			</div>
		</MkFolder>

		<MkFolder>
			<template #label><SearchLabel>{{ i18n.ts.chat }}</SearchLabel></template>
			<template #icon><SearchIcon><i class="ti ti-messages"></i></SearchIcon></template>

			<div class="_gaps_m">
				<MkSwitch v-model="chatShowSenderName">
					<template #label><SearchLabel>{{ i18n.ts._settings._chat.showSenderName }}</SearchLabel></template>
				</MkSwitch>

				<MkSwitch v-model="chatSendOnEnter">
					<template #label><SearchLabel>{{ i18n.ts._settings._chat.sendOnEnter }}</SearchLabel></template>
				</MkSwitch>
			</div>
		</MkFolder>

		<MkFolder>
			<template #label><SearchLabel>{{ i18n.ts.emoji }}</SearchLabel></template>
			<template #icon><SearchIcon><i class="ti ti-mood-smile"></i></SearchIcon></template>

			<MkRadios
				v-model="emojiStyle"
				:options="[
					{ value: 'native', label: i18n.ts.native },
					{ value: 'fluentEmoji', label: 'Fluent Emoji' },
					{ value: 'twemoji', label: 'Twemoji' },
				]"
			>
				<template #label><SearchLabel>{{ i18n.ts.emojiStyle }}</SearchLabel></template>
			</MkRadios>
		</MkFolder>
	</div>
</SearchMarker>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { langs } from '@@/js/config.js';
import MkSwitch from '@/components/MkSwitch.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkRadios from '@/components/MkRadios.vue';
import MkFolder from '@/components/MkFolder.vue';
import { store } from '@/store.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { miLocalStorage } from '@/local-storage.js';
import { prefer } from '@/preferences.js';
import { suggestReload } from '@/utility/reload-suggest.js';

const lang = ref(miLocalStorage.getItem('lang'));
const realtimeMode = store.model('realtimeMode');
const overridedDeviceKind = prefer.model('overridedDeviceKind');
const showTitlebar = prefer.model('showTitlebar');
const enableInfiniteScroll = prefer.model('enableInfiniteScroll');
const reduceAnimation = prefer.model('animation', v => !v, v => !v);
const showFixedPostForm = prefer.model('showFixedPostForm');
const showNoteActionsOnlyHover = prefer.model('showNoteActionsOnlyHover');
const showReactionsCount = prefer.model('showReactionsCount');
const alwaysConfirmFollow = prefer.model('alwaysConfirmFollow');
const highlightSensitiveMedia = prefer.model('highlightSensitiveMedia');
const confirmWhenRevealingSensitiveMedia = prefer.model('confirmWhenRevealingSensitiveMedia');
const chatShowSenderName = prefer.model('chat.showSenderName');
const chatSendOnEnter = prefer.model('chat.sendOnEnter');
const emojiStyle = prefer.model('emojiStyle');

watch(lang, () => {
	if (lang.value == null) return;
	miLocalStorage.setItem('lang', lang.value);
	suggestReload();
});

watch([overridedDeviceKind, emojiStyle], () => {
	suggestReload();
});

definePage(() => ({
	title: i18n.ts.preferences,
	icon: 'ti ti-adjustments',
}));
</script>
