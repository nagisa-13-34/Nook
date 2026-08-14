/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ref, watch } from 'vue';

const storageKey = 'nook:auto-translation:v1';
const fallbackLanguage = typeof navigator === 'undefined' ? 'ja' : (navigator.language || 'ja').split('-')[0];

function readInitial(): { enabled: boolean; targetLang: string } {
	if (typeof localStorage === 'undefined') return { enabled: false, targetLang: fallbackLanguage };
	try {
		const value = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as { enabled?: unknown; targetLang?: unknown } | null;
		return {
			enabled: value?.enabled === true,
			targetLang: typeof value?.targetLang === 'string' && value.targetLang.length >= 2 ? value.targetLang : fallbackLanguage,
		};
	} catch {
		return { enabled: false, targetLang: fallbackLanguage };
	}
}

const initial = readInitial();
export const nookAutoTranslateEnabled = ref(initial.enabled);
export const nookAutoTranslateTargetLang = ref(initial.targetLang);

watch([nookAutoTranslateEnabled, nookAutoTranslateTargetLang], () => {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(storageKey, JSON.stringify({ enabled: nookAutoTranslateEnabled.value, targetLang: nookAutoTranslateTargetLang.value }));
});
