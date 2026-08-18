<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.page">
	<div :class="$style.formContainer">
		<div :class="$style.form">
			<div :class="$style.hero">
				<div :class="$style.brand">Nook</div>
				<div :class="$style.yellowBar"></div>
				<div :class="$style.title">Welcome to Nook!</div>
				<div :class="$style.version">v{{ version }}</div>
			</div>
			<div :class="$style.body">
				<form v-if="!accountCreated" class="_gaps_m" @submit.prevent="createAccount()">
					<div style="text-align: center;" class="_gaps_s">
						<div><b>{{ i18n.ts._serverSetupWizard.installCompleted }}</b></div>
						<div>{{ i18n.ts._serverSetupWizard.firstCreateAccount }}</div>
					</div>
					<MkInput v-model="setupPassword" type="password" data-testid="admin-initial-password">
						<template #label>{{ i18n.ts.initialPasswordForSetup }} <div v-tooltip:dialog="i18n.ts.initialPasswordForSetupDescription" class="_button _help"><i class="ti ti-help-circle"></i></div></template>
						<template #prefix><i class="ti ti-lock"></i></template>
					</MkInput>
					<MkInput v-model="username" pattern="^[a-zA-Z0-9_]{1,20}$" :spellcheck="false" required data-testid="admin-username">
						<template #label>{{ i18n.ts.username }} <div v-tooltip:dialog="i18n.ts.usernameInfo" class="_button _help"><i class="ti ti-help-circle"></i></div></template>
						<template #prefix>@</template>
						<template #suffix>@{{ host }}</template>
					</MkInput>
					<MkInput v-model="password" type="password" data-testid="admin-password">
						<template #label>{{ i18n.ts.password }}</template>
						<template #prefix><i class="ti ti-lock"></i></template>
					</MkInput>
					<div>
						<MkButton gradate large rounded :disabled="accountCreating" data-testid="admin-ok" style="margin: 0 auto;" type="submit">
							{{ accountCreating ? i18n.ts.processing : i18n.ts.next }}<MkEllipsis v-if="accountCreating"/>
						</MkButton>
					</div>
				</form>
				<div v-else-if="step === 0" class="_gaps_m">
					<div style="text-align: center;" class="_gaps_s">
						<div><b>{{ i18n.ts._serverSetupWizard.accountCreated }}</b></div>
					</div>
					<MkButton gradate large rounded data-testid="next" style="margin: 0 auto;" @click="step++">
						{{ i18n.ts.next }}
					</MkButton>
				</div>
				<div v-else-if="step === 1" class="_gaps_m">
					<div style="text-align: center;" class="_gaps_s">
						<div style="font-size: 120%;"><b>{{ i18n.ts._serverSetupWizard.serverSetting }}</b></div>
						<div>{{ i18n.ts._serverSetupWizard.youCanEasilyConfigureOptimalServerSettingsWithThisWizard }}</div>
						<div>{{ i18n.ts._serverSetupWizard.settingsYouMakeHereCanBeChangedLater }}</div>
					</div>

					<Suspense>
						<template #default>
							<MkServerSetupWizard :token="token!" @finished="onWizardFinished"/>
						</template>
						<template #fallback>
							<MkLoading/>
						</template>
					</Suspense>

					<MkButton rounded style="margin: 0 auto;" @click="skipSettings">
						{{ i18n.ts._serverSetupWizard.skipSettings }}
					</MkButton>
				</div>
				<div v-else-if="step === 2" class="_gaps_m">
					<div style="text-align: center;" class="_gaps_s">
						<div><b>{{ i18n.ts._serverSetupWizard.settingsCompleted }}</b></div>
						<div>{{ i18n.ts._serverSetupWizard.settingsCompleted_description }}</div>
						<div>{{ i18n.ts._serverSetupWizard.settingsCompleted_description2 }}</div>
					</div>
					<div class="_buttonsCenter">
						<MkButton gradate large rounded data-testid="next" style="margin: 0 auto;" @click="finish">
							{{ i18n.ts.start }}
						</MkButton>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { host, version } from '@@/js/config.js';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { i18n } from '@/i18n.js';
