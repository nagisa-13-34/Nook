/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class NookCommunityAgeMode1786850000000 {
    name = 'NookCommunityAgeMode1786850000000'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "nook_community" ADD COLUMN "ageMode" varchar(16) NOT NULL DEFAULT 'mixed'`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "nook_community" DROP COLUMN "ageMode"`);
    }
}
