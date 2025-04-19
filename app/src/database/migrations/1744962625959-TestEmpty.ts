import { MigrationInterface, QueryRunner } from "typeorm";

export class TestEmpty1744962625959 implements MigrationInterface {
  name = "TestEmpty1744962625959";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // This migration is intended to be empty or contain non-conflicting test logic.
    // Removed duplicate DDL from AddPreferencesToUserProfile migration.
    // Original problematic line: await queryRunner.query(`CREATE TYPE "public"."user_profiles_gender_preference_enum" AS ENUM('male', 'female', 'both')`);
    // Original problematic line: await queryRunner.query(`ALTER TABLE "user_profiles" ADD "gender_preference" "public"."user_profiles_gender_preference_enum"`);
    // Original problematic line: await queryRunner.query(`ALTER TABLE "user_profiles" ADD "min_age_preference" integer`);
    // Original problematic line: await queryRunner.query(`ALTER TABLE "user_profiles" ADD "max_age_preference" integer`);
    // Keeping only potentially unique logic (if any was intended beyond testing migration run)
    // await queryRunner.query(`DROP INDEX "public"."IDX_f3c8a982c06f0d5b650042f97b"`); // Example: Commented out unless specifically needed
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Corresponding down logic for any operations kept in 'up'
    // await queryRunner.query(`CREATE INDEX "IDX_f3c8a982c06f0d5b650042f97b" ON "user_profiles" ("lastActiveAt") `); // Example: Commented out
    // Removed duplicate DDL from AddPreferencesToUserProfile migration.
    // Original problematic line: await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN "max_age_preference"`);
    // Original problematic line: await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN "min_age_preference"`);
    // Original problematic line: await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN "gender_preference"`);
    // Original problematic line: await queryRunner.query(`DROP TYPE "public"."user_profiles_gender_preference_enum"`);
  }
}
