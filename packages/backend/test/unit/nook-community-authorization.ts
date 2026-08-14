/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from 'node:assert';
import { afterEach, describe, test } from 'vitest';
import {
	assertCanAssignNookCommunityBaseRole,
	assertCanGrantNookCommunityPermissions,
	NookCommunityAuthorizationError,
} from '@/nook/community/authorization.js';
import { ensureBotChannelAllowed, NookCommunityBotError } from '@/nook/community/bots.js';
import { getNookVoiceIceTransportPolicy } from '@/nook/community/voice.js';
import type { NookCommunityMembership, NookCommunityPermission } from '@/nook/community/types.js';

function membership(baseRole: NookCommunityMembership['baseRole'], permissions: Array<NookCommunityPermission | '*'>): NookCommunityMembership {
	return {
		communityId: 'community',
		userId: 'actor',
		baseRole,
		state: 'active',
		permissions: new Set(permissions),
	};
}

describe('Nook Community authorization boundaries', () => {
	test('custom role manager cannot grant a permission they do not have', () => {
		const actor = membership('member', ['roles.manage']);
		assert.throws(
			() => assertCanGrantNookCommunityPermissions(actor, ['community.manage']),
			(error: unknown) => error instanceof NookCommunityAuthorizationError && error.code === 'PRIVILEGE_ESCALATION',
		);
	});

	test('custom role manager can grant permissions inside their own permission set', () => {
		const actor = membership('member', ['roles.manage', 'events.manage']);
		assert.doesNotThrow(() => assertCanGrantNookCommunityPermissions(actor, ['events.manage']));
	});

	test('owner wildcard can grant any known Community permission', () => {
		const actor = membership('owner', ['*']);
		assert.doesNotThrow(() => assertCanGrantNookCommunityPermissions(actor, ['community.manage', 'voice.manage']));
	});

	test('base role hierarchy only allows assigning roles below the actor', () => {
		const admin = membership('admin', ['members.manage']);
		assert.doesNotThrow(() => assertCanAssignNookCommunityBaseRole(admin, 'moderator'));
		assert.throws(
			() => assertCanAssignNookCommunityBaseRole(admin, 'admin'),
			(error: unknown) => error instanceof NookCommunityAuthorizationError && error.code === 'ROLE_HIERARCHY',
		);

		const moderator = membership('moderator', ['members.manage']);
		assert.doesNotThrow(() => assertCanAssignNookCommunityBaseRole(moderator, 'member'));
		assert.throws(
			() => assertCanAssignNookCommunityBaseRole(moderator, 'moderator'),
			(error: unknown) => error instanceof NookCommunityAuthorizationError && error.code === 'ROLE_HIERARCHY',
		);
	});

	test('empty bot allowlist denies every channel', () => {
		const bot = {
			id: 'bot', communityId: 'community', creatorId: null, name: 'bot', description: null, kind: 'integration' as const,
			scopes: ['read:messages'] as const, allowedChannelIds: [], enabled: true,
			createdAt: new Date(), updatedAt: new Date(), lastUsedAt: null,
		};
		assert.throws(
			() => ensureBotChannelAllowed(bot, 'channel'),
			(error: unknown) => error instanceof NookCommunityBotError && error.code === 'CHANNEL_FORBIDDEN',
		);
	});

	test('bot allowlist permits only explicitly listed channels', () => {
		const bot = {
			id: 'bot', communityId: 'community', creatorId: null, name: 'bot', description: null, kind: 'integration' as const,
			scopes: ['write:messages'] as const, allowedChannelIds: ['allowed'], enabled: true,
			createdAt: new Date(), updatedAt: new Date(), lastUsedAt: null,
		};
		assert.doesNotThrow(() => ensureBotChannelAllowed(bot, 'allowed'));
		assert.throws(() => ensureBotChannelAllowed(bot, 'other'));
	});
});

describe('Nook Voice privacy settings', () => {
	const originalPolicy = process.env.NOOK_VOICE_ICE_TRANSPORT_POLICY;
	afterEach(() => {
		if (originalPolicy === undefined) delete process.env.NOOK_VOICE_ICE_TRANSPORT_POLICY;
		else process.env.NOOK_VOICE_ICE_TRANSPORT_POLICY = originalPolicy;
	});

	test('relay environment setting produces relay-only ICE policy', () => {
		process.env.NOOK_VOICE_ICE_TRANSPORT_POLICY = 'relay';
		assert.equal(getNookVoiceIceTransportPolicy(), 'relay');
	});

	test('unknown or missing setting defaults to all', () => {
		process.env.NOOK_VOICE_ICE_TRANSPORT_POLICY = 'invalid';
		assert.equal(getNookVoiceIceTransportPolicy(), 'all');
	});
});
