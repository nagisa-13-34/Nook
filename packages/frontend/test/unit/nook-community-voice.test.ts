/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { canReceiveNookVoiceAudio, parseNookVoiceSignalPayload } from '@/nook/community/voice-client.js';

describe('Nook Community Voice client safety', () => {
	test('malformed signaling payload is rejected without throwing', () => {
		expect(() => parseNookVoiceSignalPayload('{not valid json')).not.toThrow();
		expect(parseNookVoiceSignalPayload('{not valid json')).toBeNull();
	});

	test('valid signaling payload is parsed', () => {
		expect(parseNookVoiceSignalPayload('{"type":"offer","sdp":"x"}')).toEqual({ type: 'offer', sdp: 'x' });
	});

	test('incoming audio is allowed only for peers currently authorized to speak', () => {
		expect(canReceiveNookVoiceAudio(['speaker'], 'speaker')).toBe(true);
		expect(canReceiveNookVoiceAudio(['speaker'], 'listener')).toBe(false);
		expect(canReceiveNookVoiceAudio([], 'speaker')).toBe(false);
	});
});
