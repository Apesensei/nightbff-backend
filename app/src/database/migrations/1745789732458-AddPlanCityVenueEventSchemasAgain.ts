import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlanCityVenueEventSchemasAgain1745789732458
  implements MigrationInterface
{
  name = "AddPlanCityVenueEventSchemasAgain1745789732458";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "scanned_areas" ("geohashPrefix" character varying NOT NULL, "lastScannedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_937801f82c5ec38c81755b36726" PRIMARY KEY ("geohashPrefix"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "cities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "countryCode" character varying(2) NOT NULL, "location" geometry(Point,4326), "flagEmoji" character varying(10), "trendingScore" double precision NOT NULL DEFAULT '0', "planCount" integer NOT NULL DEFAULT '0', "imageUrl" character varying(2048), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4762ffb6e5d198cfec5606bc11e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a0ae8d83b7d32359578c486e7f" ON "cities" ("name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_abacb36a11894c7ea2b2d9fb5e" ON "cities" ("countryCode") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b0c5868a3c4663b0e72a6030a6" ON "cities" USING GiST ("location") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7201b4af6d9fd6510e270a7e07" ON "cities" ("trendingScore") `,
    );
    await queryRunner.query(
      `CREATE TABLE "plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "creatorId" character varying NOT NULL, "cityId" uuid NOT NULL, "venueId" uuid, "startDate" TIMESTAMP WITH TIME ZONE NOT NULL, "endDate" TIMESTAMP WITH TIME ZONE, "coverImage" character varying(2048), "saveCount" integer NOT NULL DEFAULT '0', "viewCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a48664d25316696deb0a6fc66f" ON "plans" ("creatorId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_034e9273d461b1b37c8e68e4e8" ON "plans" ("cityId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dec93618a15cb3c6a5d64711d0" ON "plans" ("venueId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8912913a71ed6f154ee413bace" ON "plans" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "plan_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "planId" uuid NOT NULL, "userId" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_fb22223770225ebfb91ead851fe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_75c2da58e88bd7b23d2b333b4c" ON "plan_users" ("userId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_0e266f75dbcad0e3390da21923" ON "plan_users" ("planId", "userId") `,
    );

    // Idempotent venue column changes - check if columns exist before dropping/adding
    const venuesTable = await queryRunner.getTable("venues");

    // Drop latitude column if it exists
    if (venuesTable && venuesTable.findColumnByName("latitude")) {
      await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "latitude"`);
    }

    // Drop longitude column if it exists
    if (venuesTable && venuesTable.findColumnByName("longitude")) {
      await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "longitude"`);
    }

    // Add location column if it doesn't exist
    const venuesTableUpdated = await queryRunner.getTable("venues");
    if (
      venuesTableUpdated &&
      !venuesTableUpdated.findColumnByName("location")
    ) {
      await queryRunner.query(
        `ALTER TABLE "venues" ADD "location" geometry(Point,4326)`,
      );
    }

    // Add city_id column to venues if it doesn't exist
    const venuesTableForCityId = await queryRunner.getTable("venues");
    if (
      venuesTableForCityId &&
      !venuesTableForCityId.findColumnByName("city_id")
    ) {
      await queryRunner.query(`ALTER TABLE "venues" ADD "city_id" uuid`);
    }

    // Add city_id column to events if it doesn't exist
    const eventsTable = await queryRunner.getTable("events");
    if (eventsTable && !eventsTable.findColumnByName("city_id")) {
      await queryRunner.query(`ALTER TABLE "events" ADD "city_id" uuid`);
    }

    await queryRunner.query(
      `ALTER TYPE "public"."user_profiles_gender_enum" RENAME TO "user_profiles_gender_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_profiles_gender_enum" AS ENUM('male', 'female', 'other')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ALTER COLUMN "gender" TYPE "public"."user_profiles_gender_enum" USING "gender"::"text"::"public"."user_profiles_gender_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."user_profiles_gender_enum_old"`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_be677afd59218cba25e6e38789" ON "venues" USING GiST ("location")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c2ab6dcc752b5c95b2baefb41c" ON "venues" ("city_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_53a3ffaa30453fb76c0822c236" ON "events" ("city_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" ADD CONSTRAINT "FK_034e9273d461b1b37c8e68e4e87" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_users" ADD CONSTRAINT "FK_f2056450d77cd0e46024562aa10" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "plan_users" DROP CONSTRAINT "FK_f2056450d77cd0e46024562aa10"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plans" DROP CONSTRAINT "FK_034e9273d461b1b37c8e68e4e87"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_53a3ffaa30453fb76c0822c236"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c2ab6dcc752b5c95b2baefb41c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_be677afd59218cba25e6e38789"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_profiles_gender_enum_old" AS ENUM('male', 'female', 'other', 'prefer_not_to_say')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ALTER COLUMN "gender" TYPE "public"."user_profiles_gender_enum_old" USING "gender"::"text"::"public"."user_profiles_gender_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."user_profiles_gender_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."user_profiles_gender_enum_old" RENAME TO "user_profiles_gender_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "city_id"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "city_id"`);
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN "location"`);
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "longitude" numeric(10,7) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "venues" ADD "latitude" numeric(10,7) NOT NULL`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0e266f75dbcad0e3390da21923"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_75c2da58e88bd7b23d2b333b4c"`,
    );
    await queryRunner.query(`DROP TABLE "plan_users"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8912913a71ed6f154ee413bace"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dec93618a15cb3c6a5d64711d0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_034e9273d461b1b37c8e68e4e8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a48664d25316696deb0a6fc66f"`,
    );
    await queryRunner.query(`DROP TABLE "plans"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7201b4af6d9fd6510e270a7e07"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b0c5868a3c4663b0e72a6030a6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_abacb36a11894c7ea2b2d9fb5e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a0ae8d83b7d32359578c486e7f"`,
    );
    await queryRunner.query(`DROP TABLE "cities"`);
    await queryRunner.query(`DROP TABLE "scanned_areas"`);
  }
}
