/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class NoteEditing1786897200000 {
    name = 'NoteEditing1786897200000'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "note" ADD COLUMN "editedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "note" ADD COLUMN "editHistory" jsonb NOT NULL DEFAULT '[]'::jsonb`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "note" DROP COLUMN "editHistory"`);
        await queryRunner.query(`ALTER TABLE "note" DROP COLUMN "editedAt"`);
    }
}
