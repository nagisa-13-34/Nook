/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Inject, Injectable } from '@nestjs/common'; import { DataSource } from 'typeorm'; import { DI } from '@/di-symbols.js'; import { Endpoint } from '@/server/api/endpoint-base.js'; import { requireNookCommunityPermission, NookCommunityAccessError } from '@/nook/community/access.js'; import { ApiError } from '../../../../error.js';
export const meta = { tags: ['channels'], requireCredential: true, kind: 'write:channels', errors: { forbidden: { message: 'You cannot manage channels.', code: 'FORBIDDEN', id: '2ca89dd7-d98c-4004-87ff-b1ba973733eb' } } } as const;
export const paramDef = { type: 'object', properties: { communityId: { type: 'string', format: 'misskey:id' }, channelId: { type: 'string', format: 'misskey:id' } }, required: ['communityId', 'channelId'] } as const;
@Injectable() export default class extends Endpoint<typeof meta, typeof paramDef> { constructor(@Inject(DI.db) private db: DataSource) { super(meta, paramDef, async (ps, me) => { try { await requireNookCommunityPermission(this.db, ps.communityId, me.id, 'channels.manage'); } catch (error) { if (error instanceof NookCommunityAccessError) throw new ApiError(meta.errors.forbidden); throw error; } await this.db.query('DELETE FROM "nook_community_channel" WHERE "communityId" = $1 AND "id" = $2', [ps.communityId, ps.channelId]); }); } }
