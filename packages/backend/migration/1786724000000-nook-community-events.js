/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class NookCommunityEvents1786724000000 {
    name = 'NookCommunityEvents1786724000000'

    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "nook_community_event" (
                "id" varchar(32) NOT NULL,
                "communityId" varchar(32) NOT NULL,
                "creatorId" varchar(32),
                "title" varchar(160) NOT NULL,
                "description" varchar(12000),
                "location" varchar(256),
                "startsAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                "endsAt" TIMESTAMP WITH TIME ZONE,
                "maxAttendees" integer,
                "textChannelId" varchar(32),
                "voiceChannelId" varchar(32),
                "cancelledAt" TIMESTAMP WITH TIME ZONE,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_nook_community_event" PRIMARY KEY ("id"),
                CONSTRAINT "FK_nook_community_event_community" FOREIGN KEY ("communityId") REFERENCES "channel"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_nook_community_event_creator" FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE SET NULL,
                CONSTRAINT "FK_nook_community_event_text_channel" FOREIGN KEY ("textChannelId") REFERENCES "nook_community_channel"("id") ON DELETE SET NULL,
                CONSTRAINT "FK_nook_community_event_voice_channel" FOREIGN KEY ("voiceChannelId") REFERENCES "nook_community_channel"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_nook_community_event_schedule" ON "nook_community_event" ("communityId", "startsAt")`);
        await queryRunner.query(`
            CREATE TABLE "nook_community_event_rsvp" (
                "eventId" varchar(32) NOT NULL,
                "userId" varchar(32) NOT NULL,
                "response" varchar(16) NOT NULL,
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_nook_community_event_rsvp" PRIMARY KEY ("eventId", "userId"),
                CONSTRAINT "FK_nook_community_event_rsvp_event" FOREIGN KEY ("eventId") REFERENCES "nook_community_event"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_nook_community_event_rsvp_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_nook_community_event_rsvp_user" ON "nook_community_event_rsvp" ("userId", "updatedAt" DESC)`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "nook_community_event_rsvp"`);
        await queryRunner.query(`DROP TABLE "nook_community_event"`);
    }
}
