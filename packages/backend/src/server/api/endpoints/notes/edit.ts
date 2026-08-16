/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as mfm from 'mfm-js';
import { In } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '@/server/api/error.js';
import { DI } from '@/di-symbols.js';
import { MAX_NOTE_TEXT_LENGTH } from '@/const.js';
import { MiNote } from '@/models/Note.js';
import type { IMentionedRemoteUsers, NoteEditRevision } from '@/models/Note.js';
import type { MiLocalUser, MiRemoteUser, MiUser } from '@/models/User.js';
import type { NotesRepository, UserProfilesRepository, UsersRepository } from '@/models/_.js';
import { extractMentions } from '@/misc/extract-mentions.js';
import { extractHashtags } from '@/misc/extract-hashtags.js';
import { extractCustomEmojisFromMfm } from '@/misc/extract-custom-emojis-from-mfm.js';
import { normalizeForSearch } from '@/misc/normalize-for-search.js';
import { trackPromise } from '@/misc/promise-tracker.js';
import { NoteCreateService } from '@/core/NoteCreateService.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { RemoteUserResolveService } from '@/core/RemoteUserResolveService.js';
import { RoleService } from '@/core/RoleService.js';
import { SearchService } from '@/core/SearchService.js';
import { HashtagService } from '@/core/HashtagService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { ApRendererService } from '@/core/activitypub/ApRendererService.js';
import { ApDeliverManagerService } from '@/core/activitypub/ApDeliverManagerService.js';
import { RelayService } from '@/core/RelayService.js';
import { NookAccessService } from '@/nook/policy/NookAccessService.js';

const MAX_EDIT_HISTORY = 100;

export const meta = {
	tags: ['notes'],
	requireCredential: true,
	prohibitMoved: true,
	kind: 'write:notes',
	limit: {
		duration: 1000 * 60 * 60,
		max: 60,
	},
	res: {
		type: 'object',
		optional: false, nullable: false,
		ref: 'Note',
	},
	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: '0d9df332-f24e-4fc7-a8b7-cf4023460fea',
		},
		notOwner: {
			message: 'You can only edit your own local notes.',
			code: 'NOT_NOTE_OWNER',
			id: 'e5807502-5201-42ea-b582-00bedfd4a53a',
			httpStatusCode: 403,
		},
		pureRenote: {
			message: 'A pure Renote cannot be edited.',
			code: 'CANNOT_EDIT_PURE_RENOTE',
			id: 'd49fb2cc-7305-4f12-bf87-4b13d46135ed',
		},
		contentRequired: {
			message: 'The edit would leave the note without content.',
			code: 'CONTENT_REQUIRED',
			id: 'cbab26e8-020d-4b09-b8c6-32ad64110271',
		},
		containsProhibitedWords: {
			message: 'Cannot edit because it contains prohibited words.',
			code: 'CONTAINS_PROHIBITED_WORDS',
			id: 'a351dc44-4325-45c6-a0e9-c6ea22c5a18d',
		},
		containsTooManyMentions: {
			message: 'Cannot edit because it exceeds the allowed number of mentions.',
			code: 'CONTAINS_TOO_MANY_MENTIONS',
			id: 'c3cad4aa-0ef5-4d57-bdf6-b488292f3c3f',
		},
		cannotExpandAudience: {
			message: 'Editing this note cannot add new mentioned recipients without changing visibility.',
			code: 'CANNOT_EXPAND_NOTE_AUDIENCE_BY_EDIT',
			id: '7d483f99-79c7-4b05-9ca7-273a60f2929d',
		},
		restrictedByNookPolicy: {
			message: 'You are not allowed to edit a note under the current Nook policy.',
			code: 'RESTRICTED_BY_NOOK_POLICY',
			id: '0749765e-dc45-47ed-94c7-cfbb607f34be',
			kind: 'permission',
			httpStatusCode: 403,
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		noteId: { type: 'string', format: 'misskey:id' },
		text: { type: 'string', nullable: true, maxLength: MAX_NOTE_TEXT_LENGTH },
		cw: { type: 'string', nullable: true, maxLength: 100 },
	},
	required: ['noteId', 'text', 'cw'],
} as const;

