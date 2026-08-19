/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { NookCommunityBotRecord } from './bots.js';
import type { NookCommunityChannelRecord } from './channels.js';
import type { NookCommunityEventRecord, NookEventRecord } from './events.js';
import type { NookCommunityMessageRecord } from './messages.js';

export function serializeNookCommunityBot(bot: NookCommunityBotRecord) {
	return {
		...bot,
		createdAt: bot.createdAt.toISOString(),
		updatedAt: bot.updatedAt.toISOString(),
		lastUsedAt: bot.lastUsedAt?.toISOString() ?? null,
	};
}

export function serializeNookCommunityChannel(channel: NookCommunityChannelRecord) {
	return {
		...channel,
		archivedAt: channel.archivedAt?.toISOString() ?? null,
	};
}

export function serializeNookCommunityMessage(message: NookCommunityMessageRecord) {
	return {
		...message,
		createdAt: message.createdAt.toISOString(),
		editedAt: message.editedAt?.toISOString() ?? null,
	};
}

export function serializeNookEvent(event: NookEventRecord) {
	return {
		...event,
		startsAt: event.startsAt.toISOString(),
		endsAt: event.endsAt?.toISOString() ?? null,
		cancelledAt: event.cancelledAt?.toISOString() ?? null,
		createdAt: event.createdAt.toISOString(),
		updatedAt: event.updatedAt.toISOString(),
	};
}

export function serializeNookCommunityEvent(event: NookCommunityEventRecord) {
	return {
		...serializeNookEvent(event),
		communityId: event.communityId,
	};
}
