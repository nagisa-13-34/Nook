/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { describe, test } from 'vitest';
import type { DataSource } from 'typeorm';
import type { IdService } from '@/core/IdService.js';
import { hideNookVoiceTtsSource } from '@/nook/community/voice.js';
import { redactApiParamsForLogging } from '@/server/api/ApiCallService.js';
import { ApiError } from '@/server/api/error.js';
import { meta as featuresMeta } from '@/server/api/endpoints/nook/features.js';
import { meta as rolesListMeta } from '@/server/api/endpoints/nook/community/roles/list.js';
import BotsListEndpoint, { meta as botsListMeta } from '@/server/api/endpoints/nook/community/bots/list.js';
import BotPostEndpoint from '@/server/api/endpoints/nook/community/bots/post.js';
import BotMessagesListEndpoint from '@/server/api/endpoints/nook/community/bots/messages-list.js';
import BotRotateSecretEndpoint from '@/server/api/endpoints/nook/community/bots/rotate-secret.js';
import InviteUseEndpoint from '@/server/api/endpoints/nook/community/invites/use.js';
import { meta as voiceJoinMeta } from '@/server/api/endpoints/nook/community/voice/join.js';
import { meta as voiceHeartbeatMeta } from '@/server/api/endpoints/nook/community/voice/heartbeat.js';
import { meta as voiceLeaveMeta } from '@/server/api/endpoints/nook/community/voice/leave.js';
import { meta as voiceSignalMeta } from '@/server/api/endpoints/nook/community/voice/signal.js';
import { meta as voiceSignalsMeta } from '@/server/api/endpoints/nook/community/voice/signals.js';

function createRestrictedBotDb(): DataSource {
	const now = new Date(0);
	return {
		query: async (sql: string) => {
			if (sql.includes('FROM "channel" c')) {
				return [{ userId: 'owner', joinMode: 'open', discoverable: true, initialized: true }];
			}
			if (sql.includes('FROM "nook_community_member" WHERE')) {
				return [{ baseRole: 'member', state: 'active' }];
			}
			if (sql.includes('INNER JOIN "nook_community_role"')) {
				return [{ permissions: ['bots.manage'] }];
			}
			if (sql.includes('FROM "nook_community_bot"')) {
				return [{
					id: 'bot',
					communityId: 'community',
					creatorId: 'owner',
					name: 'Bot',
					description: null,
					kind: 'integration',
					scopes: ['read:messages'],
					allowedChannelIds: ['public', 'staff'],
					enabled: true,
					createdAt: now,
					updatedAt: now,
					lastUsedAt: null,
				}];
			}
			if (sql.includes('FROM "nook_community_channel"')) {
				if (sql.includes('AND "id" = $2')) {
					return [{ id: 'staff', communityId: 'community', parentId: null, name: 'Staff', topic: null, kind: 'text', position: 1, allowedRoleIds: ['staff-role'], archivedAt: null }];
				}
				return [
					{ id: 'public', communityId: 'community', parentId: null, name: 'Public', topic: null, kind: 'text', position: 0, allowedRoleIds: [], archivedAt: null },
					{ id: 'staff', communityId: 'community', parentId: null, name: 'Staff', topic: null, kind: 'text', position: 1, allowedRoleIds: ['staff-role'], archivedAt: null },
				];
			}
			if (sql.includes('SELECT "roleId" FROM "nook_community_member_role"')) return [];
			throw new Error(`Unexpected query: ${sql}`);
		},
	} as unknown as DataSource;
}

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

	test('Voice session mutations require write:channels and bound expensive polling', () => {
		assert.equal(voiceJoinMeta.kind, 'write:channels');
		assert.equal(voiceHeartbeatMeta.kind, 'write:channels');
		assert.equal(voiceLeaveMeta.kind, 'write:channels');
		assert.equal(voiceSignalMeta.kind, 'write:channels');
		assert.equal(voiceSignalsMeta.kind, 'write:channels');
		assert.equal(voiceJoinMeta.limit?.max, 20);
		assert.equal(voiceHeartbeatMeta.limit?.max, 60);
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

	test('common API error logging redacts credential-shaped parameters recursively', () => {
		assert.deepEqual(redactApiParamsForLogging({
			i: 'api-token',
			token: 'invite-token',
			nested: {
				secret: 'bot-secret',
				credential: 'turn-credential',
				value: 42,
			},
			items: [{ password: 'password', label: 'safe' }],
		}), {
			i: '[REDACTED]',
			token: '[REDACTED]',
			nested: {
				secret: '[REDACTED]',
				credential: '[REDACTED]',
				value: 42,
			},
			items: [{ password: '[REDACTED]', label: 'safe' }],
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

	test('invite use redacts its bearer token before unexpected failures can be logged', async () => {
		const db = {
			transaction: async () => { throw new Error('database unavailable'); },
		} as unknown as DataSource;
		const endpoint = new InviteUseEndpoint(db, {} as never, {} as never);
		const params = { token: 'invite-token-1234567890' };

		await assert.rejects(() => endpoint.exec(params, { id: 'user' } as never, null), /database unavailable/);
		assert.equal(params.token, '[REDACTED]');
	});

	test('Bot managers cannot discover hidden allowlist channel IDs or rotate credentials for a hidden-channel Bot', async () => {
		const db = createRestrictedBotDb();
		const list = new BotsListEndpoint(db);
		const rotate = new BotRotateSecretEndpoint(db);
		const user = { id: 'manager' } as never;

		const bots = await list.exec({ communityId: 'community' }, user, null);
		assert.deepEqual(bots[0]?.allowedChannelIds, ['public']);
		await assert.rejects(
			() => rotate.exec({ communityId: 'community', botId: 'bot' }, user, null),
			(error: unknown) => error instanceof ApiError && error.code === 'FORBIDDEN',
		);
	});
});
