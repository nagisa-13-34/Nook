/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test } from 'vitest';
import { hideNookVoiceTtsSource } from '@/nook/community/voice.js';
import { meta as featuresMeta } from '@/server/api/endpoints/nook/features.js';
import { meta as rolesListMeta } from '@/server/api/endpoints/nook/community/roles/list.js';
import { meta as botsListMeta } from '@/server/api/endpoints/nook/community/bots/list.js';
import { meta as voiceJoinMeta } from '@/server/api/endpoints/nook/community/voice/join.js';
import { meta as voiceHeartbeatMeta } from '@/server/api/endpoints/nook/community/voice/heartbeat.js';
import { meta as voiceLeaveMeta } from '@/server/api/endpoints/nook/community/voice/leave.js';
import { meta as voiceSignalMeta } from '@/server/api/endpoints/nook/community/voice/signal.js';
import { meta as voiceSignalsMeta } from '@/server/api/endpoints/nook/community/voice/signals.js';

describe('Nook Community endpoint privacy metadata', () => {
	test('feature availability is public while role and bot configuration is authenticated', () => {
		assert.equal(featuresMeta.requireCredential, false);
		assert.equal(rolesListMeta.requireCredential, true);
		assert.equal(botsListMeta.requireCredential, true);
	});

	test('Voice responses expose current speaking peer authorization state', () => {
		assert.ok('speakingPeerIds' in voiceJoinMeta.res.properties);
		assert.ok('speakingPeerIds' in voiceHeartbeatMeta.res.properties);
	});

	test('Voice session mutations require write:channels', () => {
		assert.equal(voiceJoinMeta.kind, 'write:channels');
		assert.equal(voiceHeartbeatMeta.kind, 'write:channels');
		assert.equal(voiceLeaveMeta.kind, 'write:channels');
		assert.equal(voiceSignalMeta.kind, 'write:channels');
		assert.equal(voiceSignalsMeta.kind, 'write:channels');
	});

	test('restricted TTS configuration hides its source channel', () => {
		assert.deepEqual(hideNookVoiceTtsSource({
			ttsEnabled: true,
			ttsSourceChannelId: 'staff-only',
			ttsLanguage: 'ja-JP',
			musicEnabled: true,
		}), {
			ttsEnabled: false,
			ttsSourceChannelId: null,
			ttsLanguage: 'ja-JP',
			musicEnabled: true,
		});
	});
});
