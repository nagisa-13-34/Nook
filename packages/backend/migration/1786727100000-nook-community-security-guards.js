/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class NookCommunitySecurityGuards1786727100000 {
    name = 'NookCommunitySecurityGuards1786727100000'

    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE "nook_community_voice_signal"
            ADD CONSTRAINT "CHK_nook_community_voice_signal_payload_length"
            CHECK (char_length("payload") <= 32768)
        `);

        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION "nook_guard_join_request_response"()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            BEGIN
                IF NEW."status" IS DISTINCT FROM OLD."status"
                   AND NEW."status" IN ('approved', 'rejected')
                   AND NEW."respondedBy" IS NOT NULL THEN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM "nook_community_member" member
                        WHERE member."communityId" = NEW."communityId"
                          AND member."userId" = NEW."respondedBy"
                          AND member."state" = 'active'
                          AND (
                              member."baseRole" IN ('owner', 'admin', 'moderator')
                              OR EXISTS (
                                  SELECT 1
                                  FROM "nook_community_member_role" member_role
                                  INNER JOIN "nook_community_role" role
                                    ON role."communityId" = member_role."communityId"
                                   AND role."id" = member_role."roleId"
                                  WHERE member_role."communityId" = NEW."communityId"
                                    AND member_role."userId" = NEW."respondedBy"
                                    AND role."permissions" ? 'members.manage'
                              )
                          )
                    ) THEN
                        RAISE EXCEPTION 'unauthorized community join request response'
                            USING ERRCODE = '42501';
                    END IF;
                END IF;
                RETURN NEW;
            END;
            $$
        `);

        await queryRunner.query(`
            CREATE TRIGGER "TRG_nook_guard_join_request_response"
            BEFORE UPDATE OF "status", "respondedBy"
            ON "nook_community_join_request"
            FOR EACH ROW
            EXECUTE FUNCTION "nook_guard_join_request_response"()
        `);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TRIGGER IF EXISTS "TRG_nook_guard_join_request_response" ON "nook_community_join_request"`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS "nook_guard_join_request_response"()`);
        await queryRunner.query(`ALTER TABLE "nook_community_voice_signal" DROP CONSTRAINT IF EXISTS "CHK_nook_community_voice_signal_payload_length"`);
    }
}
