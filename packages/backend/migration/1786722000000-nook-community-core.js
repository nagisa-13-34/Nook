/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class NookCommunityCore1786722000000 {
    name = 'NookCommunityCore1786722000000'

    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "nook_community" (
                "channelId" varchar(32) NOT NULL,
                "joinMode" varchar(16) NOT NULL DEFAULT 'open',
                "discoverable" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_nook_community" PRIMARY KEY ("channelId"),
                CONSTRAINT "FK_nook_community_channel" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "nook_community_member" (
                "communityId" varchar(32) NOT NULL,
                "userId" varchar(32) NOT NULL,
                "baseRole" varchar(16) NOT NULL DEFAULT 'member',
                "state" varchar(16) NOT NULL DEFAULT 'active',
                "nickname" varchar(64),
                "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_nook_community_member" PRIMARY KEY ("communityId", "userId"),
                CONSTRAINT "FK_nook_community_member_community" FOREIGN KEY ("communityId") REFERENCES "channel"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_nook_community_member_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_nook_community_member_user" ON "nook_community_member" ("userId")`);
        await queryRunner.query(`
            CREATE TABLE "nook_community_role" (
                "id" varchar(32) NOT NULL,
                "communityId" varchar(32) NOT NULL,
                "name" varchar(64) NOT NULL,
                "color" varchar(16),
                "position" integer NOT NULL DEFAULT 0,
                "permissions" jsonb NOT NULL DEFAULT '[]'::jsonb,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_nook_community_role" PRIMARY KEY ("id"),
                CONSTRAINT "FK_nook_community_role_community" FOREIGN KEY ("communityId") REFERENCES "channel"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_nook_community_role_community" ON "nook_community_role" ("communityId", "position")`);
        await queryRunner.query(`
            CREATE TABLE "nook_community_member_role" (
                "communityId" varchar(32) NOT NULL,
                "userId" varchar(32) NOT NULL,
                "roleId" varchar(32) NOT NULL,
                CONSTRAINT "PK_nook_community_member_role" PRIMARY KEY ("communityId", "userId", "roleId"),
                CONSTRAINT "FK_nook_community_member_role_member" FOREIGN KEY ("communityId", "userId") REFERENCES "nook_community_member"("communityId", "userId") ON DELETE CASCADE,
                CONSTRAINT "FK_nook_community_member_role_role" FOREIGN KEY ("roleId") REFERENCES "nook_community_role"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_nook_community_member_role_role" ON "nook_community_member_role" ("roleId")`);
        await queryRunner.query(`
            CREATE TABLE "nook_community_join_request" (
                "id" varchar(32) NOT NULL,
                "communityId" varchar(32) NOT NULL,
                "userId" varchar(32) NOT NULL,
                "message" varchar(1024),
                "status" varchar(16) NOT NULL DEFAULT 'pending',
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "respondedAt" TIMESTAMP WITH TIME ZONE,
                "respondedBy" varchar(32),
                CONSTRAINT "PK_nook_community_join_request" PRIMARY KEY ("id"),
                CONSTRAINT "FK_nook_community_join_request_community" FOREIGN KEY ("communityId") REFERENCES "channel"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_nook_community_join_request_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_nook_community_join_request_responder" FOREIGN KEY ("respondedBy") REFERENCES "user"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_nook_community_join_request_pending" ON "nook_community_join_request" ("communityId", "userId") WHERE "status" = 'pending'`);
        await queryRunner.query(`
            CREATE TABLE "nook_community_invite" (
                "id" varchar(32) NOT NULL,
                "communityId" varchar(32) NOT NULL,
                "creatorId" varchar(32) NOT NULL,
                "tokenHash" varchar(64) NOT NULL,
                "defaultBaseRole" varchar(16) NOT NULL DEFAULT 'member',
                "maxUses" integer,
                "useCount" integer NOT NULL DEFAULT 0,
                "expiresAt" TIMESTAMP WITH TIME ZONE,
                "revokedAt" TIMESTAMP WITH TIME ZONE,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_nook_community_invite" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_nook_community_invite_token" UNIQUE ("tokenHash"),
                CONSTRAINT "FK_nook_community_invite_community" FOREIGN KEY ("communityId") REFERENCES "channel"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_nook_community_invite_creator" FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_nook_community_invite_community" ON "nook_community_invite" ("communityId", "createdAt")`);
        await queryRunner.query(`
            CREATE TABLE "nook_community_rule" (
                "id" varchar(32) NOT NULL,
                "communityId" varchar(32) NOT NULL,
                "position" integer NOT NULL DEFAULT 0,
                "title" varchar(128) NOT NULL,
                "body" varchar(4096) NOT NULL,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_nook_community_rule" PRIMARY KEY ("id"),
                CONSTRAINT "FK_nook_community_rule_community" FOREIGN KEY ("communityId") REFERENCES "channel"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_nook_community_rule_community" ON "nook_community_rule" ("communityId", "position")`);

        await queryRunner.query(`
            INSERT INTO "nook_community" ("channelId")
            SELECT "id" FROM "channel"
            ON CONFLICT ("channelId") DO NOTHING
        `);
        await queryRunner.query(`
            INSERT INTO "nook_community_member" ("communityId", "userId", "baseRole")
            SELECT "id", "userId", 'owner'
            FROM "channel"
            WHERE "userId" IS NOT NULL
            ON CONFLICT ("communityId", "userId") DO UPDATE SET "baseRole" = 'owner', "state" = 'active'
        `);
        await queryRunner.query(`
            INSERT INTO "nook_community_member" ("communityId", "userId", "baseRole")
            SELECT "followeeId", "followerId", 'member'
            FROM "channel_following"
            ON CONFLICT ("communityId", "userId") DO NOTHING
        `);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "nook_community_rule"`);
        await queryRunner.query(`DROP TABLE "nook_community_invite"`);
        await queryRunner.query(`DROP TABLE "nook_community_join_request"`);
        await queryRunner.query(`DROP TABLE "nook_community_member_role"`);
        await queryRunner.query(`DROP TABLE "nook_community_role"`);
        await queryRunner.query(`DROP TABLE "nook_community_member"`);
        await queryRunner.query(`DROP TABLE "nook_community"`);
    }
}
