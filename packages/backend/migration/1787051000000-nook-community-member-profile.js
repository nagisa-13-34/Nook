/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class NookCommunityMemberProfile1787051000000 {
    name = 'NookCommunityMemberProfile1787051000000'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "nook_community_member" ADD "avatarId" varchar(32)`);
        await queryRunner.query(`ALTER TABLE "nook_community_member" ADD CONSTRAINT "FK_nook_community_member_avatar" FOREIGN KEY ("avatarId") REFERENCES "drive_file"("id") ON DELETE SET NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_nook_community_member_avatar" ON "nook_community_member" ("avatarId")`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "IDX_nook_community_member_avatar"`);
        await queryRunner.query(`ALTER TABLE "nook_community_member" DROP CONSTRAINT "FK_nook_community_member_avatar"`);
        await queryRunner.query(`ALTER TABLE "nook_community_member" DROP COLUMN "avatarId"`);
    }
}
