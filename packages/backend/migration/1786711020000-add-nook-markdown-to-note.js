/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddNookMarkdownToNote1786711020000 {
    name = 'AddNookMarkdownToNote1786711020000'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "note" ADD "nookMarkdown" boolean NOT NULL DEFAULT false`)
        await queryRunner.query(`CREATE FUNCTION "setNookMarkdownForLocalNote"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."uri" IS NULL AND NEW."userHost" IS NULL THEN NEW."nookMarkdown" = true; END IF; RETURN NEW; END; $$`)
        await queryRunner.query(`CREATE TRIGGER "TRG_note_nook_markdown" BEFORE INSERT ON "note" FOR EACH ROW EXECUTE FUNCTION "setNookMarkdownForLocalNote"()`)
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TRIGGER "TRG_note_nook_markdown" ON "note"`)
        await queryRunner.query(`DROP FUNCTION "setNookMarkdownForLocalNote"()`)
        await queryRunner.query(`ALTER TABLE "note" DROP COLUMN "nookMarkdown"`)
    }
}