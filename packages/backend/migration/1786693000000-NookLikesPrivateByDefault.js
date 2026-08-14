/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class NookLikesPrivateByDefault1786693000000 {
    async up(queryRunner) {
        // Change only the database default. Existing users keep their current choice.
        await queryRunner.query(`ALTER TABLE "user_profile" ALTER COLUMN "publicReactions" SET DEFAULT false`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_profile" ALTER COLUMN "publicReactions" SET DEFAULT true`);
    }
}