type MinimumUser = Pick<MiUser, 'id' | 'host' | 'username' | 'uri'>;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,

		private noteCreateService: NoteCreateService,
		private noteEntityService: NoteEntityService,
		private userEntityService: UserEntityService,
		private remoteUserResolveService: RemoteUserResolveService,
		private roleService: RoleService,
		private searchService: SearchService,
		private hashtagService: HashtagService,
		private globalEventService: GlobalEventService,
		private apRendererService: ApRendererService,
		private apDeliverManagerService: ApDeliverManagerService,
		private relayService: RelayService,
		private nookAccessService: NookAccessService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const postDecision = await this.nookAccessService.evaluate(me, 'create_post');
			if (!postDecision.allowed) {
				throw new ApiError(meta.errors.restrictedByNookPolicy);
			}

			const text = ps.text == null || ps.text.trim() === '' ? null : ps.text.trim();
			const cw = ps.cw == null || ps.cw.trim() === '' ? null : ps.cw.trim();

			if (this.noteCreateService.checkProhibitedWordsContain({ text, cw })) {
				throw new ApiError(meta.errors.containsProhibitedWords);
			}

			const tokens = text == null ? [] : mfm.parse(text);
			const cwTokens = cw == null ? [] : mfm.parse(cw);
			const combinedTokens = tokens.concat(cwTokens);
			const tags = extractHashtags(combinedTokens)
				.filter(tag => Array.from(tag).length <= 128)
				.slice(0, 32)
				.map(tag => normalizeForSearch(tag));
			const emojis = extractCustomEmojisFromMfm(combinedTokens);
			const bodyMentionedUsers = await this.extractMentionedUsers(me, combinedTokens);

			const mentionLimit = (await this.roleService.getUserPolicies(me.id)).mentionLimit;
			if (bodyMentionedUsers.length > mentionLimit) {
				throw new ApiError(meta.errors.containsTooManyMentions);
			}

			const note = await this.notesRepository.manager.transaction(async transactionalEntityManager => {
				const lockedNote = await transactionalEntityManager.findOne(MiNote, {
					where: { id: ps.noteId },
					lock: { mode: 'pessimistic_write' },
				});

				if (lockedNote == null) throw new ApiError(meta.errors.noSuchNote);
				if (lockedNote.userId !== me.id || lockedNote.userHost !== null || lockedNote.uri !== null) {
					throw new ApiError(meta.errors.notOwner);
				}

				const wasPureRenote = this.isPureRenote(lockedNote, lockedNote.text, lockedNote.cw);
				if (wasPureRenote) throw new ApiError(meta.errors.pureRenote);

				if (text == null && lockedNote.fileIds.length === 0 && !lockedNote.hasPoll && lockedNote.renoteId == null) {
					throw new ApiError(meta.errors.contentRequired);
				}
				if (this.isPureRenote(lockedNote, text, cw)) {
					throw new ApiError(meta.errors.pureRenote);
				}

				if (lockedNote.visibility === 'followers' || lockedNote.visibility === 'specified') {
					const previousAudience = new Set(lockedNote.mentions);
					if (bodyMentionedUsers.some(user => !previousAudience.has(user.id))) {
						throw new ApiError(meta.errors.cannotExpandAudience);
					}
				}

				const mentionedUsers = [...bodyMentionedUsers];
				const structuralUserIds = [
					...(lockedNote.replyUserId == null || lockedNote.replyUserId === me.id ? [] : [lockedNote.replyUserId]),
					...(lockedNote.visibility === 'specified' ? lockedNote.visibleUserIds : []),
				];
				if (structuralUserIds.length > 0) {
					const structuralUsers = await transactionalEntityManager.findBy(this.usersRepository.target, {
						id: In([...new Set(structuralUserIds)]),
					});
					for (const user of structuralUsers) {
						if (!mentionedUsers.some(mentioned => mentioned.id === user.id)) mentionedUsers.push(user);
					}
				}

				if (mentionedUsers.length > mentionLimit) {
					throw new ApiError(meta.errors.containsTooManyMentions);
				}

				const mentionedRemoteUsers = await this.serializeRemoteMentions(mentionedUsers);
				const editedAt = new Date();
				const revision: NoteEditRevision = {
					editedAt: editedAt.toISOString(),
					text: lockedNote.text,
					cw: lockedNote.cw,
				};

				if (lockedNote.text === text && lockedNote.cw === cw) return lockedNote;

				lockedNote.text = text;
				lockedNote.cw = cw;
				lockedNote.tags = tags;
				lockedNote.emojis = emojis;
				lockedNote.mentions = mentionedUsers.map(user => user.id);
				lockedNote.mentionedRemoteUsers = mentionedRemoteUsers;
				lockedNote.editedAt = editedAt;
				lockedNote.editHistory = [...(lockedNote.editHistory ?? []), revision].slice(-MAX_EDIT_HISTORY);

				await transactionalEntityManager.save(MiNote, lockedNote);
				return lockedNote;
			});

			if (note.text !== text || note.cw !== cw) {
				// This branch is only reachable for a no-op edit returned before assignment.
				return await this.noteEntityService.pack(note, me, { detail: true });
			}

			await this.refreshSearchIndex(note);
			if (note.visibility === 'public' || note.visibility === 'home') {
				this.hashtagService.updateHashtags(me, note.tags);
			}

			this.globalEventService.publishNoteStream(note, 'updated', {
				text: note.text,
				cw: note.cw,
				editedAt: note.editedAt!.toISOString(),
			});

			if (!note.localOnly) {
				trackPromise(this.deliverUpdate(me, note));
			}

			return await this.noteEntityService.pack(note, me, { detail: true });
		});
	}

	private isPureRenote(note: MiNote, text: string | null, cw: string | null): boolean {
		return note.renoteId != null &&
			text == null &&
			cw == null &&
			note.replyId == null &&
			note.fileIds.length === 0 &&
			!note.hasPoll;
	}

	private async extractMentionedUsers(user: MiLocalUser, tokens: mfm.MfmNode[]): Promise<MinimumUser[]> {
		const mentions = extractMentions(tokens);
		const users = (await Promise.all(mentions.map(mention =>
			this.remoteUserResolveService.resolveUser(mention.username, mention.host ?? user.host).catch(() => null),
		))).filter((mentioned): mentioned is MiUser => mentioned != null);

		return users.filter((mentioned, index, all) => index === all.findIndex(other => other.id === mentioned.id));
	}

	private async serializeRemoteMentions(mentionedUsers: MinimumUser[]): Promise<string> {
		if (mentionedUsers.length === 0) return '[]';
		const profiles = await this.userProfilesRepository.findBy({ userId: In(mentionedUsers.map(user => user.id)) });
		return JSON.stringify(mentionedUsers
			.filter(user => this.userEntityService.isRemoteUser(user as MiUser))
			.map(user => {
				const profile = profiles.find(candidate => candidate.userId === user.id);
				return {
					uri: user.uri!,
					url: profile?.url ?? undefined,
					username: user.username,
					host: user.host!,
				} satisfies IMentionedRemoteUsers[0];
			}));
	}

	private async refreshSearchIndex(note: MiNote): Promise<void> {
		await this.searchService.unindexNote(note);
		if (note.text != null || note.cw != null) await this.searchService.indexNote(note);
	}

	private async deliverUpdate(user: MiLocalUser, note: MiNote): Promise<void> {
		const activity = this.apRendererService.addContext(
			this.apRendererService.renderUpdate(await this.apRendererService.renderNote(note, false), user),
		);
		const manager = this.apDeliverManagerService.createDeliverManager(user, activity);

		const remoteMentionIds = note.mentions.length === 0 ? [] : await this.usersRepository.findBy({ id: In(note.mentions) });
		for (const mentioned of remoteMentionIds) {
			if (this.userEntityService.isRemoteUser(mentioned)) manager.addDirectRecipe(mentioned as MiRemoteUser);
		}

		for (const targetId of [note.replyUserId, note.renoteUserId]) {
			if (targetId == null) continue;
			const target = await this.usersRepository.findOneBy({ id: targetId });
			if (target != null && this.userEntityService.isRemoteUser(target)) manager.addDirectRecipe(target as MiRemoteUser);
		}

		if (note.visibility === 'public' || note.visibility === 'home' || note.visibility === 'followers') {
			manager.addFollowersRecipe();
		}
		if (note.visibility === 'public') {
			await this.relayService.deliverToRelays(user, activity);
		}
		await manager.execute();
	}
}
