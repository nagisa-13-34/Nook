from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}')
    p.write_text(text.replace(old, new))


path = 'packages/backend/src/core/activitypub/models/ApNoteService.ts'
replace(path,
    "import { In } from 'typeorm';\nimport * as Redis from 'ioredis';",
    "import { In } from 'typeorm';\nimport * as Redis from 'ioredis';\nimport * as mfm from 'mfm-js';")
replace(path,
    "import type { PollsRepository, EmojisRepository, MiMeta } from '@/models/_.js';",
    "import type { PollsRepository, EmojisRepository, MiMeta, NotesRepository } from '@/models/_.js';")
replace(path,
    "import type { MiNote } from '@/models/Note.js';",
    "import { MiNote } from '@/models/Note.js';\nimport type { NoteEditRevision } from '@/models/Note.js';")
replace(path,
    "import { UtilityService } from '@/core/UtilityService.js';",
    "import { UtilityService } from '@/core/UtilityService.js';\nimport { SearchService } from '@/core/SearchService.js';\nimport { GlobalEventService } from '@/core/GlobalEventService.js';")
replace(path,
    "import { IdentifiableError } from '@/misc/identifiable-error.js';",
    "import { IdentifiableError } from '@/misc/identifiable-error.js';\nimport { extractHashtags } from '@/misc/extract-hashtags.js';\nimport { extractCustomEmojisFromMfm } from '@/misc/extract-custom-emojis-from-mfm.js';\nimport { normalizeForSearch } from '@/misc/normalize-for-search.js';")
replace(path,
    "\t\t@Inject(DI.emojisRepository)\n\t\tprivate emojisRepository: EmojisRepository,\n\n\t\tprivate idService: IdService,",
    "\t\t@Inject(DI.emojisRepository)\n\t\tprivate emojisRepository: EmojisRepository,\n\n\t\t@Inject(DI.notesRepository)\n\t\tprivate notesRepository: NotesRepository,\n\n\t\tprivate idService: IdService,")
replace(path,
    "\t\tprivate utilityService: UtilityService,\n\t\tprivate apAudienceService: ApAudienceService,",
    "\t\tprivate utilityService: UtilityService,\n\t\tprivate searchService: SearchService,\n\t\tprivate globalEventService: GlobalEventService,\n\t\tprivate apAudienceService: ApAudienceService,")

