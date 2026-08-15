/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class NookCommunityVoice1786727000000 {
    name = 'NookCommunityVoice1786727000000'

    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "nook_community_voice_presence" (
                "channelId" varchar(32) NOT NULL,
                "userId" varchar(32) NOT NULL,
                "sessionId" varchar(64) NOT NULL,
                "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "lastSeenAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_nook_community_voice_presence" PRIMARY KEY ("channelId", "userId"),
                CONSTRAINT "UQ_nook_community_voice_session" UNIQUE ("sessionId"),
                CONSTRAINT "FK_nook_community_voice_presence_channel" FOREIGN KEY ("channelId") REFERENCES "nook_community_channel"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_nook_community_voice_presence_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_nook_community_voice_presence_seen" ON "nook_community_voice_presence" ("channelId", "lastSeenAt")`);
        await queryRunner.query(`
            CREATE TABLE "nook_community_voice_signal" (
                "id" varchar(32) NOT NULL,
                "channelId" varchar(32) NOT NULL,
                "fromUserId" varchar(32) NOT NULL,
                "toUserId" varchar(32) NOT NULL,
                "type" varchar(16) NOT NULL,
                "payload" text NOT NULL,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_nook_community_voice_signal" PRIMARY KEY ("id"),
                CONSTRAINT "FK_nook_community_voice_signal_channel" FOREIGN KEY ("channelId") REFERENCES "nook_community_channel"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_nook_community_voice_signal_from" FOREIGN KEY ("fromUserId") REFERENCES "user"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_nook_community_voice_signal_to" FOREIGN KEY ("toUserId") REFERENCES "user"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_nook_community_voice_signal_target" ON "nook_community_voice_signal" ("channelId", "toUserId", "createdAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_nook_community_voice_signal_created" ON "nook_community_voice_signal" ("createdAt")`);
        await queryRunner.query(`
            CREATE TABLE "nook_community_voice_config" (
                "channelId" varchar(32) NOT NULL,
                "ttsEnabled" boolean NOT NULL DEFAULT false,
                "ttsSourceChannelId" varchar(32),
                "ttsLanguage" varchar(24),
                "musicEnabled" boolean NOT NULL DEFAULT false,
                "updatedBy" varchar(32),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_nook_community_voice_config" PRIMARY KEY ("channelId"),
                CONSTRAINT "FK_nook_community_voice_config_channel" FOREIGN KEY ("channelId") REFERENCES "nook_community_channel"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_nook_community_voice_config_tts_channel" FOREIGN KEY ("ttsSourceChannelId") REFERENCES "nook_community_channel"("id") ON DELETE SET NULL,
                CONSTRAINT "FK_nook_community_voice_config_user" FOREIGN KEY ("updatedBy") REFERENCES "user"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "nook_community_voice_music" (
                "channelId" varchar(32) NOT NULL,
                "url" varchar(2048),
                "title" varchar(256),
                "positionSeconds" double precision NOT NULL DEFAULT 0,
                "playing" boolean NOT NULL DEFAULT false,
                "updatedBy" varchar(32),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_nook_community_voice_music" PRIMARY KEY ("channelId"),
                CONSTRAINT "FK_nook_community_voice_music_channel" FOREIGN KEY ("channelId") REFERENCES "nook_community_channel"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_nook_community_voice_music_user" FOREIGN KEY ("updatedBy") REFERENCES "user"("id") ON DELETE SET NULL
            )
        `);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "nook_community_voice_music"`);
        await queryRunner.query(`DROP TABLE "nook_community_voice_config"`);
        await queryRunner.query(`DROP TABLE "nook_community_voice_signal"`);
        await queryRunner.query(`DROP TABLE "nook_community_voice_presence"`);
    }
}
