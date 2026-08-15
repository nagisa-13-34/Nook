/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DI } from '@/di-symbols.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { GetterService } from '@/server/api/GetterService.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { RoleService } from '@/core/RoleService.js';
import { NookAccessService } from '@/nook/policy/NookAccessService.js';
import { requireNookCommunityChannelAccess, NookCommunityChannelError } from '@/nook/community/channels.js';
import { requireNookCommunityMember, NookCommunityAccessError } from '@/nook/community/access.js';
import { NookTranslationService, NookTranslationUnavailableError } from '@/nook/translation/NookTranslationService.js';
import { ApiError } from '../../error.js';

export const meta = {
	tags: ['notes'], requireCredential: true, kind: 'read:account',
	res: { type: 'object', optional: false, nullable: false, properties: { sourceLang: { type: 'string' }, text: { type: 'string' } }, required: ['sourceLang','text'] },
	errors: {
		unavailable: { message: 'Translation is unavailable.', code: 'UNAVAILABLE', id: '572273ec-21cd-4560-9537-1709427d74e0' },
		noSuchObject: { message: 'No such translatable object.', code: 'NO_SUCH_OBJECT', id: '7909dc3c-5a93-4409-b02c-51f1407b56c2' },
		forbidden: { message: 'You cannot translate this content.', code: 'FORBIDDEN', id: '5098b1bf-c7a6-42d7-ad22-6f528584943f' },
		communityDisabled: { message: 'Community is currently disabled.', code: 'NOOK_COMMUNITY_DISABLED', id: '59f28094-8444-420a-96f5-64f202a63e65', kind: 'permission', httpStatusCode: 403 },
	},
} as const;
export const paramDef = { type: 'object', properties: {
	kind: { type: 'string', enum: ['note','communityMessage','communityAnnouncement','communityEvent'] }, id: { type: 'string', minLength: 1, maxLength: 64 }, targetLang: { type: 'string', minLength: 2, maxLength: 24 },
}, required: ['kind','id','targetLang'] } as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.db) private db: DataSource,
		private getterService: GetterService,
		private noteEntityService: NoteEntityService,
		private roleService: RoleService,
		private translationService: NookTranslationService,
		private nookAccessService: NookAccessService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const policies = await this.roleService.getUserPolicies(me.id);
			if (!policies.canUseTranslator) throw new ApiError(meta.errors.unavailable);
			if (ps.kind !== 'note' && !(await this.nookAccessService.isFeatureEnabled('community'))) throw new ApiError(meta.errors.communityDisabled);
			let text: string | null = null;

			if (ps.kind === 'note') {
				const note = await this.getterService.getNote(ps.id).catch(() => null);
				if (note == null) throw new ApiError(meta.errors.noSuchObject);
				if (!(await this.noteEntityService.isVisibleForMe(note, me.id))) throw new ApiError(meta.errors.forbidden);
				text = note.text;
			} else if (ps.kind === 'communityMessage') {
				const rows = await this.db.query<Array<{ communityId: string; channelId: string; body: string }>>(
					`SELECT "communityId","channelId","body" FROM "nook_community_message" WHERE "id"=$1 AND "deletedAt" IS NULL LIMIT 1`, [ps.id]);
				const message = rows[0];
				if (message == null) throw new ApiError(meta.errors.noSuchObject);
				try { await requireNookCommunityChannelAccess(this.db, message.communityId, me.id, message.channelId); } catch (error) {
					if (error instanceof NookCommunityAccessError || error instanceof NookCommunityChannelError) throw new ApiError(meta.errors.forbidden);
					throw error;
				}
				text = message.body;
			} else if (ps.kind === 'communityAnnouncement') {
				const rows = await this.db.query<Array<{ communityId: string; body: string }>>(
					'SELECT "communityId","body" FROM "nook_community_announcement" WHERE "id"=$1 LIMIT 1', [ps.id]);
				const announcement = rows[0];
				if (announcement == null) throw new ApiError(meta.errors.noSuchObject);
				try { await requireNookCommunityMember(this.db, announcement.communityId, me.id); } catch (error) {
					if (error instanceof NookCommunityAccessError) throw new ApiError(meta.errors.forbidden);
					throw error;
				}
				text = announcement.body;
			} else {
				const rows = await this.db.query<Array<{ communityId: string; description: string | null }>>(
					'SELECT "communityId","description" FROM "nook_community_event" WHERE "id"=$1 LIMIT 1', [ps.id]);
				const event = rows[0];
				if (event == null) throw new ApiError(meta.errors.noSuchObject);
				try { await requireNookCommunityMember(this.db, event.communityId, me.id); } catch (error) {
					if (error instanceof NookCommunityAccessError) throw new ApiError(meta.errors.forbidden);
					throw error;
				}
				text = event.description;
			}

			if (text == null || text.length === 0) throw new ApiError(meta.errors.noSuchObject);
			try { return await this.translationService.translate(ps.kind, ps.id, text, ps.targetLang); } catch (error) { if (error instanceof NookTranslationUnavailableError) throw new ApiError(meta.errors.unavailable); throw error; }
		});
	}
}
