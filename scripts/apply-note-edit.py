from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}')
    p.write_text(text.replace(old, new))


replace(
    'packages/backend/src/server/api/nook-endpoint-list.ts',
    "export * as 'notes/recommended' from './endpoints/notes/recommended.js';",
    "export * as 'notes/edit' from './endpoints/notes/edit.js';\nexport * as 'notes/recommended' from './endpoints/notes/recommended.js';",
)

replace(
    'packages/backend/src/models/Note.ts',
    "// Note: When you create a new index for existing column of this table,",
    "export type NoteEditRevision = Readonly<{\n\teditedAt: string;\n\ttext: string | null;\n\tcw: string | null;\n}>;\n\n// Note: When you create a new index for existing column of this table,",
)
replace(
    'packages/backend/src/models/Note.ts',
    "\tpublic cw: string | null;\n\n\t@Column({",
    "\tpublic cw: string | null;\n\n\t@Column('timestamp with time zone', {\n\t\tnullable: true,\n\t})\n\tpublic editedAt: Date | null;\n\n\t@Column('jsonb', {\n\t\tdefault: () => \"'[]'::jsonb\",\n\t})\n\tpublic editHistory: NoteEditRevision[];\n\n\t@Column({",
)

replace(
    'packages/backend/src/models/json-schema/note.ts',
    "\t\tcreatedAt: {\n\t\t\ttype: 'string',\n\t\t\toptional: false, nullable: false,\n\t\t\tformat: 'date-time',\n\t\t},\n\t\tdeletedAt:",
    "\t\tcreatedAt: {\n\t\t\ttype: 'string',\n\t\t\toptional: false, nullable: false,\n\t\t\tformat: 'date-time',\n\t\t},\n\t\teditedAt: {\n\t\t\ttype: 'string',\n\t\t\toptional: true, nullable: true,\n\t\t\tformat: 'date-time',\n\t\t},\n\t\tdeletedAt:",
)
replace(
    'packages/backend/src/core/entities/NoteEntityService.ts',
    "\t\t\tid: note.id,\n\t\t\tcreatedAt: this.idService.parse(note.id).date.toISOString(),\n\t\t\tuserId:",
    "\t\t\tid: note.id,\n\t\t\tcreatedAt: this.idService.parse(note.id).date.toISOString(),\n\t\t\teditedAt: note.editedAt?.toISOString() ?? null,\n\t\t\tuserId:",
)

replace(
    'packages/backend/src/core/GlobalEventService.ts',
    "\tupdated: {\n\t\tcw: string | null;\n\t\ttext: string;\n\t};",
    "\tupdated: {\n\t\tcw: string | null;\n\t\ttext: string | null;\n\t\teditedAt: string;\n\t};",
)

replace(
    'packages/backend/src/core/activitypub/type.ts',
    "\tpublished?: string;\n\tcc?: ApObject;",
    "\tpublished?: string;\n\tupdated?: string;\n\tcc?: ApObject;",
)
replace(
    'packages/backend/src/core/activitypub/ApRendererService.ts',
    "\t\t\t_misskey_quote: quote,\n\t\t\tquoteUrl: quote,\n\t\t\tpublished: this.idService.parse(note.id).date.toISOString(),\n\t\t\tto,",
    "\t\t\t_misskey_quote: quote,\n\t\t\tquoteUrl: quote,\n\t\t\tpublished: this.idService.parse(note.id).date.toISOString(),\n\t\t\tupdated: note.editedAt?.toISOString(),\n\t\t\tto,",
)

replace(
    'packages/misskey-js/src/streaming.types.ts',
    "} | {\n\ttype: 'pollVoted';\n\tbody: {",
    "} | {\n\ttype: 'updated';\n\tbody: {\n\t\tcw: string | null;\n\t\ttext: string | null;\n\t\teditedAt: string;\n\t};\n} | {\n\ttype: 'pollVoted';\n\tbody: {",
)

replace(
    'packages/frontend/src/events.ts',
    "\tnotePosted: (note: Misskey.entities.Note) => void;\n\tnoteDeleted:",
    "\tnotePosted: (note: Misskey.entities.Note) => void;\n\tnoteEdited: (note: Misskey.entities.Note) => void;\n\tnoteDeleted:",
)

