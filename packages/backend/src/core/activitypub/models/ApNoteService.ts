/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import * as Redis from 'ioredis';
import * as mfm from 'mfm-js';
import { DI } from '@/di-symbols.js';
import type { PollsRepository, EmojisRepository, MiMeta, NotesRepository } from '@/models/_.js';
import type { Config } from '@/config.js';
import type { MiRemoteUser } from '@/models/User.js';
import { MiNote } from '@/models/Note.js';
import type { NoteEditRevision } from '@/models/Note.js';
import { acquireApObjectLock } from '@/misc/distributed-lock.js';
import { toArray, toSingle, unique } from '@/misc/prelude/array.js';
import type { MiEmoji } from '@/models/Emoji.js';
import type { MiDriveFile } from '@/models/DriveFile.js';
import { NoteCreateService } from '@/core/NoteCreateService.js';
import type Logger from '@/logger.js';
import { IdService } from '@/core/IdService.js';
import { PollService } from '@/core/PollService.js';
import { StatusError } from '@/misc/status-error.js';
import { UtilityService } from '@/core/UtilityService.js';
import { SearchService } from '@/core/SearchService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { bindThis } from '@/decorators.js';
import { checkHttps } from '@/misc/check-https.js';
import { IdentifiableError } from '@/misc/identifiable-error.js';
import { extractHashtags } from '@/misc/extract-hashtags.js';
import { extractCustomEmojisFromMfm } from '@/misc/extract-custom-emojis-from-mfm.js';
import { normalizeForSearch } from '@/misc/normalize-for-search.js';
import { getOneApId, getApId, getOneApHrefNullable, validPost, isEmoji, getApType } from '../type.js';
import { ApLoggerService } from '../ApLoggerService.js';
import { ApMfmService } from '../ApMfmService.js';
import { ApDbResolverService } from '../ApDbResolverService.js';
import { ApResolverService } from '../ApResolverService.js';
import { ApAudienceService } from '../ApAudienceService.js';
import { ApPersonService } from './ApPersonService.js';
import { extractApHashtags } from './tag.js';
import { ApMentionService } from './ApMentionService.js';
import { ApQuestionService } from './ApQuestionService.js';
import { ApImageService } from './ApImageService.js';
import type { Resolver } from '../ApResolverService.js';
import type { IObject, IPost } from '../type.js';

