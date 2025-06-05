import { MigrationInterface, QueryRunner } from "typeorm";

export class MapPreferNotToSayToOther1745000000002
  implements MigrationInterface
{
  // Default transaction behavior (transaction = true) is suitable here

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update existing users from PREFER_NOT_TO_SAY to other (lowercase)
    await queryRunner.query(
      "UPDATE user_profiles SET gender = 'other' WHERE gender = 'PREFER_NOT_TO_SAY'",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert other (lowercase) back to PREFER_NOT_TO_SAY.
    // WARNING: This assumes that all users currently set to 'other' were originally
    // 'PREFER_NOT_TO_SAY' before this migration ran. If 'other' was set through
    // other means or if future migrations change this, this rollback might be inaccurate.
    await queryRunner.query(
      "UPDATE user_profiles SET gender = 'PREFER_NOT_TO_SAY' WHERE gender = 'other'",
    );
  }
}
