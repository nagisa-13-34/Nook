/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export function resolveNookMarkdownForNote(
	userHost: string | null,
	uri: string | null | undefined,
	explicitValue: boolean | undefined,
): boolean {
	if (userHost !== null || uri != null) return false;
	return explicitValue ?? true;
}