replace(
    'packages/frontend/src/composables/use-note.ts',
    "import { ref, computed } from 'vue';",
    "import { ref, computed, reactive, watch } from 'vue';",
)
replace(
    'packages/frontend/src/composables/use-note.ts',
    "\tconst appearNote = getAppearNote(rawNote) ?? rawNote;",
    "\tconst appearNote = reactive(getAppearNote(rawNote) ?? rawNote) as Misskey.entities.Note;",
)
replace(
    'packages/frontend/src/composables/use-note.ts',
    "\tconst renoteCollapsed = ref(prefer.s.collapseRenotes && isRenote && (($i && ($i.id === rawNote.userId || $i.id === appearNote.userId)) || ($appearNote.myReaction != null)));\n\n\tconst pleaseLoginContext",
    "\tconst renoteCollapsed = ref(prefer.s.collapseRenotes && isRenote && (($i && ($i.id === rawNote.userId || $i.id === appearNote.userId)) || ($appearNote.myReaction != null)));\n\n\twatch(() => [appearNote.text, appearNote.cw], () => {\n\t\ttranslation.value = null;\n\t\tmuted.value = $i ? calculateMuteStatus(appearNote, $i, $i.mutedWords, inTimeline && !tl_withSensitive.value) : false;\n\t\thardMuted.value = props.withHardMute && $i ? calculateMuteStatus(appearNote, $i, $i.hardMutedWords, inTimeline && !tl_withSensitive.value, true) : false;\n\t\tcollapsed.value = appearNote.cw == null && isLong.value;\n\t});\n\n\tconst pleaseLoginContext",
)
replace(
    'packages/frontend/src/composables/use-note.ts',
    "\tuseGlobalEvent('noteDeleted', (noteId) => {\n\t\tif (noteId === rawNote.id || noteId === appearNote.id) {\n\t\t\tisDeleted.value = true;\n\t\t}\n\t});\n\n\t// ツールチップ",
    "\tuseGlobalEvent('noteDeleted', (noteId) => {\n\t\tif (noteId === rawNote.id || noteId === appearNote.id) {\n\t\t\tisDeleted.value = true;\n\t\t}\n\t});\n\tuseGlobalEvent('noteEdited', (editedNote) => {\n\t\tif (editedNote.id !== appearNote.id) return;\n\t\tappearNote.text = editedNote.text;\n\t\tappearNote.cw = editedNote.cw;\n\t\tappearNote.editedAt = editedNote.editedAt;\n\t});\n\n\t// ツールチップ",
)

replace(
    'packages/frontend/src/composables/use-note-capture.ts',
    "function realtimeSubscribe(props: {\n\tnote: Pick<Misskey.entities.Note, 'id' | 'createdAt'>;\n}): void {",
    "function realtimeSubscribe(props: {\n\tnote: Misskey.entities.Note;\n}): void {",
)
replace(
    'packages/frontend/src/composables/use-note-capture.ts',
    "\t\t\tcase 'deleted': {\n\t\t\t\tglobalEvents.emit('noteDeleted', id);\n\t\t\t\tbreak;\n\t\t\t}\n\t\t}",
    "\t\t\tcase 'updated': {\n\t\t\t\tnote.text = body.text;\n\t\t\t\tnote.cw = body.cw;\n\t\t\t\tnote.editedAt = body.editedAt;\n\t\t\t\tglobalEvents.emit('noteEdited', note);\n\t\t\t\tbreak;\n\t\t\t}\n\n\t\t\tcase 'deleted': {\n\t\t\t\tglobalEvents.emit('noteDeleted', id);\n\t\t\t\tbreak;\n\t\t\t}\n\t\t}",
)

