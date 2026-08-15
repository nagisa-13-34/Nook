/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { requireNookCommunityMember, NookCommunityAccessError } from '@/nook/community/access.js';
import { ApiError } from '../../../../error.js';
const announcementSchema = { type: 'object', properties: { id: { type: 'string' }, communityId: { type: 'string' }, authorId: { type: 'string', nullable: true }, title: { type: 'string' }, body: { type: 'string' }, important: { type: 'boolean' }, createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' }, expiresAt: { type: 'string', format: 'date-time', nullable: true } }, required: ['id', 'communityId', 'authorId', 'title', 'body', 'important', 'createdAt', 'updatedAt', 'expiresAt'] } as const;
export const meta = { tags: ['channels'], requireCredential: true, kind: 'read:channels', res: { type: 'array', optional: false, nullable: false, items: announcementSchema }, errors: { forbidden: { message: 'You must be a community member.', code: 'FORBIDDEN', id: '182c419c-ba14-4ecc-9807-1a174fe996a1' } } } as const;
export const paramDef = { type: 'object', properties: { communityId: { type: 'string', format: 'misskey:id' }, limit: { type: 'integer', minimum: 1, maximum: 100 } }, required: ['communityId'] } as const;
@Injectable() export default class extends Endpoint<typeof meta, typeof paramDef> { constructor(@Inject(DI.db) private db: DataSource) { super(meta, paramDef, async (ps, me) => { try { await requireNookCommunityMember(this.db, ps.communityId, me.id); } catch (error) { if (error instanceof NookCommunityAccessError) throw new ApiError(meta.errors.forbidden); throw error; } return await this.db.query('SELECT "id", "communityId", "authorId", "title", "body", "important", "createdAt", "updatedAt", "expiresAt" FROM "nook_community_announcement" WHERE "communityId" = $1 AND ("expiresAt" IS NULL OR "expiresAt" > now()) ORDER BY "important" DESC, "createdAt" DESC LIMIT $2', [ps.communityId, ps.limit ?? 50]); }); } }
