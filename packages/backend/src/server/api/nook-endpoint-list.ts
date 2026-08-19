/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Nook-specific endpoints are kept separate from the large upstream endpoint list.
// EndpointsModule and endpoints.ts merge this object with endpoint-list.ts.

export * as 'notes/recommended' from './endpoints/notes/recommended.js';
export * as 'notes/recommended-page' from './endpoints/notes/recommended-page.js';
export * as 'nook/features' from './endpoints/nook/features.js';
export * as 'nook/community/show' from './endpoints/nook/community/show.js';
export * as 'nook/community/my-list' from './endpoints/nook/community/my-list.js';
export * as 'nook/community/settings-update' from './endpoints/nook/community/settings-update.js';
export * as 'nook/community/profile-show' from './endpoints/nook/community/profile-show.js';
export * as 'nook/community/profile-update' from './endpoints/nook/community/profile-update.js';
export * as 'nook/community/transfer-ownership' from './endpoints/nook/community/transfer-ownership.js';
export * as 'nook/community/delete' from './endpoints/nook/community/delete.js';
export * as 'nook/community/join' from './endpoints/nook/community/join.js';
export * as 'nook/community/leave' from './endpoints/nook/community/leave.js';
export * as 'nook/community/join-requests/list' from './endpoints/nook/community/join-requests/list.js';
export * as 'nook/community/join-requests/respond' from './endpoints/nook/community/join-requests/respond.js';
export * as 'nook/community/members/list' from './endpoints/nook/community/members/list.js';
export * as 'nook/community/members/update' from './endpoints/nook/community/members/update.js';
export * as 'nook/community/roles/list' from './endpoints/nook/community/roles/list.js';
export * as 'nook/community/roles/create' from './endpoints/nook/community/roles/create.js';
export * as 'nook/community/roles/update' from './endpoints/nook/community/roles/update.js';
export * as 'nook/community/roles/delete' from './endpoints/nook/community/roles/delete.js';
export * as 'nook/community/roles/assign' from './endpoints/nook/community/roles/assign.js';
export * as 'nook/community/rules/list' from './endpoints/nook/community/rules/list.js';
export * as 'nook/community/rules/create' from './endpoints/nook/community/rules/create.js';
export * as 'nook/community/rules/update' from './endpoints/nook/community/rules/update.js';
export * as 'nook/community/rules/delete' from './endpoints/nook/community/rules/delete.js';
export * as 'nook/community/invites/create' from './endpoints/nook/community/invites/create.js';
export * as 'nook/community/invites/list' from './endpoints/nook/community/invites/list.js';
export * as 'nook/community/invites/revoke' from './endpoints/nook/community/invites/revoke.js';
export * as 'nook/community/invites/use' from './endpoints/nook/community/invites/use.js';
export * as 'nook/community/channels/list' from './endpoints/nook/community/channels/list.js';
export * as 'nook/community/channels/create' from './endpoints/nook/community/channels/create.js';
export * as 'nook/community/channels/update' from './endpoints/nook/community/channels/update.js';
export * as 'nook/community/channels/delete' from './endpoints/nook/community/channels/delete.js';
export * as 'nook/community/messages/list' from './endpoints/nook/community/messages/list.js';
export * as 'nook/community/messages/create' from './endpoints/nook/community/messages/create.js';
export * as 'nook/community/messages/delete' from './endpoints/nook/community/messages/delete.js';
export * as 'nook/community/announcements/list' from './endpoints/nook/community/announcements/list.js';
export * as 'nook/community/announcements/create' from './endpoints/nook/community/announcements/create.js';
export * as 'nook/community/announcements/update' from './endpoints/nook/community/announcements/update.js';
export * as 'nook/community/announcements/delete' from './endpoints/nook/community/announcements/delete.js';
export * as 'nook/community/pins/list' from './endpoints/nook/community/pins/list.js';
export * as 'nook/community/pins/create' from './endpoints/nook/community/pins/create.js';
export * as 'nook/community/pins/delete' from './endpoints/nook/community/pins/delete.js';
export * as 'nook/community/search' from './endpoints/nook/community/search.js';
export * as 'nook/community/events/list' from './endpoints/nook/community/events/list.js';
export * as 'nook/community/events/create' from './endpoints/nook/community/events/create.js';
export * as 'nook/community/events/update' from './endpoints/nook/community/events/update.js';
export * as 'nook/community/events/delete' from './endpoints/nook/community/events/delete.js';
export * as 'nook/community/events/rsvp' from './endpoints/nook/community/events/rsvp.js';
export * as 'nook/community/bots/create' from './endpoints/nook/community/bots/create.js';
export * as 'nook/community/bots/list' from './endpoints/nook/community/bots/list.js';
export * as 'nook/community/bots/update' from './endpoints/nook/community/bots/update.js';
export * as 'nook/community/bots/rotate-secret' from './endpoints/nook/community/bots/rotate-secret.js';
export * as 'nook/community/bots/post' from './endpoints/nook/community/bots/post.js';
export * as 'nook/community/bots/messages-list' from './endpoints/nook/community/bots/messages-list.js';
export * as 'nook/community/voice/join' from './endpoints/nook/community/voice/join.js';
export * as 'nook/community/voice/heartbeat' from './endpoints/nook/community/voice/heartbeat.js';
export * as 'nook/community/voice/leave' from './endpoints/nook/community/voice/leave.js';
export * as 'nook/community/voice/signal' from './endpoints/nook/community/voice/signal.js';
export * as 'nook/community/voice/signals' from './endpoints/nook/community/voice/signals.js';
export * as 'nook/community/voice/config-update' from './endpoints/nook/community/voice/config-update.js';
export * as 'nook/community/voice/music-update' from './endpoints/nook/community/voice/music-update.js';
export * as 'nook/translate' from './endpoints/nook/translate.js';