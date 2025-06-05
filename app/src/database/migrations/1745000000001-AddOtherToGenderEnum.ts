import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOtherToGenderEnum1745000000001 implements MigrationInterface {
  // Disable transactions for ALTER TYPE operations in PostgreSQL
  public transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // IMPORTANT: Verify 'public.user_profiles_gender_enum' is the correct enum type name in your database.
    await queryRunner.query(
      "ALTER TYPE public.user_profiles_gender_enum ADD VALUE IF NOT EXISTS 'other'",
    );
  }

  public async down(/* queryRunner: QueryRunner */): Promise<void> {
    // Reverting adding an enum value might not be straightforward or always desirable.
    // If needed, logic to change 'other' back to something else or remove it
    // (carefully, considering data) would go here.
    // For now, acknowledging the parameter is unused by removing it.
    // console.warn(...);
  }
}
