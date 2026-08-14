/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class NookCommunityBots1786725000000 {
    name = 'NookCommunityBots1786725000000'

    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "nook_community_bot" (
                "id" varchar(32) NOT NULL,
                "communityId" varchar(32) NOT NULL,
                "creatorId" varchar(32),
                "name" varchar(64) NOT NULL,
                "description" varchar(1024),
                "kind" varchar(16) NOT NULL DEFAULT 'integration',
                "secretHash" varchar(64) NOT NULL,
                "scopes" jsonb NOT NULL DEFAULT '[]'::jsonb,
                "allowedChannelIds" jsonb NOT NULL DEFAULT '[]'::jsonb,
                "enabled" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "lastUsedAt" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_nook_community_bot" PRIMARY KEY ("id"),
                CONSTRAINT "FK_nook_community_bot_community" FOREIGN KEY ("communityId") REFERENCES "channel"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_nook_community_bot_creator" FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_nook_community_bot_community" ON "nook_community_bot" ("communityId", "createdAt")`);
        await queryRunner.query(`ALTER TABLE "nook_community_message" ADD CONSTRAINT "FK_nook_community_message_bot" FOREIGN KEY ("botId") REFERENCES "nook_community_bot"("id") ON DELETE RESTRICT`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "nook_community_message" DROP CONSTRAINT "FK_nook_community_message_bot"`);
        await queryRunner.query(`DROP TABLE "nook_community_bot"`);
    }
}
