export class RepairLocalUserNotesCount1787100000000 {
	name = 'RepairLocalUserNotesCount1787100000000';

	async up(queryRunner) {
		await queryRunner.query(`
			UPDATE "user" AS u
			SET "notesCount" = COALESCE((
				SELECT COUNT(*)::integer
				FROM "note" AS n
				WHERE n."userId" = u."id"
			), 0)
			WHERE u."host" IS NULL
		`);
	}

	async down() {
		// Previous values may have been stale, so there is nothing safe to restore.
	}
}
