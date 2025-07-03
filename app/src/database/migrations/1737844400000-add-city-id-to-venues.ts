import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCityIdToVenues1737844400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add city_id column to venues table
    await queryRunner.query(`
      ALTER TABLE venues 
      ADD COLUMN city_id UUID NULL
    `);

    // Add index for city_id column for better query performance
    await queryRunner.query(`
      CREATE INDEX IDX_venues_city_id ON venues(city_id)
    `);

    console.log("✅ Added city_id column to venues table with index");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove index first
    await queryRunner.query(`
      DROP INDEX IF EXISTS IDX_venues_city_id
    `);

    // Remove city_id column
    await queryRunner.query(`
      ALTER TABLE venues 
      DROP COLUMN IF EXISTS city_id
    `);

    console.log("✅ Removed city_id column from venues table");
  }
}
