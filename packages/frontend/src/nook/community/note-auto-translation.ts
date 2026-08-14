/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { watch } from 'vue';
import type { Ref } from 'vue';
import type * as Misskey from 'misskey-js';
import { $i } from '@/i.js';
import { nookApi } from './nook-api.js';
import { nookAutoTranslateEnabled, nookAutoTranslateTargetLang } from './translation-preferences.js';

export function useNookNoteAutoTranslation(
	note: Misskey.entities.Note,
	translation: Ref<Misskey.entities.NotesTranslateResponse | null>,
	translating: Ref<boolean>,
	mock = false,
): void {
	let requestId = 0;

	watch([nookAutoTranslateEnabled, nookAutoTranslateTargetLang], async () => {
		const id = ++requestId;
		if (!nookAutoTranslateEnabled.value || mock || $i == null || note.text == null || note.text.length === 0) return;
		translating.value = true;
		try {
			const result = await nookApi<Misskey.entities.NotesTranslateResponse>('nook/translate', {
				kind: 'note',
				id: note.id,
				targetLang: nookAutoTranslateTargetLang.value,
			});
			if (id !== requestId) return;
			const target = nookAutoTranslateTargetLang.value.split('-')[0]?.toUpperCase();
			translation.value = result.sourceLang.toUpperCase() === target ? null : result;
		} catch {
			if (id === requestId) translation.value = null;
		} finally {
			if (id === requestId) translating.value = false;
		}
	}, { immediate: true });
}
