/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Inject, Injectable } from '@nestjs/common'; import { DataSource } from 'typeorm'; import { DI } from '@/di-symbols.js'; import { Endpoint } from '@/server/api/endpoint-base.js'; import { requireNookCommunityPermission, NookCommunityAccessError } from '@/nook/community/access.js'; import { ApiError } from '../../../../error.js';
export const meta = { tags: ['channels'], requireCredential: true, kind: 'write:channels', errors: { forbidden: { message: 'You cannot manage events.', code: 'FORBIDDEN', id: '56d74ced-dc77-4fac-b23a-adffb5ab9155' } } } as const;
export const paramDef = { type: 'object', properties: { communityId: { type: 'string', format: 'misskey:id' }, eventId: { type: 'string', format: 'misskey:id' } }, required: ['communityId','eventId'] } as const;
@Injectable() export default class extends Endpoint<typeof meta, typeof paramDef> { constructor(@Inject(DI.db) private db: DataSource) { super(meta, paramDef, async (ps, me) => { try { await requireNookCommunityPermission(this.db, ps.communityId, me.id, 'events.manage'); } catch (error) { if (error instanceof NookCommunityAccessError) throw new ApiError(meta.errors.forbidden); throw error; } await this.db.query('DELETE FROM "nook_community_event" WHERE "communityId"=$1 AND "id"=$2', [ps.communityId, ps.eventId]); }); } }
