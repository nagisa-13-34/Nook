export class NookLikesPrivateByDefault1786694400000 {
	name = 'NookLikesPrivateByDefault1786694400000'

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "user_profile" ALTER COLUMN "publicReactions" SET DEFAULT false`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "user_profile" ALTER COLUMN "publicReactions" SET DEFAULT true`);
	}
}
