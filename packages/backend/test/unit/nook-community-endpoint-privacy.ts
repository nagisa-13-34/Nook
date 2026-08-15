/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test } from 'vitest';
import { meta as rolesListMeta } from '@/server/api/endpoints/nook/community/roles/list.js';
import { meta as botsListMeta } from '@/server/api/endpoints/nook/community/bots/list.js';
import { meta as voiceJoinMeta } from '@/server/api/endpoints/nook/community/voice/join.js';
import { meta as voiceHeartbeatMeta } from '@/server/api/endpoints/nook/community/voice/heartbeat.js';

describe('Nook Community endpoint privacy metadata', () => {
	test('role and bot configuration lists are never anonymous endpoints', () => {
		assert.equal(rolesListMeta.requireCredential, true);
		assert.equal(botsListMeta.requireCredential, true);
	});

	test('Voice responses expose current speaking peer authorization state', () => {
		assert.ok('speakingPeerIds' in voiceJoinMeta.res.properties);
		assert.ok('speakingPeerIds' in voiceHeartbeatMeta.res.properties);
	});
});
