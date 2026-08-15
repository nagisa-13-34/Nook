/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export function parseNookVoiceSignalPayload(payload: string): unknown | null {
	try {
		return JSON.parse(payload) as unknown;
	} catch {
		return null;
	}
}

export function canReceiveNookVoiceAudio(speakingPeerIds: readonly string[], userId: string): boolean {
	return speakingPeerIds.includes(userId);
}
