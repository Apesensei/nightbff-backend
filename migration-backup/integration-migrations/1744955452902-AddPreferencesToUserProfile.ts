import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPreferencesToUserProfile1744955452902
  implements MigrationInterface
{
  name = "AddPreferencesToUserProfile1744955452902";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_profiles_gender_preference_enum" AS ENUM('male', 'female', 'both')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD "gender_preference" "public"."user_profiles_gender_preference_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD "min_age_preference" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD "max_age_preference" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP COLUMN "max_age_preference"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP COLUMN "min_age_preference"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP COLUMN "gender_preference"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."user_profiles_gender_preference_enum"`,
    );
  }
}
