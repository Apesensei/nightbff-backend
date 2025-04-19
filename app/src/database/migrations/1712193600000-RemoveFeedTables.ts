import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveFeedTables1712193600000 implements MigrationInterface {
  name = "RemoveFeedTables1712193600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log(
      "Dropping feed-related tables: post_comment, post_like, post_media, post",
    );
    // Add potential foreign key drops here if needed, before dropping tables.
    // Example: await queryRunner.query(`ALTER TABLE "post_comment" DROP CONSTRAINT "FK_some_constraint"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "post_comment"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "post_like"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "post_media"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "post"`);
    console.log("Finished dropping feed-related tables.");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Down migration is complex as it requires original table definitions.
    // Add CREATE TABLE statements here for rollback if needed.
    console.log(
      "'Down' migration for RemoveFeedTables requires manual implementation to recreate tables.",
    );
    await queryRunner.query(
      `-- Placeholder: Recreate post, post_comment, post_like, post_media tables here.`,
    );
  }
}
