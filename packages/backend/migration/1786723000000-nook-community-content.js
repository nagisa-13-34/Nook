/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class NookCommunityContent1786723000000 {
    name = 'NookCommunityContent1786723000000'

    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "nook_community_channel" (
                "id" varchar(32) NOT NULL,
                "communityId" varchar(32) NOT NULL,
                "parentId" varchar(32),
                "name" varchar(64) NOT NULL,
                "topic" varchar(1024),
                "kind" varchar(16) NOT NULL DEFAULT 'text',
                "position" integer NOT NULL DEFAULT 0,
                "allowedRoleIds" jsonb NOT NULL DEFAULT '[]'::jsonb,
                "archivedAt" TIMESTAMP WITH TIME ZONE,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_nook_community_channel" PRIMARY KEY ("id"),
                CONSTRAINT "FK_nook_community_channel_community" FOREIGN KEY ("communityId") REFERENCES "channel"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_nook_community_channel_parent" FOREIGN KEY ("parentId") REFERENCES "nook_community_channel"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_nook_community_channel_order" ON "nook_community_channel" ("communityId", "position")`);
        await queryRunner.query(`
            CREATE TABLE "nook_community_message" (
                "id" varchar(32) NOT NULL,
                "communityId" varchar(32) NOT NULL,
                "channelId" varchar(32) NOT NULL,
                "userId" varchar(32),
                "botId" varchar(32),
                "replyToId" varchar(32),
                "body" varchar(8000) NOT NULL,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "editedAt" TIMESTAMP WITH TIME ZONE,
                "deletedAt" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_nook_community_message" PRIMARY KEY ("id"),
                CONSTRAINT "FK_nook_community_message_community" FOREIGN KEY ("communityId") REFERENCES "channel"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_nook_community_message_channel" FOREIGN KEY ("channelId") REFERENCES "nook_community_channel"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_nook_community_message_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL,
                CONSTRAINT "FK_nook_community_message_reply" FOREIGN KEY ("replyToId") REFERENCES "nook_community_message"("id") ON DELETE SET NULL,
                CONSTRAINT "CHK_nook_community_message_author" CHECK (("userId" IS NOT NULL) <> ("botId" IS NOT NULL))
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_nook_community_message_channel" ON "nook_community_message" ("channelId", "createdAt" DESC)`);
        await queryRunner.query(`CREATE INDEX "IDX_nook_community_message_community" ON "nook_community_message" ("communityId", "createdAt" DESC)`);
        await queryRunner.query(`
            CREATE TABLE "nook_community_announcement" (
                "id" varchar(32) NOT NULL,
                "communityId" varchar(32) NOT NULL,
                "authorId" varchar(32),
                "title" varchar(160) NOT NULL,
                "body" varchar(12000) NOT NULL,
                "important" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "expiresAt" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_nook_community_announcement" PRIMARY KEY ("id"),
                CONSTRAINT "FK_nook_community_announcement_community" FOREIGN KEY ("communityId") REFERENCES "channel"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_nook_community_announcement_author" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_nook_community_announcement_community" ON "nook_community_announcement" ("communityId", "createdAt" DESC)`);
        await queryRunner.query(`
            CREATE TABLE "nook_community_pin" (
                "id" varchar(32) NOT NULL,
                "communityId" varchar(32) NOT NULL,
                "channelId" varchar(32),
                "kind" varchar(16) NOT NULL,
                "targetId" varchar(64),
                "url" varchar(2048),
                "label" varchar(160),
                "createdBy" varchar(32),
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_nook_community_pin" PRIMARY KEY ("id"),
                CONSTRAINT "FK_nook_community_pin_community" FOREIGN KEY ("communityId") REFERENCES "channel"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_nook_community_pin_channel" FOREIGN KEY ("channelId") REFERENCES "nook_community_channel"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_nook_community_pin_user" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_nook_community_pin_scope" ON "nook_community_pin" ("communityId", "channelId", "createdAt" DESC)`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "nook_community_pin"`);
        await queryRunner.query(`DROP TABLE "nook_community_announcement"`);
        await queryRunner.query(`DROP TABLE "nook_community_message"`);
        await queryRunner.query(`DROP TABLE "nook_community_channel"`);
    }
}
