/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Inject, Injectable } from '@nestjs/common'; import { DataSource } from 'typeorm'; import { DI } from '@/di-symbols.js'; import { Endpoint } from '@/server/api/endpoint-base.js'; import { leaveNookCommunityVoice } from '@/nook/community/voice.js';
export const meta = { tags: ['channels'], requireCredential: true, kind: 'write:channels' } as const; export const paramDef = { type: 'object', properties: { channelId: { type: 'string', format: 'misskey:id' }, sessionId: { type: 'string', minLength: 16, maxLength: 64 } }, required: ['channelId','sessionId'] } as const;
@Injectable() export default class extends Endpoint<typeof meta, typeof paramDef> { constructor(@Inject(DI.db) private db: DataSource) { super(meta, paramDef, async (ps, me) => { await leaveNookCommunityVoice(this.db, ps.channelId, me.id, ps.sessionId); }); } }