@Injectable()
export class ApNoteService {
	private logger: Logger;

	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.meta)
		private meta: MiMeta,

		@Inject(DI.redis)
		private redisClient: Redis.Redis,

		@Inject(DI.pollsRepository)
		private pollsRepository: PollsRepository,

		@Inject(DI.emojisRepository)
		private emojisRepository: EmojisRepository,

		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		private idService: IdService,
		private apMfmService: ApMfmService,
		private apResolverService: ApResolverService,

		// 循環参照のため / for circular dependency
		@Inject(forwardRef(() => ApPersonService))
		private apPersonService: ApPersonService,

		private utilityService: UtilityService,
		private searchService: SearchService,
		private globalEventService: GlobalEventService,
		private apAudienceService: ApAudienceService,
		private apMentionService: ApMentionService,
		private apImageService: ApImageService,
		private apQuestionService: ApQuestionService,
		private pollService: PollService,
		private noteCreateService: NoteCreateService,
		private apDbResolverService: ApDbResolverService,
		private apLoggerService: ApLoggerService,
	) {
		this.logger = this.apLoggerService.logger;
	}

	@bindThis
	public validateNote(object: IObject, uri: string, actor?: MiRemoteUser): Error | null {
		const expectHost = this.utilityService.extractDbHost(uri);
		const apType = getApType(object);

		if (apType == null || !validPost.includes(apType)) {
			return new IdentifiableError('d450b8a9-48e4-4dab-ae36-f4db763fda7c', `invalid Note: invalid object type ${apType ?? 'undefined'}`);
		}

		if (object.id && this.utilityService.extractDbHost(object.id) !== expectHost) {
			return new IdentifiableError('d450b8a9-48e4-4dab-ae36-f4db763fda7c', `invalid Note: id has different host. expected: ${expectHost}, actual: ${this.utilityService.extractDbHost(object.id)}`);
		}

		const actualHost = object.attributedTo && this.utilityService.extractDbHost(getOneApId(object.attributedTo));
		if (object.attributedTo && actualHost !== expectHost) {
			return new IdentifiableError('d450b8a9-48e4-4dab-ae36-f4db763fda7c', `invalid Note: attributedTo has different host. expected: ${expectHost}, actual: ${actualHost}`);
		}

		if (object.published && !this.idService.isSafeT(new Date(object.published).valueOf())) {
			return new IdentifiableError('d450b8a9-48e4-4dab-ae36-f4db763fda7c', 'invalid Note: published timestamp is malformed');
		}

		if (actor) {
			const attribution = (object.attributedTo) ? getOneApId(object.attributedTo) : actor.uri;

			if (attribution !== actor.uri) {
				return new IdentifiableError('d450b8a9-48e4-4dab-ae36-f4db763fda7c', `invalid Note: attribution does not match the actor that send it. attribution: ${attribution}, actor: ${actor.uri}`);
			}
		}

		return null;
	}

	/**
	 * Noteをフェッチします。
	 *
	 * Misskeyに対象のNoteが登録されていればそれを返します。
	 */
	@bindThis
	public async fetchNote(object: string | IObject): Promise<MiNote | null> {
		return await this.apDbResolverService.getNoteFromApId(object);
	}

	/**
	 * Apply a remote ActivityPub Note Update without changing its audience,
	 * attachments, poll, reply/renote target, or local counters.
	 */
	@bindThis
	public async updateNote(note: IPost, actor: MiRemoteUser, activityPublished?: string): Promise<string> {
		if (note.id == null) return 'skip: Note Update has no id';

		const validationError = this.validateNote(note, note.id, actor);
		if (validationError) {
			this.logger.warn(`Skipping invalid Note Update: ${validationError.message}`);
			return 'skip: invalid Note Update';
		}

		const existing = await this.fetchNote(note.id);
		if (existing == null) return 'skip: target Note not found';
		if (existing.userId !== actor.id || existing.userHost == null) return 'skip: invalid Note owner';

		const timestamp = note.updated ?? activityPublished;
		if (timestamp == null) return 'skip: Note Update has no timestamp';
		const editedAt = new Date(timestamp);
		if (!Number.isFinite(editedAt.valueOf()) || !this.idService.isSafeT(editedAt.valueOf())) {
			return 'skip: invalid Note Update timestamp';
		}

		const cw = note.summary === '' ? null : (typeof note.summary === 'string' ? note.summary : null);
		let text: string | null = null;
		if (note.source?.mediaType === 'text/x.misskeymarkdown' && typeof note.source.content === 'string') {
			text = note.source.content;
		} else if (typeof note._misskey_content === 'string') {
			text = note._misskey_content;
		} else if (typeof note.content === 'string') {
			text = this.apMfmService.htmlToMfm(note.content, note.tag);
		}

		if (this.noteCreateService.checkProhibitedWordsContain({ cw, text })) {
			return 'skip: Note Update contains prohibited words';
		}

		const tokens = [
			...(text == null ? [] : mfm.parse(text)),
			...(cw == null ? [] : mfm.parse(cw)),
		];
		const tags = extractHashtags(tokens)
			.filter(tag => Array.from(tag).length <= 128)
			.slice(0, 32)
			.map(tag => normalizeForSearch(tag));
		const emojis = extractCustomEmojisFromMfm(tokens);

		const result = await this.notesRepository.manager.transaction(async transactionalEntityManager => {
			const lockedNote = await transactionalEntityManager.findOne(MiNote, {
				where: { id: existing.id },
				lock: { mode: 'pessimistic_write' },
			});
			if (lockedNote == null) return { changed: false, reason: 'skip: target Note not found' } as const;
			if (lockedNote.userId !== actor.id || lockedNote.userHost == null || lockedNote.uri !== note.id) {
				return { changed: false, reason: 'skip: invalid Note owner' } as const;
			}

			const previousChangeAt = lockedNote.editedAt ?? this.idService.parse(lockedNote.id).date;
			if (editedAt.getTime() <= previousChangeAt.getTime()) {
				return { changed: false, reason: 'skip: stale Note Update' } as const;
			}
			if (lockedNote.text === text && lockedNote.cw === cw) {
				return { changed: false, reason: 'ok: Note Update is a no-op' } as const;
			}
			if (text == null && lockedNote.fileIds.length === 0 && !lockedNote.hasPoll && lockedNote.renoteId == null) {
				return { changed: false, reason: 'skip: Note Update would remove all content' } as const;
			}

			const revision: NoteEditRevision = {
				editedAt: editedAt.toISOString(),
				text: lockedNote.text,
				cw: lockedNote.cw,
			};
			lockedNote.text = text;
			lockedNote.cw = cw;
			lockedNote.tags = tags;
			lockedNote.emojis = emojis;
			lockedNote.editedAt = editedAt;
			lockedNote.editHistory = [...(lockedNote.editHistory ?? []), revision].slice(-20);

			await transactionalEntityManager.save(MiNote, lockedNote);
			return { changed: true, note: lockedNote } as const;
		});

		if (!result.changed) return result.reason;

		await this.searchService.unindexNote(result.note);
		if (result.note.text != null || result.note.cw != null) await this.searchService.indexNote(result.note);
		this.globalEventService.publishNoteStream(result.note, 'updated', {
			text: result.note.text,
			cw: result.note.cw,
			editedAt: result.note.editedAt!.toISOString(),
		});

		return 'ok: Note updated';
	}

	/**
	 * Noteを作成します。
	 */
	@bindThis
	public async createNote(value: string | IObject, actor?: MiRemoteUser, resolver?: Resolver, silent = false): Promise<MiNote | null> {
		// eslint-disable-next-line no-param-reassign
		if (resolver == null) resolver = await this.apResolverService.createResolver();

		const object = await resolver.resolve(value);

		const entryUri = getApId(value);
		const err = this.validateNote(object, entryUri, actor);
		if (err) {
			this.logger.error(err.message, {
				resolver: { history: resolver.getHistory() },
				value,
				object,
			});
			throw err;
		}

		const note = object as IPost;

		this.logger.debug(`Note fetched: ${JSON.stringify(note, null, 2)}`);

		if (note.id == null) {
			throw new Error('Refusing to create note without id');
		}

		if (!checkHttps(note.id)) {
			throw new Error('unexpected schema of note.id: ' + note.id);
		}

		const url = getOneApHrefNullable(note.url);

		if (url && !checkHttps(url)) {
			throw new Error('unexpected schema of note url: ' + url);
		}

		this.logger.info(`Creating the Note: ${note.id}`);

		// 投稿者をフェッチ
		if (note.attributedTo == null) {
			throw new Error('invalid note.attributedTo: ' + note.attributedTo);
		}

		const uri = getOneApId(note.attributedTo);

		// ローカルで投稿者を検索し、もし凍結されていたらスキップ
		// eslint-disable-next-line no-param-reassign
		actor ??= await this.apPersonService.fetchPerson(uri) as MiRemoteUser | undefined;
		if (actor && actor.isSuspended) {
			throw new IdentifiableError('85ab9bd7-3a41-4530-959d-f07073900109', 'actor has been suspended');
		}

		const apMentionRawCount = new Set(this.apMentionService.extractApMentionObjects(note.tag).map(x => x.href)).size;
		const apMentions = await this.apMentionService.extractApMentions(note.tag, resolver);
		const apHashtags = extractApHashtags(note.tag);

		const cw = note.summary === '' ? null : note.summary;

		// テキストのパース
		let text: string | null = null;
		if (note.source?.mediaType === 'text/x.misskeymarkdown' && typeof note.source.content === 'string') {
			text = note.source.content;
		} else if (typeof note._misskey_content !== 'undefined') {
			text = note._misskey_content;
		} else if (typeof note.content === 'string') {
			text = this.apMfmService.htmlToMfm(note.content, note.tag);
		}

		const poll = await this.apQuestionService.extractPollFromQuestion(note, resolver).catch(() => undefined);

		//#region Contents Check
		// 添付ファイルとユーザーをこのサーバーで登録する前に内容をチェックする
		/**
		 * 禁止ワードチェック
		 */
		const hasProhibitedWords = this.noteCreateService.checkProhibitedWordsContain({ cw, text, pollChoices: poll?.choices });
		if (hasProhibitedWords) {
			throw new IdentifiableError('689ee33f-f97c-479a-ac49-1b9f8140af99', 'Note contains prohibited words');
		}
		//#endregion

		// eslint-disable-next-line no-param-reassign
		actor ??= await this.apPersonService.resolvePerson(uri, resolver) as MiRemoteUser;

		// 解決した投稿者が凍結されていたらスキップ
		if (actor.isSuspended) {
			throw new IdentifiableError('85ab9bd7-3a41-4530-959d-f07073900109', 'actor has been suspended');
		}

		const noteAudience = await this.apAudienceService.parseAudience(actor, note.to, note.cc, resolver);
		let visibility = noteAudience.visibility;
		const visibleUsers = noteAudience.visibleUsers;

		// Audience (to, cc) が指定されてなかった場合
		if (visibility === 'specified' && visibleUsers.length === 0) {
			if (typeof value === 'string') {	// 入力がstringならばresolverでGETが発生している
				// こちらから匿名GET出来たものならばpublic
				visibility = 'public';
			}
		}

		// 添付ファイル
		const files: MiDriveFile[] = [];

		for (const attach of toArray(note.attachment)) {
			attach.sensitive ??= note.sensitive;
			const file = await this.apImageService.resolveImage(actor, attach);
			if (file) files.push(file);
		}

		// リプライ
		const reply: MiNote | null = note.inReplyTo
			? await this.resolveNote(note.inReplyTo, { resolver })
				.then(x => {
					if (x == null) {
						this.logger.warn('Specified inReplyTo, but not found');
						throw new Error('inReplyTo not found');
					}

					return x;
				})
				.catch(async err => {
					this.logger.warn(`Error in inReplyTo ${note.inReplyTo} - ${err.statusCode ?? err}`);
					throw err;
				})
			: null;

		// 引用
		let quote: MiNote | undefined | null = null;

		if (note._misskey_quote ?? note.quoteUrl) {
			const tryResolveNote = async (uri: string): Promise<
				| { status: 'ok'; res: MiNote }
				| { status: 'permerror' | 'temperror' }
			> => {
				if (!/^https?:/.test(uri)) return { status: 'permerror' };
				try {
					const res = await this.resolveNote(uri);
					if (res == null) return { status: 'permerror' };
					return { status: 'ok', res };
				} catch (e) {
					return {
						status: (e instanceof StatusError && !e.isRetryable) ? 'permerror' : 'temperror',
					};
				}
			};

			const uris = unique([note._misskey_quote, note.quoteUrl].filter(x => x != null));
			const results = await Promise.all(uris.map(tryResolveNote));

			quote = results.filter((x): x is { status: 'ok', res: MiNote } => x.status === 'ok').map(x => x.res).at(0);
			if (!quote) {
				if (results.some(x => x.status === 'temperror')) {
					throw new Error('quote resolve failed');
				}
			}
		}

		// vote
		if (reply && reply.hasPoll) {
			const poll = await this.pollsRepository.findOneByOrFail({ noteId: reply.id });

			const tryCreateVote = async (name: string, index: number): Promise<null> => {
				if (poll.expiresAt && Date.now() > new Date(poll.expiresAt).getTime()) {
					this.logger.warn(`vote to expired poll from AP: actor=${actor.username}@${actor.host}, note=${note.id}, choice=${name}`);
				} else if (index >= 0) {
					this.logger.info(`vote from AP: actor=${actor.username}@${actor.host}, note=${note.id}, choice=${name}`);
					await this.pollService.vote(actor, reply, index);

					// リモートフォロワーにUpdate配信
					this.pollService.deliverQuestionUpdate(reply.id);
				}
				return null;
			};

			if (note.name) {
				return await tryCreateVote(note.name, poll.choices.findIndex(x => x === note.name));
			}
		}

		const emojis = await this.extractEmojis(note.tag ?? [], actor.host).catch(e => {
			this.logger.info(`extractEmojis: ${e}`);
			return [];
		});

		const apEmojis = emojis.map(emoji => emoji.name);

		try {
			return await this.noteCreateService.create(actor, {
				createdAt: note.published ? new Date(note.published) : null,
				files,
				reply,
				renote: quote,
				name: note.name,
				cw,
				text,
				localOnly: false,
				visibility,
				visibleUsers,
				apMentions,
				apMentionRawCount,
				apHashtags,
				apEmojis,
				poll,
				uri: note.id,
				url: url,
			}, silent);
		} catch (err: any) {
			if (err.name !== 'duplicated') {
				throw err;
			}
			this.logger.info('The note is already inserted while creating itself, reading again');
			const duplicate = await this.fetchNote(value);
			if (!duplicate) {
				throw new Error('The note creation failed with duplication error even when there is no duplication');
			}
			return duplicate;
		}
	}

	/**
	 * Noteを解決します。
	 *
	 * Misskeyに対象のNoteが登録されていればそれを返し、そうでなければ
	 * リモートサーバーからフェッチしてMisskeyに登録しそれを返します。
	 */
	@bindThis
	public async resolveNote(value: string | IObject, options: { sentFrom?: URL, resolver?: Resolver } = {}): Promise<MiNote | null> {
		const uri = getApId(value);

		if (!this.utilityService.isFederationAllowedUri(uri)) {
			throw new StatusError('blocked host', 451);
		}

		const unlock = await acquireApObjectLock(this.redisClient, uri);

		try {
			//#region このサーバーに既に登録されていたらそれを返す
			const exist = await this.fetchNote(uri);
			if (exist) return exist;
			//#endregion

			if (this.utilityService.isUriLocal(uri)) {
				throw new StatusError('cannot resolve local note', 400, 'cannot resolve local note');
			}

			// リモートサーバーからフェッチしてきて登録
			// ここでuriの代わりに添付されてきたNote Objectが指定されていると、サーバーフェッチを経ずにノートが生成されるが
			// 添付されてきたNote Objectは偽装されている可能性があるため、常にuriを指定してサーバーフェッチを行う。
			const createFrom = options.sentFrom?.origin === new URL(uri).origin ? value : uri;
			return await this.createNote(createFrom, undefined, options.resolver, true);
		} finally {
			unlock();
		}
	}

	@bindThis
	public async extractEmojis(tags: IObject | IObject[], host: string): Promise<MiEmoji[]> {
		// eslint-disable-next-line no-param-reassign
		host = this.utilityService.toPuny(host);

		const eomjiTags = toArray(tags).filter(isEmoji);

		const existingEmojis = await this.emojisRepository.findBy({
			host,
			name: In(eomjiTags.map(tag => tag.name.replaceAll(':', ''))),
		});

		return await Promise.all(eomjiTags.map(async tag => {
			const name = tag.name.replaceAll(':', '');
			tag.icon = toSingle(tag.icon);

			const exists = existingEmojis.find(x => x.name === name);

			if (exists) {
				if ((exists.updatedAt == null)
					|| (tag.id != null && exists.uri == null)
					|| (new Date(tag.updated) > exists.updatedAt)
					|| (tag.icon.url !== exists.originalUrl)
				) {
					await this.emojisRepository.update({
						host,
						name,
					}, {
						uri: tag.id,
						originalUrl: tag.icon.url,
						publicUrl: tag.icon.url,
						updatedAt: new Date(),
						// _misskey_license が存在しなければ `null`
						license: (tag._misskey_license?.freeText ?? null)
					});

					const emoji = await this.emojisRepository.findOneBy({ host, name });
					if (emoji == null) throw new Error('emoji update failed');
					return emoji;
				}

				return exists;
			}

			this.logger.info(`register emoji host=${host}, name=${name}`);

			return await this.emojisRepository.insertOne({
				id: this.idService.gen(),
				host,
				name,
				uri: tag.id,
				originalUrl: tag.icon.url,
				publicUrl: tag.icon.url,
				updatedAt: new Date(),
				aliases: [],
				// _misskey_license が存在しなければ `null`
				license: (tag._misskey_license?.freeText ?? null)
			});
		}));
	}
}
