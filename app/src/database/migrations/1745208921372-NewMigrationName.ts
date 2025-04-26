import { MigrationInterface, QueryRunner } from "typeorm";

export class NewMigrationName1745208921372 implements MigrationInterface {
    name = 'NewMigrationName1745208921372'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create scanned_areas table
        await queryRunner.query(`
            CREATE TABLE "scanned_areas" (
                "geohashPrefix" character varying NOT NULL,
                "lastScannedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                CONSTRAINT "PK_scanned_areas_geohashPrefix" PRIMARY KEY ("geohashPrefix")
            )
        `);

        // 2. Add location geometry column to venues
        await queryRunner.query(`
            ALTER TABLE "venues"
            ADD COLUMN "location" geometry(Point, 4326)
        `);

        // 3. Populate location from existing lat/lon
        await queryRunner.query(`
            UPDATE "venues"
            SET "location" = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
            WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;
        `);

        // 4. Create spatial index on location
        await queryRunner.query(`
            CREATE INDEX "IDX_venues_location"
            ON "venues" USING GiST ("location")
        `);

        // 5. Ensure lastRefreshed column exists (add if not - defensive)
        // Check if column exists before attempting to add
        const venuesTable = await queryRunner.getTable("venues");
        if (venuesTable && !venuesTable.findColumnByName("lastRefreshed")) {
            await queryRunner.query(`
                ALTER TABLE "venues"
                ADD COLUMN "lastRefreshed" timestamp with time zone NULL
            `);
        }

        // 6. Add standard indexes
        await queryRunner.query(`
            CREATE INDEX "IDX_venues_googlePlaceId"
            ON "venues" ("googlePlaceId")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_venues_lastRefreshed"
            ON "venues" ("lastRefreshed")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert standard indexes
        await queryRunner.query(`DROP INDEX "public"."IDX_venues_lastRefreshed"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_venues_googlePlaceId"`);

        // Revert lastRefreshed addition (only if we added it)
        // Note: This simplistic check might not be robust if the column existed with a different type.
        // A more robust down migration might check the state *before* the 'up' ran.
        const venuesTable = await queryRunner.getTable("venues");
        if (venuesTable && venuesTable.findColumnByName("lastRefreshed")) {
             // Assuming we added it if it exists now - adjust if needed
             // This check is imperfect. A better way is to check the state *before* `up`.
             // For now, we check if it exists and drop it. Consider if it existed before.
            const lastRefreshedExistsBefore = false; // Placeholder: Ideally check pre-migration state
            if (!lastRefreshedExistsBefore) { // Only drop if we are sure WE added it.
                 await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "lastRefreshed"`);
            }
        }

        // Revert spatial index
        await queryRunner.query(`DROP INDEX "public"."IDX_venues_location"`);

        // Revert location column addition (Data loss from this column occurs here)
        await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "location"`);

        // Revert scanned_areas table creation
        await queryRunner.query(`DROP TABLE "scanned_areas"`);

        // Note: The down migration does not revert the PostGIS extension itself.
        // It also doesn't restore the original latitude/longitude if they were modified/dropped in later steps.
    }

}
