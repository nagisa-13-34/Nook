/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test } from 'vitest';
import type { DataSource } from 'typeorm';
import type { IdService } from '@/core/IdService.js';
import { hideNookVoiceTtsSource } from '@/nook/community/voice.js';
import { meta as featuresMeta } from '@/server/api/endpoints/nook/features.js';
import { meta as rolesListMeta } from '@/server/api/endpoints/nook/community/roles/list.js';
import { meta as botsListMeta } from '@/server/api/endpoints/nook/community/bots/list.js';
import BotPostEndpoint from '@/server/api/endpoints/nook/community/bots/post.js';
import BotMessagesListEndpoint from '@/server/api/endpoints/nook/community/bots/messages-list.js';
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

	test('Bot endpoints redact the shared request secret before unexpected failures can be logged', async () => {
		const db = {
			query: async () => { throw new Error('database unavailable'); },
		} as unknown as DataSource;
		const idService = { gen: () => 'message' } as unknown as IdService;
		const post = new BotPostEndpoint(db, idService);
		const list = new BotMessagesListEndpoint(db);
		const postParams = { botId: 'bot', secret: 'x'.repeat(32), channelId: 'channel', body: 'hello' };
		const listParams = { botId: 'bot', secret: 'y'.repeat(32), channelId: 'channel' };

		await assert.rejects(() => post.exec(postParams, null, null), /database unavailable/);
		await assert.rejects(() => list.exec(listParams, null, null), /database unavailable/);
		assert.equal(postParams.secret, '[REDACTED]');
		assert.equal(listParams.secret, '[REDACTED]');
	});
});
