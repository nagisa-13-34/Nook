/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { apiUrl } from '@@/js/config.js';
import { $i } from '@/i.js';

export interface NookApiError {
	message?: string;
	code?: string;
	id?: string;
}

export async function nookApi<T = never>(endpoint: string, data: Record<string, unknown> = {}, signal?: AbortSignal): Promise<T> {
	if (endpoint.includes('://') || endpoint.startsWith('/')) throw new Error('invalid endpoint');
	const body: Record<string, unknown> = { ...data };
	if ($i != null) body.i = $i.token;
	const response = await window.fetch(`${apiUrl}/${endpoint}`, {
		method: 'POST',
		body: JSON.stringify(body),
		credentials: 'omit',
		cache: 'no-cache',
		headers: { 'Content-Type': 'application/json' },
		signal,
	});
	if (response.status === 204) return undefined as T;
	const json = await response.json();
	if (!response.ok) {
		const apiError = (json.error ?? json) as NookApiError;
		throw Object.assign(new Error(apiError.message ?? `Nook API request failed (${response.status})`), apiError);
	}
	return json as T;
}
