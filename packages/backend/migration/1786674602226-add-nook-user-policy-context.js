/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddNookUserPolicyContext1786674602226 {
    name = 'AddNookUserPolicyContext1786674602226';

    async up(queryRunner) {
        await queryRunner.query('ALTER TABLE "user_profile" ADD "nookCountryCode" character varying(2)');
        await queryRunner.query('COMMENT ON COLUMN "user_profile"."nookCountryCode" IS \'ISO 3166-1 alpha-2 country code used by the Nook policy engine.\'');
        await queryRunner.query('ALTER TABLE "user_profile" ADD "nookVerifiedAgeGroup" character varying(32)');
        await queryRunner.query('COMMENT ON COLUMN "user_profile"."nookVerifiedAgeGroup" IS \'Verified age group used by the Nook policy engine. The date of birth is not required.\'');
        await queryRunner.query('ALTER TABLE "user_profile" ADD "nookPolicyId" character varying(64)');
        await queryRunner.query('COMMENT ON COLUMN "user_profile"."nookPolicyId" IS \'Explicitly assigned Nook policy ID.\'');
    }

    async down(queryRunner) {
        await queryRunner.query('ALTER TABLE "user_profile" DROP COLUMN "nookPolicyId"');
        await queryRunner.query('ALTER TABLE "user_profile" DROP COLUMN "nookVerifiedAgeGroup"');
        await queryRunner.query('ALTER TABLE "user_profile" DROP COLUMN "nookCountryCode"');
    }
}
