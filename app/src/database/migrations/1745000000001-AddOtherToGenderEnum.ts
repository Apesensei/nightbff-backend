import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOtherToGenderEnum1745000000001 implements MigrationInterface {
    // Disable transactions for ALTER TYPE operations in PostgreSQL
    public transaction = false;

    public async up(queryRunner: QueryRunner): Promise<void> {
        // IMPORTANT: Verify 'public.user_profiles_gender_enum' is the correct enum type name in your database.
        await queryRunner.query("ALTER TYPE public.user_profiles_gender_enum ADD VALUE 'other'");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // There is no straightforward, safe way to remove an enum value in PostgreSQL
        // without potential data loss or complex procedures involving temporary types/renaming.
        // See: https://www.postgresql.org/docs/current/sql-altertype.html
        // If rollback is truly necessary, it would require manual intervention or a more
        // complex migration strategy (e.g., mapping 'other' back temporarily).
        // For this reason, we typically avoid reversing ADD VALUE operations.
        console.warn("Cannot automatically revert adding an enum value ('other') to 'public.user_profiles_gender_enum'. Manual intervention required if rollback is needed.");
        // Optionally, throw an error to prevent accidental rollback:
        // throw new Error("Rollback for adding enum value 'other' is not supported.");
    }
} 