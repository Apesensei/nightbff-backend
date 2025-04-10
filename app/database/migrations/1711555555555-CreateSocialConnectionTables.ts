import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSocialConnectionTables1711555555555 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_relationships table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_relationships" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "requester_id" UUID NOT NULL,
        "recipient_id" UUID NOT NULL,
        "type" VARCHAR(20) NOT NULL DEFAULT 'pending',
        "message" TEXT,
        "is_reported" BOOLEAN NOT NULL DEFAULT false,
        "report_reason" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_user_relationships_requester" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_relationships_recipient" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_user_relationships_requester_recipient" UNIQUE ("requester_id", "recipient_id")
      );
    `);

    // Create profile_views table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "profile_views" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "viewer_id" UUID NOT NULL,
        "viewed_id" UUID NOT NULL,
        "anonymous" BOOLEAN NOT NULL DEFAULT true,
        "is_notified" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_profile_views_viewer" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_profile_views_viewed" FOREIGN KEY ("viewed_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    // Add indices for faster queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_relationships_requester_type" ON "user_relationships" ("requester_id", "type");
      CREATE INDEX IF NOT EXISTS "idx_user_relationships_recipient_type" ON "user_relationships" ("recipient_id", "type");
      CREATE INDEX IF NOT EXISTS "idx_profile_views_viewer" ON "profile_views" ("viewer_id", "created_at");
      CREATE INDEX IF NOT EXISTS "idx_profile_views_viewed" ON "profile_views" ("viewed_id", "created_at");
    `);

    // Add geospatial index to users table for location-based queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_location" ON "users" ("location_latitude", "location_longitude")
      WHERE "location_latitude" IS NOT NULL AND "location_longitude" IS NOT NULL;
    `);

    // Add enumeration type for relationship types
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'relationship_type') THEN
          CREATE TYPE relationship_type AS ENUM ('pending', 'accepted', 'following', 'blocked');
        END IF;
      END$$;
    `);

    // Alter table to use enum type
    await queryRunner.query(`
      ALTER TABLE "user_relationships" 
      ALTER COLUMN "type" TYPE relationship_type USING type::relationship_type;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indices
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_user_relationships_requester_type";
      DROP INDEX IF EXISTS "idx_user_relationships_recipient_type";
      DROP INDEX IF EXISTS "idx_profile_views_viewer";
      DROP INDEX IF EXISTS "idx_profile_views_viewed";
      DROP INDEX IF EXISTS "idx_users_location";
    `);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "profile_views";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_relationships";`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS relationship_type;`);
  }
} 