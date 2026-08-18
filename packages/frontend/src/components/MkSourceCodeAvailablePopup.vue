<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<div :class="$style.icon">
		<i class="ti ti-code"></i>
	</div>
	<div :class="$style.main">
		<div :class="$style.title">Nookのソースコード</div>
		<div :class="$style.text">
			Nookの対応するソースコードを公開しています。
			<div :class="$style.linkRow">
				<MkA to="/about-misskey" class="_link">ソースコードを見る</MkA>
			</div>
		</div>
		<div class="_buttons">
			<MkButton @click="close">{{ i18n.ts.gotIt }}</MkButton>
		</div>
	</div>
	<button class="_button" :class="$style.close" @click="close"><i class="ti ti-x"></i></button>
</div>
</template>

<script lang="ts" setup>
import MkButton from '@/components/MkButton.vue';
import { i18n } from '@/i18n.js';
import { miLocalStorage } from '@/local-storage.js';
import * as os from '@/os.js';

const emit = defineEmits<{
	(ev: 'closed'): void;
}>();

const zIndex = os.claimZIndex('low');

function close() {
	miLocalStorage.setItem('modifiedVersionMustProminentlyOfferInAgplV3Section13Read', 'true');
	emit('closed');
}
</script>

<style lang="scss" module>
.root {
	position: fixed;
	z-index: v-bind(zIndex);
	bottom: var(--MI-margin);
	left: 0;
	right: 0;
	margin: auto;
	box-sizing: border-box;
	width: calc(100% - (var(--MI-margin) * 2));
	max-width: 480px;
	display: flex;
	background: #fff;
	color: #17324d;
	border: solid 1px #d7e3f1;
	border-top: solid 4px #175cd3;
	border-radius: 8px;
	box-shadow: 0 8px 24px rgb(23 50 77 / 10%);
}

.icon {
	padding: 25px 0 0 24px;
	width: 62px;
	box-sizing: border-box;
	font-size: 26px;
	color: #175cd3;
}

.main {
	padding: 22px 38px 22px 18px;
	flex: 1;
}

.close {
	position: absolute;
	top: 8px;
	right: 8px;
	padding: 8px;
}

.title {
	font-weight: 750;
}

.text {
	margin: 0.7em 0 1em;
	line-height: 1.7;
}

.linkRow {
	margin-top: 5px;
}

@media (max-width: 500px) {
	.root {
		max-width: calc(100% - 24px);
	}

	.icon {
		padding-left: 18px;
		width: 52px;
	}

	.main {
		padding-left: 12px;
	}
}
</style>
