<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="instance" :class="$style.root">
	<section :class="[$style.main, $style.panel]">
		<button class="_button" :class="$style.mainMenu" @click="showMenu"><i class="ti ti-dots"></i></button>
		<img :src="instance.iconUrl || '/favicon.ico'" alt="" :class="$style.mainIcon"/>
		<div :class="$style.mainFg">
			<h1 :class="$style.mainTitle"><MkA to="/">{{ instanceName }}</MkA></h1>
			<div :class="$style.mainAbout">
				<!-- eslint-disable-next-line vue/no-v-html -->
				<div v-html="instance.description || i18n.ts.headlineMisskey"></div>
			</div>
			<div v-if="instance.disableRegistration || instance.federation !== 'all'" :class="$style.mainWarn" class="_gaps_s">
				<MkInfo v-if="instance.disableRegistration" warn>{{ i18n.ts.invitationRequiredToRegister }}</MkInfo>
				<MkInfo v-if="instance.federation === 'specified'" warn>{{ i18n.ts.federationSpecified }}</MkInfo>
				<MkInfo v-else-if="instance.federation === 'none'" warn>{{ i18n.ts.federationDisabled }}</MkInfo>
			</div>
			<div :class="$style.mainActions">
				<MkButton :class="$style.mainAction" full rounded gradate data-testid="signup" @click="signup()">{{ i18n.ts.joinThisServer }}</MkButton>
				<MkButton :class="$style.mainAction" full rounded data-testid="signin" @click="signin()">{{ i18n.ts.login }}</MkButton>
			</div>
		</div>
	</section>

	<div v-if="stats && instance.clientOptions.showActivitiesForVisitor !== false" :class="$style.stats">
		<div :class="[$style.statsItem, $style.panel]">
			<div :class="$style.statsItemLabel">{{ i18n.ts.users }}</div>
			<div :class="$style.statsItemCount"><MkNumber :value="stats.originalUsersCount"/></div>
		</div>
		<div :class="[$style.statsItem, $style.panel]">
			<div :class="$style.statsItemLabel">{{ i18n.ts.notes }}</div>
			<div :class="$style.statsItemCount"><MkNumber :value="stats.originalNotesCount"/></div>
		</div>
	</div>

	<section v-if="instance.policies.ltlAvailable && instance.clientOptions.showTimelineForVisitor !== false" :class="[$style.tl, $style.panel]">
		<div :class="$style.tlHeader">{{ i18n.ts.letsLookAtTimeline }}</div>
		<div :class="$style.tlBody">
			<MkStreamingNotesTimeline src="local"/>
		</div>
	</section>

	<div v-if="instance.clientOptions.showActivitiesForVisitor !== false" :class="$style.panel">
		<XActiveUsersChart/>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import * as Misskey from 'misskey-js';
import { instanceName } from '@@/js/config.js';
import XSigninDialog from '@/components/MkSigninDialog.vue';
import XSignupDialog from '@/components/MkSignupDialog.vue';
import MkButton from '@/components/MkButton.vue';
import MkStreamingNotesTimeline from '@/components/MkStreamingNotesTimeline.vue';
import MkInfo from '@/components/MkInfo.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { i18n } from '@/i18n.js';
import { instance } from '@/instance.js';
import MkNumber from '@/components/MkNumber.vue';
import XActiveUsersChart from '@/components/MkVisitorDashboard.ActiveUsersChart.vue';
import { openInstanceMenu } from '@/ui/_common_/common.js';

const stats = ref<Misskey.entities.StatsResponse | null>(null);

if (instance.clientOptions.showActivitiesForVisitor !== false) {
	misskeyApi('stats', {}).then((res) => {
		stats.value = res;
	});
}

function signin() {
	const { dispose } = os.popup(XSigninDialog, {
		autoSet: true,
	}, {
		closed: () => dispose(),
	});
}

function signup() {
	const { dispose } = os.popup(XSignupDialog, {
		autoSet: true,
	}, {
		closed: () => dispose(),
	});
}

function showMenu(ev: PointerEvent) {
	openInstanceMenu(ev);
}
</script>

<style lang="scss" module>
.root {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.panel {
	position: relative;
	background: var(--MI_THEME-panel);
	border: solid 1px var(--MI_THEME-divider);
	border-radius: 8px;
	box-shadow: none;
}

.main {
	padding: 28px;
	text-align: left;
	border-top: solid 4px var(--MI_THEME-accent);
}

.mainIcon {
	display: block;
	width: 58px;
	height: 58px;
	object-fit: cover;
	margin-bottom: 20px;
	border-radius: 10px;
}

.mainMenu {
	position: absolute;
	top: 14px;
	right: 14px;
	width: 34px;
	height: 34px;
	border-radius: 6px;
	font-size: 18px;
	z-index: 50;
	color: var(--MI_THEME-fg);
}

.mainMenu:hover {
	background: color(from var(--MI_THEME-accent) srgb r g b / 0.08);
}

.mainFg {
	position: relative;
	z-index: 1;
}

.mainTitle {
	display: block;
	margin: 0;
	font-size: 24px;
	font-weight: 800;
	letter-spacing: -0.03em;
}

.mainTitle a {
	color: inherit;
	text-decoration: none;
}

.mainAbout {
	margin-top: 10px;
	line-height: 1.75;
	color: color(from var(--MI_THEME-fg) srgb r g b / 0.76);
}

.mainWarn {
	padding-top: 20px;
}

.mainActions {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 10px;
	padding-top: 26px;
}

.mainAction {
	line-height: 28px;
}

.stats {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 14px;
}

.statsItem {
	overflow: clip;
	padding: 16px 18px;
}

.statsItemLabel {
	color: color(from var(--MI_THEME-fg) srgb r g b / 0.65);
	font-size: 12px;
	font-weight: 650;
}

.statsItemCount {
	margin-top: 3px;
	font-weight: 800;
	font-size: 21px;
	color: var(--MI_THEME-accent);
}

.tl {
	overflow: clip;
}

.tlHeader {
	padding: 13px 16px;
	border-bottom: solid 1px var(--MI_THEME-divider);
	font-size: 13px;
	font-weight: 700;
}

.tlBody {
	height: 340px;
	overflow: auto;
}

@media (max-width: 500px) {
	.main {
		padding: 22px;
	}

	.mainActions {
		grid-template-columns: 1fr;
	}
}
</style>