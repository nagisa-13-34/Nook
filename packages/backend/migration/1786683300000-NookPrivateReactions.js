export class NookPrivateReactions1786683300000 {
	name = 'NookPrivateReactions1786683300000'

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "user_profile" ALTER COLUMN "publicReactions" SET DEFAULT false`);
		await queryRunner.query(`UPDATE "user_profile" SET "publicReactions" = false WHERE "publicReactions" = true`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "user_profile" ALTER COLUMN "publicReactions" SET DEFAULT true`);
	}
}
