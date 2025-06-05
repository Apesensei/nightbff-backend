import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class CreateVenueTables1712000000000 implements MigrationInterface {
  name = "CreateVenueTables1712000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- Create venues table ---
    await queryRunner.createTable(
      new Table({
        name: "venues",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          { name: "name", type: "varchar", isNullable: false },
          { name: "description", type: "text", isNullable: true },
          { name: "address_line_1", type: "varchar", isNullable: false },
          { name: "address_line_2", type: "varchar", isNullable: true },
          { name: "city", type: "varchar", isNullable: false },
          { name: "state", type: "varchar", isNullable: false },
          { name: "postal_code", type: "varchar", isNullable: false },
          { name: "country", type: "varchar", isNullable: false },
          { name: "latitude", type: "double precision", isNullable: false },
          { name: "longitude", type: "double precision", isNullable: false },
          { name: "phone_number", type: "varchar", isNullable: true },
          { name: "website", type: "varchar", isNullable: true },
          { name: "category", type: "varchar", isNullable: true }, // Consider enum type if applicable
          { name: "capacity", type: "int", isNullable: true },
          { name: "tags", type: "text", isArray: true, isNullable: true },
          {
            name: "is_active",
            type: "boolean",
            default: true,
            isNullable: false,
          },
          {
            name: "created_at",
            type: "timestamp with time zone",
            default: "now()",
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamp with time zone",
            default: "now()",
            isNullable: false,
          },
          { name: "owner_id", type: "uuid", isNullable: true }, // Assuming relation to users
          { name: "cover_image_url", type: "varchar", isNullable: true },
          { name: "profile_image_url", type: "varchar", isNullable: true },
          { name: "entry_requirements", type: "text", isNullable: true },
          { name: "music_policy", type: "text", isNullable: true },
          { name: "dress_code", type: "text", isNullable: true },
          {
            name: "average_rating",
            type: "float",
            default: 0,
            isNullable: false,
          },
          { name: "review_count", type: "int", default: 0, isNullable: false },
          {
            name: "trending_score",
            type: "int",
            default: 0,
            isNullable: false,
          },
        ],
        indices: [
          new TableIndex({
            name: "IDX_venue_location",
            columnNames: ["latitude", "longitude"],
          }), // Geospatial index
          new TableIndex({
            name: "IDX_venue_owner_id",
            columnNames: ["owner_id"],
          }),
          new TableIndex({
            name: "IDX_venue_trending_score",
            columnNames: ["trending_score"],
          }),
          new TableIndex({
            name: "IDX_venue_is_active",
            columnNames: ["is_active"],
          }),
        ],
      }),
      true, // Create foreign keys if any defined inline (none here)
    );

    // Add FK for owner_id if users table exists (it should now)
    const foreignKeyName = "FK_venues_owner_id_users";
    const foreignKeyExists = await queryRunner.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'venues' AND constraint_name = '${foreignKeyName}'
    `);

    if (!foreignKeyExists.length) {
      await queryRunner.createForeignKey(
        "venues",
        new TableForeignKey({
          name: foreignKeyName, // Explicitly named constraint
          columnNames: ["owner_id"],
          referencedColumnNames: ["id"],
          referencedTableName: "users",
          onDelete: "SET NULL",
          onUpdate: "CASCADE",
        }),
      );
    }

    // --- Create venue_hours table ---
    await queryRunner.createTable(
      new Table({
        name: "venue_hours",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          { name: "venue_id", type: "uuid", isNullable: false },
          { name: "day_of_week", type: "int", isNullable: false }, // 0 = Sunday, 6 = Saturday
          { name: "open_time", type: "time", isNullable: true },
          { name: "close_time", type: "time", isNullable: true },
          {
            name: "is_closed",
            type: "boolean",
            default: false,
            isNullable: false,
          },
          {
            name: "is_open_24_hours",
            type: "boolean",
            default: false,
            isNullable: false,
          },
        ],
        indices: [
          new TableIndex({
            name: "IDX_venue_hours_venue_id",
            columnNames: ["venue_id"],
          }),
        ],
      }),
      true,
    );

    // FK for venue_hours to venues
    const venueHoursFkName = "FK_venue_hours_venue_id_venues";
    const venueHoursFkExists = await queryRunner.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'venue_hours' AND constraint_name = '${venueHoursFkName}'
    `);

    if (!venueHoursFkExists.length) {
      await queryRunner.createForeignKey(
        "venue_hours",
        new TableForeignKey({
          name: venueHoursFkName, // Explicitly named constraint
          columnNames: ["venue_id"],
          referencedColumnNames: ["id"],
          referencedTableName: "venues",
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        }),
      );
    }

    // --- Create venue_events table ---
    await queryRunner.createTable(
      new Table({
        name: "venue_events", // Assuming table name from entity
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          { name: "venue_id", type: "uuid", isNullable: false },
          { name: "name", type: "varchar", isNullable: false },
          { name: "description", type: "text", isNullable: true },
          {
            name: "start_time",
            type: "timestamp with time zone",
            isNullable: false,
          },
          {
            name: "end_time",
            type: "timestamp with time zone",
            isNullable: true,
          },
          {
            name: "ticket_price",
            type: "decimal",
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          { name: "ticket_url", type: "varchar", isNullable: true },
          { name: "image_url", type: "varchar", isNullable: true },
          { name: "tags", type: "text", isArray: true, isNullable: true },
          {
            name: "is_recurring",
            type: "boolean",
            default: false,
            isNullable: false,
          },
          { name: "recurrence_pattern", type: "varchar", isNullable: true }, // e.g., 'FREQ=WEEKLY;BYDAY=FR'
          {
            name: "created_at",
            type: "timestamp with time zone",
            default: "now()",
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamp with time zone",
            default: "now()",
            isNullable: false,
          },
        ],
        indices: [
          new TableIndex({
            name: "IDX_venue_events_venue_id",
            columnNames: ["venue_id"],
          }),
          new TableIndex({
            name: "IDX_venue_events_start_time",
            columnNames: ["start_time"],
          }),
        ],
      }),
      true,
    );

    // FK for venue_events to venues
    const venueEventsFkName = "FK_venue_events_venue_id_venues";
    const venueEventsFkExistsResult = await queryRunner.query(`
      SELECT constraint_name 
      FROM information_schema.referential_constraints 
      WHERE constraint_name = '${venueEventsFkName}' AND 
            unique_constraint_schema = 'public' AND -- Assuming venues table is in public schema
            constraint_schema = 'public' -- Assuming venue_events table is in public schema
    `);

    if (venueEventsFkExistsResult.length === 0) {
      await queryRunner.createForeignKey(
        "venue_events",
        new TableForeignKey({
          name: venueEventsFkName, // Explicitly named constraint
          columnNames: ["venue_id"],
          referencedColumnNames: ["id"],
          referencedTableName: "venues",
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        }),
      );
    }

    // --- Create venue_reviews table ---
    await queryRunner.createTable(
      new Table({
        name: "venue_reviews", // Assuming table name from entity
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          { name: "venue_id", type: "uuid", isNullable: false },
          { name: "user_id", type: "uuid", isNullable: false },
          { name: "rating", type: "int", isNullable: false }, // e.g., 1-5
          { name: "review", type: "text", isNullable: true },
          {
            name: "is_verified_visit",
            type: "boolean",
            default: false,
            isNullable: false,
          },
          { name: "upvote_count", type: "int", default: 0, isNullable: false },
          {
            name: "downvote_count",
            type: "int",
            default: 0,
            isNullable: false,
          },
          {
            name: "is_published",
            type: "boolean",
            default: true,
            isNullable: false,
          },
          {
            name: "created_at",
            type: "timestamp with time zone",
            default: "now()",
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamp with time zone",
            default: "now()",
            isNullable: false,
          },
        ],
        indices: [
          new TableIndex({
            name: "IDX_venue_reviews_venue_id",
            columnNames: ["venue_id"],
          }),
          new TableIndex({
            name: "IDX_venue_reviews_user_id",
            columnNames: ["user_id"],
          }),
          new TableIndex({
            name: "IDX_venue_reviews_rating",
            columnNames: ["rating"],
          }),
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      "venue_reviews",
      new TableForeignKey({
        columnNames: ["venue_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "venues",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "venue_reviews",
      new TableForeignKey({
        columnNames: ["user_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "users", // Depends on users table existing
        onDelete: "CASCADE", // If user deleted, remove their reviews
        onUpdate: "CASCADE",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order of creation, handling foreign keys first

    // venue_reviews
    const venueReviewsTable = await queryRunner.getTable("venue_reviews");
    if (venueReviewsTable) {
      const venueReviewsFkVenue = venueReviewsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf("venue_id") !== -1,
      );
      const venueReviewsFkUser = venueReviewsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf("user_id") !== -1,
      );
      if (venueReviewsFkVenue) {
        await queryRunner.dropForeignKey("venue_reviews", venueReviewsFkVenue);
      }
      if (venueReviewsFkUser) {
        await queryRunner.dropForeignKey("venue_reviews", venueReviewsFkUser);
      }
      await queryRunner.dropTable("venue_reviews");
    }

    // venue_events
    const venueEventsTable = await queryRunner.getTable("venue_events");
    if (venueEventsTable) {
      const venueEventsFkVenue = venueEventsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf("venue_id") !== -1,
      );
      if (venueEventsFkVenue) {
        await queryRunner.dropForeignKey("venue_events", venueEventsFkVenue);
      }
      await queryRunner.dropTable("venue_events");
    }

    // venue_hours
    const venueHoursTable = await queryRunner.getTable("venue_hours");
    if (venueHoursTable) {
      const venueHoursFkVenue = venueHoursTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf("venue_id") !== -1,
      );
      if (venueHoursFkVenue) {
        await queryRunner.dropForeignKey("venue_hours", venueHoursFkVenue);
      }
      await queryRunner.dropTable("venue_hours");
    }

    // venues
    const venuesTable = await queryRunner.getTable("venues");
    if (venuesTable) {
      const venuesFkOwner = venuesTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf("owner_id") !== -1,
      );
      if (venuesFkOwner) {
        await queryRunner.dropForeignKey("venues", venuesFkOwner);
      }
      // Drop indices if specifically named and needed
      // await queryRunner.dropIndex("venues", "IDX_venue_location");
      // await queryRunner.dropIndex("venues", "IDX_venue_owner_id");
      // await queryRunner.dropIndex("venues", "IDX_venue_trending_score");
      // await queryRunner.dropIndex("venues", "IDX_venue_is_active");
      await queryRunner.dropTable("venues");
    }
  }
}