insert_anchor = """\t@bindThis\n\tpublic async fetchNote(object: string | IObject): Promise<MiNote | null> {\n\t\treturn await this.apDbResolverService.getNoteFromApId(object);\n\t}\n\n\t/**\n\t * Noteを作成します。\n\t */\n"""
insert_value = """\t@bindThis\n\tpublic async fetchNote(object: string | IObject): Promise<MiNote | null> {\n\t\treturn await this.apDbResolverService.getNoteFromApId(object);\n\t}\n\n\t/**\n\t * Apply a remote ActivityPub Note Update without changing its audience,\n\t * attachments, poll, reply/renote target, or local counters.\n\t */\n\t@bindThis\n\tpublic async updateNote(note: IPost, actor: MiRemoteUser, activityPublished?: string): Promise<string> {\n\t\tif (note.id == null) return 'skip: Note Update has no id';\n\n\t\tconst validationError = this.validateNote(note, note.id, actor);\n\t\tif (validationError) {\n\t\t\tthis.logger.warn(`Skipping invalid Note Update: ${validationError.message}`);\n\t\t\treturn 'skip: invalid Note Update';\n\t\t}\n\n\t\tconst existing = await this.fetchNote(note.id);\n\t\tif (existing == null) return 'skip: target Note not found';\n\t\tif (existing.userId !== actor.id || existing.userHost == null) return 'skip: invalid Note owner';\n\n\t\tconst timestamp = note.updated ?? activityPublished;\n\t\tif (timestamp == null) return 'skip: Note Update has no timestamp';\n\t\tconst editedAt = new Date(timestamp);\n\t\tif (!Number.isFinite(editedAt.valueOf()) || !this.idService.isSafeT(editedAt.valueOf())) {\n\t\t\treturn 'skip: invalid Note Update timestamp';\n\t\t}\n\n\t\tconst cw = note.summary === '' ? null : (typeof note.summary === 'string' ? note.summary : null);\n\t\tlet text: string | null = null;\n\t\tif (note.source?.mediaType === 'text/x.misskeymarkdown' && typeof note.source.content === 'string') {\n\t\t\ttext = note.source.content;\n\t\t} else if (typeof note._misskey_content === 'string') {\n\t\t\ttext = note._misskey_content;\n\t\t} else if (typeof note.content === 'string') {\n\t\t\ttext = this.apMfmService.htmlToMfm(note.content, note.tag);\n\t\t}\n\n\t\tif (this.noteCreateService.checkProhibitedWordsContain({ cw, text })) {\n\t\t\treturn 'skip: Note Update contains prohibited words';\n\t\t}\n\n\t\tconst tokens = [\n\t\t\t...(text == null ? [] : mfm.parse(text)),\n\t\t\t...(cw == null ? [] : mfm.parse(cw)),\n\t\t];\n\t\tconst tags = extractHashtags(tokens)\n\t\t\t.filter(tag => Array.from(tag).length <= 128)\n\t\t\t.slice(0, 32)\n\t\t\t.map(tag => normalizeForSearch(tag));\n\t\tconst emojis = extractCustomEmojisFromMfm(tokens);\n\n\t\tconst result = await this.notesRepository.manager.transaction(async transactionalEntityManager => {\n\t\t\tconst lockedNote = await transactionalEntityManager.findOne(MiNote, {\n\t\t\t\twhere: { id: existing.id },\n\t\t\t\tlock: { mode: 'pessimistic_write' },\n\t\t\t});\n\t\t\tif (lockedNote == null) return { changed: false, reason: 'skip: target Note not found' } as const;\n\t\t\tif (lockedNote.userId !== actor.id || lockedNote.userHost == null || lockedNote.uri !== note.id) {\n\t\t\t\treturn { changed: false, reason: 'skip: invalid Note owner' } as const;\n\t\t\t}\n\n\t\t\tconst previousChangeAt = lockedNote.editedAt ?? this.idService.parse(lockedNote.id).date;\n\t\t\tif (editedAt.getTime() <= previousChangeAt.getTime()) {\n\t\t\t\treturn { changed: false, reason: 'skip: stale Note Update' } as const;\n\t\t\t}\n\t\t\tif (lockedNote.text === text && lockedNote.cw === cw) {\n\t\t\t\treturn { changed: false, reason: 'ok: Note Update is a no-op' } as const;\n\t\t\t}\n\t\t\tif (text == null && lockedNote.fileIds.length === 0 && !lockedNote.hasPoll && lockedNote.renoteId == null) {\n\t\t\t\treturn { changed: false, reason: 'skip: Note Update would remove all content' } as const;\n\t\t\t}\n\n\t\t\tconst revision: NoteEditRevision = {\n\t\t\t\teditedAt: editedAt.toISOString(),\n\t\t\t\ttext: lockedNote.text,\n\t\t\t\tcw: lockedNote.cw,\n\t\t\t};\n\t\t\tlockedNote.text = text;\n\t\t\tlockedNote.cw = cw;\n\t\t\tlockedNote.tags = tags;\n\t\t\tlockedNote.emojis = emojis;\n\t\t\tlockedNote.editedAt = editedAt;\n\t\t\tlockedNote.editHistory = [...(lockedNote.editHistory ?? []), revision].slice(-20);\n\n\t\t\tawait transactionalEntityManager.save(MiNote, lockedNote);\n\t\t\treturn { changed: true, note: lockedNote } as const;\n\t\t});\n\n\t\tif (!result.changed) return result.reason;\n\n\t\tawait this.searchService.unindexNote(result.note);\n\t\tif (result.note.text != null || result.note.cw != null) await this.searchService.indexNote(result.note);\n\t\tthis.globalEventService.publishNoteStream(result.note, 'updated', {\n\t\t\ttext: result.note.text,\n\t\t\tcw: result.note.cw,\n\t\t\teditedAt: result.note.editedAt!.toISOString(),\n\t\t});\n\n\t\treturn 'ok: Note updated';\n\t}\n\n\t/**\n\t * Noteを作成します。\n\t */\n"""
replace(path, insert_anchor, insert_value)

path = 'packages/backend/src/core/activitypub/ApInboxService.ts'
replace(path,
    "\t\t} else if (getApType(object) === 'Question') {\n\t\t\tawait this.apQuestionService.updateQuestion(object, actor, resolver).catch(err => console.error(err));\n\t\t\treturn 'ok: Question updated';\n\t\t} else {",
    "\t\t} else if (getApType(object) === 'Question') {\n\t\t\tawait this.apQuestionService.updateQuestion(object, actor, resolver).catch(err => console.error(err));\n\t\t\treturn 'ok: Question updated';\n\t\t} else if (isPost(object)) {\n\t\t\treturn await this.apNoteService.updateNote(object, actor, activity.published);\n\t\t} else {")
