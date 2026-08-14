/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddNookMarkdownToNote1786711020000 {
    name = 'AddNookMarkdownToNote1786711020000'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "note" ADD "nookMarkdown" boolean NOT NULL DEFAULT false`)
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "note" DROP COLUMN "nookMarkdown"`)
    }
}
