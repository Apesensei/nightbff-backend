import { MigrationInterface, QueryRunner } from "typeorm";

export class IndexUserProfileLastActiveAt1744950473305
  implements MigrationInterface
{
  name = "IndexUserProfileLastActiveAt1744950473305";
  public readonly transaction = false; // Disable transactions

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Use CREATE INDEX CONCURRENTLY
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY "IDX_f3c8a982c06f0d5b650042f97b" ON "user_profiles" ("lastActiveAt") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Use DROP INDEX CONCURRENTLY
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY "public"."IDX_f3c8a982c06f0d5b650042f97b"`,
    );
  }
}
