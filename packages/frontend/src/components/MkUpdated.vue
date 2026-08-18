<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModal ref="modal" preferType="dialog" :zPriority="'middle'" @click="modal?.close()" @closed="emit('closed')">
	<div :class="$style.root">
		<div :class="$style.brand">Nook</div>
		<div :class="$style.yellowBar"></div>
		<div :class="$style.title">{{ i18n.ts.misskeyUpdated }}</div>
		<div :class="$style.version">v{{ version }}</div>
		<div v-if="isBeta" :class="$style.beta">{{ i18n.ts.thankYouForTestingBeta }}</div>
		<MkButton full @click="whatIsNew">{{ i18n.ts.whatIsNew }}</MkButton>
		<MkButton :class="$style.gotIt" primary full @click="modal?.close()">{{ i18n.ts.gotIt }}</MkButton>
	</div>
</MkModal>
</template>

<script lang="ts" setup>
import { useTemplateRef } from 'vue';
import { version } from '@@/js/config.js';
import MkModal from '@/components/MkModal.vue';
import MkButton from '@/components/MkButton.vue';
import { i18n } from '@/i18n.js';

const modal = useTemplateRef('modal');

const emit = defineEmits<{
	(ev: 'closed'): void;
}>();

const isBeta = version.includes('-beta') || version.includes('-alpha') || version.includes('-rc');

function whatIsNew() {
	modal.value?.close();
	window.open('https://github.com/Nagisa-13-34/Nook/releases', '_blank');
}
</script>

<style lang="scss" module>
.root {
	margin: auto;
	position: relative;
	padding: 30px;
	min-width: 320px;
	max-width: 460px;
	box-sizing: border-box;
	text-align: left;
	background: #fff;
	color: #17324d;
	border: solid 1px #d7e3f1;
	border-top: solid 5px #175cd3;
	border-radius: 8px;
	box-shadow: none;
}

.brand {
	font-size: 28px;
	font-weight: 850;
	line-height: 1;
	letter-spacing: -0.055em;
	color: #175cd3;
}

.yellowBar {
	width: 42px;
	height: 5px;
	margin: 15px 0 22px;
	border-radius: 2px;
	background: #ffd84d;
}

.title {
	font-size: 20px;
	font-weight: 750;
}

.version {
	margin: 7px 0 22px;
	font-size: 13px;
	opacity: 0.6;
}

.beta {
	margin: 0 0 18px;
}

.gotIt {
	margin: 8px 0 0;
}
</style>
