/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddNookPolicyStorage1786670605476 {
	name = 'AddNookPolicyStorage1786670605476';

	async up(queryRunner) {
		await queryRunner.query(`CREATE TABLE "nook_policy" ("id" character varying(64) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "country" character varying(8) NOT NULL, "ageGroup" character varying(32) NOT NULL, "accountStates" character varying(32) array NOT NULL DEFAULT '{}', "permissions" jsonb NOT NULL, "priority" integer NOT NULL DEFAULT '0', "enabled" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_664132c4a0572d465ae75899491" PRIMARY KEY ("id"))`);
		await queryRunner.query(`COMMENT ON COLUMN "nook_policy"."country" IS 'ISO 3166-1 alpha-2 country code or * for a fallback policy.'`);
		await queryRunner.query(`CREATE INDEX "IDX_85be23a6d57699896678879c8d" ON "nook_policy" ("country", "ageGroup", "enabled")`);
		await queryRunner.query(`CREATE TABLE "nook_feature_flag" ("name" character varying(64) NOT NULL, "enabled" boolean NOT NULL DEFAULT false, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_24869b486affba87bd84d173d0b" PRIMARY KEY ("name"))`);
	}

	async down(queryRunner) {
		await queryRunner.query(`DROP TABLE "nook_feature_flag"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_85be23a6d57699896678879c8d"`);
		await queryRunner.query(`DROP TABLE "nook_policy"`);
	}
}