import { login } from '@/accounts.js';
import MkServerSetupWizard from '@/components/MkServerSetupWizard.vue';

const username = ref('');
const password = ref('');
const setupPassword = ref('');
const accountCreating = ref(false);
const accountCreated = ref(false);
const step = ref(0);

let token: string | null = null;

function createAccount() {
	if (accountCreating.value) return;
	accountCreating.value = true;

	const _close = os.waiting();

	misskeyApi('admin/accounts/create', {
		username: username.value,
		password: password.value,
		setupPassword: setupPassword.value === '' ? null : setupPassword.value,
	}).then(res => {
		token = res.token;
		accountCreated.value = true;
	}).catch((err) => {
		accountCreating.value = false;

		let title = i18n.ts.somethingHappened;
		let text = err.message + '\n' + err.id;

		if (err.code === 'ACCESS_DENIED') {
			title = i18n.ts.permissionDeniedError;
			text = i18n.ts.operationForbidden;
		} else if (err.code === 'INCORRECT_INITIAL_PASSWORD') {
			title = i18n.ts.permissionDeniedError;
			text = i18n.ts.incorrectPassword;
		}

		os.alert({
			type: 'error',
			title,
			text,
		});
	}).finally(() => {
		_close();
	});
}

function onWizardFinished() {
	step.value++;
}

function skipSettings() {
	step.value++;
}

function finish() {
	if (token == null) return;
	login(token);
}
</script>

<style lang="scss" module>
.page {
	--nook-blue: #175cd3;
	--nook-blue-deep: #17324d;
	--nook-blue-soft: #eef5ff;
	--nook-yellow: #ffd84d;
	--nook-white: #ffffff;
	--nook-border: #d7e3f1;

	--MI_THEME-accent: var(--nook-blue);
	--MI_THEME-bg: var(--nook-blue-soft);
	--MI_THEME-panel: var(--nook-white);
	--MI_THEME-fg: var(--nook-blue-deep);
	--MI_THEME-divider: var(--nook-border);
	--MI_THEME-buttonGradateA: var(--nook-yellow);
	--MI_THEME-buttonGradateB: var(--nook-yellow);
	--MI_THEME-fgOnAccent: var(--nook-blue-deep);
	--MI_THEME-accentedBg: #e6f0ff;
	--MI-radius: 8px;

	min-height: 100svh;
	background: var(--nook-blue-soft);
	color: var(--nook-blue-deep);
}

.formContainer {
	min-height: 100svh;
	padding: 32px;
	box-sizing: border-box;
	display: grid;
	place-items: center;
}

.form {
	position: relative;
	z-index: 10;
	width: min(100%, 550px);
	border: solid 1px var(--nook-border);
	border-radius: 10px;
	background: var(--nook-white);
	box-shadow: none;
	overflow: clip;
}

.hero {
	padding: 28px 32px 30px;
	background: var(--nook-blue);
	color: var(--nook-white);
	text-align: left;
}

.brand {
	font-size: 30px;
	font-weight: 850;
	line-height: 1;
	letter-spacing: -0.055em;
}

.yellowBar {
	width: 44px;
	height: 5px;
	margin: 16px 0 22px;
	border-radius: 2px;
	background: var(--nook-yellow);
}

.title {
	font-size: 23px;
	font-weight: 750;
	letter-spacing: -0.025em;
}

.version {
	margin-top: 5px;
	font-size: 12px;
	opacity: 0.72;
}

.body {
	padding: 28px 32px 32px;
}

@media (max-width: 600px) {
	.formContainer {
		padding: 0;
		place-items: stretch;
	}

	.form {
		width: 100%;
		min-height: 100svh;
		border: 0;
		border-radius: 0;
	}

	.hero {
		padding: calc(24px + env(safe-area-inset-top, 0px)) 22px 24px;
	}

	.body {
		padding: 24px 20px calc(28px + env(safe-area-inset-bottom, 0px));
	}
}
</style>
