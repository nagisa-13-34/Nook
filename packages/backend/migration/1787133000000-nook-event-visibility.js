/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class NookEventVisibility1787133000000 {
	name = 'NookEventVisibility1787133000000'

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "nook_community_event" ALTER COLUMN "communityId" DROP NOT NULL`);
		await queryRunner.query(`ALTER TABLE "nook_community_event" ADD "visibility" varchar(16) NOT NULL DEFAULT 'community'`);
		await queryRunner.query(`ALTER TABLE "nook_community_event" ADD "participation" varchar(16) NOT NULL DEFAULT 'community'`);
		await queryRunner.query(`ALTER TABLE "nook_community_event" ADD CONSTRAINT "CHK_nook_event_visibility" CHECK ("visibility" IN ('public', 'community', 'unlisted', 'private'))`);
		await queryRunner.query(`ALTER TABLE "nook_community_event" ADD CONSTRAINT "CHK_nook_event_participation" CHECK ("participation" IN ('anyone', 'community'))`);
		await queryRunner.query(`ALTER TABLE "nook_community_event" ADD CONSTRAINT "CHK_nook_event_community_visibility" CHECK ("visibility" <> 'community' OR "communityId" IS NOT NULL)`);
		await queryRunner.query(`ALTER TABLE "nook_community_event" ADD CONSTRAINT "CHK_nook_event_community_participation" CHECK ("participation" <> 'community' OR "communityId" IS NOT NULL)`);
		await queryRunner.query(`CREATE INDEX "IDX_nook_event_visibility_schedule" ON "nook_community_event" ("visibility", "startsAt")`);
	}

	async down(queryRunner) {
		await queryRunner.query(`DROP INDEX "IDX_nook_event_visibility_schedule"`);
		await queryRunner.query(`ALTER TABLE "nook_community_event" DROP CONSTRAINT "CHK_nook_event_community_participation"`);
		await queryRunner.query(`ALTER TABLE "nook_community_event" DROP CONSTRAINT "CHK_nook_event_community_visibility"`);
		await queryRunner.query(`ALTER TABLE "nook_community_event" DROP CONSTRAINT "CHK_nook_event_participation"`);
		await queryRunner.query(`ALTER TABLE "nook_community_event" DROP CONSTRAINT "CHK_nook_event_visibility"`);
		await queryRunner.query(`DELETE FROM "nook_community_event" WHERE "communityId" IS NULL`);
		await queryRunner.query(`ALTER TABLE "nook_community_event" ALTER COLUMN "communityId" SET NOT NULL`);
		await queryRunner.query(`ALTER TABLE "nook_community_event" DROP COLUMN "participation"`);
		await queryRunner.query(`ALTER TABLE "nook_community_event" DROP COLUMN "visibility"`);
	}
}
