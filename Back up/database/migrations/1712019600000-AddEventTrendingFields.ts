import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventTrendingFields1712019600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add trendingScore column
    await queryRunner.query(`
      ALTER TABLE "events" 
      ADD COLUMN IF NOT EXISTS "trendingScore" float NOT NULL DEFAULT 0
    `);

    // Add viewCount column
    await queryRunner.query(`
      ALTER TABLE "events" 
      ADD COLUMN IF NOT EXISTS "viewCount" integer NOT NULL DEFAULT 0
    `);

    // Create index for trendingScore
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_events_trendingScore" ON "events" ("trendingScore")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_events_trendingScore"`);
    
    // Drop columns
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN IF EXISTS "trendingScore"`);
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN IF EXISTS "viewCount"`);
  }
} 