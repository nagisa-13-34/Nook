/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export interface CommunityMembership {
	baseRole: 'owner' | 'admin' | 'moderator' | 'member';
	state: 'active' | 'banned';
	permissions: string[];
}

export interface CommunityDetail {
	communityId: string;
	joinMode: 'open' | 'approval' | 'invite' | 'private';
	discoverable: boolean;
	memberCount: number;
	membership: CommunityMembership | null;
}

export interface CommunityChannel {
	id: string;
	communityId: string;
	parentId: string | null;
	name: string;
	topic: string | null;
	kind: 'text' | 'announcement' | 'media' | 'forum' | 'voice';
	position: number;
	allowedRoleIds: string[];
	archivedAt: string | null;
}

export interface CommunityMessage {
	id: string;
	communityId: string;
	channelId: string;
	userId: string | null;
	botId: string | null;
	replyToId: string | null;
	body: string;
	createdAt: string;
	editedAt: string | null;
}

export interface CommunityRule { id: string; communityId: string; position: number; title: string; body: string; }
export interface CommunityRole { id: string; communityId: string; name: string; color: string | null; position: number; permissions: string[]; }
export interface CommunityMember { userId: string; baseRole: string; state: string; nickname: string | null; joinedAt: string; roleIds: string[]; }
export interface CommunityAnnouncement { id: string; communityId: string; authorId: string | null; title: string; body: string; important: boolean; createdAt: string; updatedAt: string; expiresAt: string | null; }
export interface CommunityPin { id: string; communityId: string; channelId: string | null; kind: string; targetId: string | null; url: string | null; label: string | null; createdBy: string | null; createdAt: string; }
export interface CommunityEvent { id: string; communityId: string; creatorId: string | null; title: string; description: string | null; location: string | null; startsAt: string; endsAt: string | null; maxAttendees: number | null; textChannelId: string | null; voiceChannelId: string | null; cancelledAt: string | null; createdAt: string; updatedAt: string; goingCount: number; interestedCount: number; myResponse: 'going' | 'interested' | 'not_going' | null; }
export interface CommunityBot { id: string; communityId: string; creatorId: string | null; name: string; description: string | null; kind: string; scopes: string[]; allowedChannelIds: string[]; enabled: boolean; createdAt: string; updatedAt: string; lastUsedAt: string | null; }

export interface VoiceConfig { ttsEnabled: boolean; ttsSourceChannelId: string | null; ttsLanguage: string | null; musicEnabled: boolean; }
export interface VoiceMusic { url: string | null; title: string | null; positionSeconds: number; playing: boolean; updatedAt: string; }
export interface VoiceHeartbeat { peers: string[]; speakingPeerIds: string[]; canSpeak: boolean; config: VoiceConfig; music: VoiceMusic | null; }
