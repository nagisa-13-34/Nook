/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class NookTranslationCache1786726000000 {
    name = 'NookTranslationCache1786726000000'

    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "nook_translation_cache" (
                "kind" varchar(32) NOT NULL,
                "objectId" varchar(64) NOT NULL,
                "sourceHash" varchar(64) NOT NULL,
                "targetLang" varchar(24) NOT NULL,
                "sourceLang" varchar(24) NOT NULL,
                "translatedText" text NOT NULL,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_nook_translation_cache" PRIMARY KEY ("kind", "objectId", "sourceHash", "targetLang")
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_nook_translation_cache_created" ON "nook_translation_cache" ("createdAt")`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "nook_translation_cache"`);
    }
}