replace(
    'packages/frontend/src/utility/get-note-menu.ts',
    "\tfunction delEdit(): void {",
    "\tasync function edit(): Promise<void> {\n\t\tif ($i == null) return;\n\t\tconst { canceled, result } = await os.form(i18n.ts.edit, {\n\t\t\ttext: {\n\t\t\t\ttype: 'string',\n\t\t\t\trequired: false,\n\t\t\t\tdefault: appearNote.text ?? '',\n\t\t\t\tmultiline: true,\n\t\t\t\tlabel: i18n.ts.note,\n\t\t\t},\n\t\t\tuseCw: {\n\t\t\t\ttype: 'boolean',\n\t\t\t\tdefault: appearNote.cw != null,\n\t\t\t\tlabel: i18n.ts.useCw,\n\t\t\t},\n\t\t\tcw: {\n\t\t\t\ttype: 'string',\n\t\t\t\trequired: false,\n\t\t\t\tdefault: appearNote.cw ?? '',\n\t\t\t\tmultiline: true,\n\t\t\t\tlabel: i18n.ts.annotation,\n\t\t\t},\n\t\t});\n\t\tif (canceled) return;\n\n\t\tconst edited = await os.apiWithDialog('notes/edit', {\n\t\t\tnoteId: appearNote.id,\n\t\t\ttext: result.text.trim() === '' ? null : result.text,\n\t\t\tcw: result.useCw ? result.cw : null,\n\t\t});\n\t\tglobalEvents.emit('noteEdited', edited);\n\t}\n\n\tfunction delEdit(): void {",
)
replace(
    'packages/frontend/src/utility/get-note-menu.ts',
    "\t\t\tif (appearNote.userId === $i.id) {\n\t\t\t\tmenuItems.push({\n\t\t\t\t\ticon: 'ti ti-edit',\n\t\t\t\t\ttext: i18n.ts.deleteAndEdit,\n\t\t\t\t\taction: delEdit,\n\t\t\t\t});\n\t\t\t}",
    "\t\t\tif (appearNote.userId === $i.id) {\n\t\t\t\tmenuItems.push({\n\t\t\t\t\ticon: 'ti ti-pencil',\n\t\t\t\t\ttext: i18n.ts.edit,\n\t\t\t\t\taction: edit,\n\t\t\t\t}, {\n\t\t\t\t\ticon: 'ti ti-edit',\n\t\t\t\t\ttext: i18n.ts.deleteAndEdit,\n\t\t\t\t\taction: delEdit,\n\t\t\t\t});\n\t\t\t}",
)

replace(
    'packages/frontend/src/components/MkNoteHeader.vue',
    "\t\t<MkA v-else :to=\"notePage(note)\">\n\t\t\t<MkTime :time=\"note.createdAt\" colored/>\n\t\t</MkA>",
    "\t\t<MkA v-else :to=\"notePage(note)\">\n\t\t\t<MkTime :time=\"note.createdAt\" colored/>\n\t\t</MkA>\n\t\t<span v-if=\"note.editedAt\" style=\"margin-left: 0.35em;\" :title=\"i18n.ts.edit\"><i class=\"ti ti-pencil\"></i></span>",
)
replace(
    'packages/frontend/src/components/MkNoteDetailed.vue',
    "<MkTime :time=\"appearNote.createdAt\" mode=\"detail\" colored/>",
    "<MkTime :time=\"appearNote.createdAt\" mode=\"detail\" colored/>\n\t\t\t<span v-if=\"appearNote.editedAt\" style=\"margin-left: 0.5em;\" :title=\"i18n.ts.edit\"><i class=\"ti ti-pencil\"></i> <MkTime :time=\"appearNote.editedAt\" mode=\"detail\"/></span>",
)

Path('packages/backend/migration/1786897200000-note-editing.js').write_text("""/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class NoteEditing1786897200000 {
    name = 'NoteEditing1786897200000'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE \"note\" ADD COLUMN \"editedAt\" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE \"note\" ADD COLUMN \"editHistory\" jsonb NOT NULL DEFAULT '[]'::jsonb`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE \"note\" DROP COLUMN \"editHistory\"`);
        await queryRunner.query(`ALTER TABLE \"note\" DROP COLUMN \"editedAt\"`);
    }
}
""")

Path('packages/backend/src/server/api/endpoints/notes/edit.test.ts').write_text("""/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

process.env.NODE_ENV = 'test';

import { describe, expect, test } from 'vitest';
import { getValidator } from '../../../../../test/prelude/get-api-validator.js';
import { paramDef } from './edit.js';

describe('api:notes/edit', () => {
    const validate = getValidator(paramDef);

    test('requires noteId, text, and cw fields', () => {
        expect(validate({ noteId: '9abc', text: 'hello', cw: null })).toBe(true);
        expect(validate({ noteId: '9abc', text: 'hello' })).toBe(false);
        expect(validate({ text: 'hello', cw: null })).toBe(false);
    });

    test('allows removing text or CW explicitly', () => {
        expect(validate({ noteId: '9abc', text: null, cw: null })).toBe(true);
        expect(validate({ noteId: '9abc', text: 'body', cw: '' })).toBe(true);
    });

    test('rejects an overlong CW', () => {
        expect(validate({ noteId: '9abc', text: 'body', cw: 'x'.repeat(101) })).toBe(false);
    });
});
""")
