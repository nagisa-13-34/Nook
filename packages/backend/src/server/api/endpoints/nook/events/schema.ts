/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export const nookEventSchema = {
	type: 'object',
	properties: {
		id: { type: 'string' },
		communityId: { type: 'string', nullable: true },
		creatorId: { type: 'string', nullable: true },
		title: { type: 'string' },
		description: { type: 'string', nullable: true },
		location: { type: 'string', nullable: true },
		startsAt: { type: 'string', format: 'date-time' },
		endsAt: { type: 'string', format: 'date-time', nullable: true },
		maxAttendees: { type: 'number', nullable: true },
		textChannelId: { type: 'string', nullable: true },
		voiceChannelId: { type: 'string', nullable: true },
		visibility: { type: 'string', enum: ['public', 'community', 'unlisted', 'private'] },
		participation: { type: 'string', enum: ['anyone', 'community'] },
		cancelledAt: { type: 'string', format: 'date-time', nullable: true },
		createdAt: { type: 'string', format: 'date-time' },
		updatedAt: { type: 'string', format: 'date-time' },
		goingCount: { type: 'number' },
		interestedCount: { type: 'number' },
		myResponse: { type: 'string', enum: ['going', 'interested', 'not_going'], nullable: true },
	},
	required: ['id', 'communityId', 'creatorId', 'title', 'description', 'location', 'startsAt', 'endsAt', 'maxAttendees', 'textChannelId', 'voiceChannelId', 'visibility', 'participation', 'cancelledAt', 'createdAt', 'updatedAt', 'goingCount', 'interestedCount', 'myResponse'],
} as const;
