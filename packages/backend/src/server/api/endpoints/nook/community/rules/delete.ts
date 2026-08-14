/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Inject, Injectable } from '@nestjs/common'; import { DataSource } from 'typeorm'; import { DI } from '@/di-symbols.js'; import { Endpoint } from '@/server/api/endpoint-base.js'; import { requireNookCommunityPermission, NookCommunityAccessError } from '@/nook/community/access.js'; import { deleteNookCommunityRule } from '@/nook/community/rules.js'; import { ApiError } from '../../../../error.js';
export const meta = { tags: ['channels'], requireCredential: true, kind: 'write:channels', errors: { forbidden: { message: 'You cannot manage rules.', code: 'FORBIDDEN', id: '83b96182-1a15-4425-9799-95de7b4035be' } } } as const;
export const paramDef = { type: 'object', properties: { communityId: { type: 'string', format: 'misskey:id' }, ruleId: { type: 'string', format: 'misskey:id' } }, required: ['communityId', 'ruleId'] } as const;
@Injectable() export default class extends Endpoint<typeof meta, typeof paramDef> { constructor(@Inject(DI.db) private db: DataSource) { super(meta, paramDef, async (ps, me) => { try { await requireNookCommunityPermission(this.db, ps.communityId, me.id, 'rules.manage'); } catch (error) { if (error instanceof NookCommunityAccessError) throw new ApiError(meta.errors.forbidden); throw error; } await deleteNookCommunityRule(this.db, ps.communityId, ps.ruleId); }); } }
