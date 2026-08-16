/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export type NookCommunityJoinMode = 'open' | 'approval' | 'invite' | 'private';
export type NookCommunityAgeMode = 'minors_only' | 'mixed' | 'adults_only';
export type NookCommunityBaseRole = 'owner' | 'admin' | 'moderator' | 'member';
export type NookCommunityMemberState = 'active' | 'banned';

export type NookCommunityPermission =
	| 'community.manage'
	| 'members.manage'
	| 'members.invite'
	| 'roles.manage'
	| 'rules.manage'
	| 'channels.manage'
	| 'announcements.manage'
	| 'pins.manage'
	| 'events.manage'
	| 'bots.manage'
	| 'voice.manage'
	| 'translation.manage'
	| 'messages.post'
	| 'voice.join'
	| 'voice.speak';

export interface NookCommunityContext {
	communityId: string;
	ownerId: string | null;
	joinMode: NookCommunityJoinMode;
	ageMode: NookCommunityAgeMode;
	discoverable: boolean;
}

export interface NookCommunityMembership {
	communityId: string;
	userId: string;
	baseRole: NookCommunityBaseRole;
	state: NookCommunityMemberState;
	permissions: Set<NookCommunityPermission | '*'>;
}
