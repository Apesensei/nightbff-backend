import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from "typeorm";
import { EventVisibility } from "../microservices/event/enums/event-visibility.enum"; // Import enum for default
import { EventAttendeeStatus } from "../microservices/event/enums/event-attendee-status.enum"; // Import enum for default

export class CreateEventsTables1712999999999 implements MigrationInterface {
  name = "CreateEventsTables1712999999999";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create events table
    await queryRunner.createTable(
      new Table({
        name: "events",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          { name: "title", type: "varchar", length: "60" },
          { name: "description", type: "text" },
          { name: "creatorId", type: "uuid" },
          { name: "venueId", type: "uuid", isNullable: true },
          { name: "customLocation", type: "varchar", isNullable: true },
          { name: "startTime", type: "timestamp with time zone" },
          {
            name: "endTime",
            type: "timestamp with time zone",
            isNullable: true,
          },
          { name: "coverImage", type: "varchar", isNullable: true },
          { name: "attendeeLimit", type: "integer", isNullable: true },
          {
            name: "visibility",
            type: "enum",
            enum: Object.values(EventVisibility),
            default: `'${EventVisibility.PUBLIC}'`,
          },
          { name: "requireApproval", type: "boolean", default: false },
          { name: "trendingScore", type: "float", default: 0 },
          { name: "viewCount", type: "integer", default: 0 },
          {
            name: "createdAt",
            type: "timestamp with time zone",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updatedAt",
            type: "timestamp with time zone",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true, // Create foreign keys if specified (none in this table definition itself)
    );

    // Add indices for events table
    await queryRunner.createIndex(
      "events",
      new TableIndex({ name: "IDX_events_title", columnNames: ["title"] }),
    );
    await queryRunner.createIndex(
      "events",
      new TableIndex({
        name: "IDX_events_creatorId",
        columnNames: ["creatorId"],
      }),
    );
    await queryRunner.createIndex(
      "events",
      new TableIndex({ name: "IDX_events_venueId", columnNames: ["venueId"] }),
    );
    await queryRunner.createIndex(
      "events",
      new TableIndex({
        name: "IDX_events_startTime",
        columnNames: ["startTime"],
      }),
    );
    await queryRunner.createIndex(
      "events",
      new TableIndex({
        name: "IDX_events_visibility",
        columnNames: ["visibility"],
      }),
    );
    await queryRunner.createIndex(
      "events",
      new TableIndex({
        name: "IDX_events_trendingScore",
        columnNames: ["trendingScore"],
      }),
    );
    await queryRunner.createIndex(
      "events",
      new TableIndex({
        name: "IDX_events_createdAt",
        columnNames: ["createdAt"],
      }),
    );

    // Create event_attendees table
    await queryRunner.createTable(
      new Table({
        name: "event_attendees",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          { name: "userId", type: "uuid" },
          { name: "eventId", type: "uuid" },
          {
            name: "status",
            type: "enum",
            enum: Object.values(EventAttendeeStatus),
            default: `'${EventAttendeeStatus.INVITED}'`,
          },
          {
            name: "joinedAt",
            type: "timestamp with time zone",
            default: "CURRENT_TIMESTAMP",
          },
        ],
        // Define unique constraint directly in table definition if possible, or add later
        uniques: [
          {
            name: "UQ_event_attendees_eventId_userId",
            columnNames: ["eventId", "userId"],
          },
        ],
      }),
      true,
    );

    // Add indices for event_attendees table
    await queryRunner.createIndex(
      "event_attendees",
      new TableIndex({
        name: "IDX_event_attendees_userId",
        columnNames: ["userId"],
      }),
    );
    await queryRunner.createIndex(
      "event_attendees",
      new TableIndex({
        name: "IDX_event_attendees_eventId",
        columnNames: ["eventId"],
      }),
    );
    await queryRunner.createIndex(
      "event_attendees",
      new TableIndex({
        name: "IDX_event_attendees_status",
        columnNames: ["status"],
      }),
    );
    await queryRunner.createIndex(
      "event_attendees",
      new TableIndex({
        name: "IDX_event_attendees_joinedAt",
        columnNames: ["joinedAt"],
      }),
    );

    // Add foreign keys AFTER tables are created
    // Assuming 'users' table exists (from 1694400000000-CreateUserTable.ts)
    await queryRunner.createForeignKey(
      "events",
      new TableForeignKey({
        columnNames: ["creatorId"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }), // Consider if CASCADE is appropriate here
    );
    // Assuming 'venues' table exists (from 1712000000000-CreateVenueTables.ts)
    await queryRunner.createForeignKey(
      "events",
      new TableForeignKey({
        columnNames: ["venueId"],
        referencedTableName: "venues",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }), // SET NULL seems appropriate if venue is deleted
    );
    await queryRunner.createForeignKey(
      "event_attendees",
      new TableForeignKey({
        columnNames: ["userId"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );
    await queryRunner.createForeignKey(
      "event_attendees",
      new TableForeignKey({
        columnNames: ["eventId"],
        referencedTableName: "events",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    // Note: Need to get the constraint names TypeORM generates or look them up
    // Using placeholder names - these might need adjustment based on actual DB state
    await queryRunner.dropForeignKey(
      "event_attendees",
      "FK_event_attendees_eventId",
    ); // Placeholder name
    await queryRunner.dropForeignKey(
      "event_attendees",
      "FK_event_attendees_userId",
    ); // Placeholder name
    await queryRunner.dropForeignKey("events", "FK_events_venueId"); // Placeholder name
    await queryRunner.dropForeignKey("events", "FK_events_creatorId"); // Placeholder name

    // Drop indices (optional but good practice)
    await queryRunner.dropIndex(
      "event_attendees",
      "IDX_event_attendees_joinedAt",
    );
    await queryRunner.dropIndex(
      "event_attendees",
      "IDX_event_attendees_status",
    );
    await queryRunner.dropIndex(
      "event_attendees",
      "IDX_event_attendees_eventId",
    );
    await queryRunner.dropIndex(
      "event_attendees",
      "IDX_event_attendees_userId",
    );

    await queryRunner.dropIndex("events", "IDX_events_createdAt");
    await queryRunner.dropIndex("events", "IDX_events_trendingScore");
    await queryRunner.dropIndex("events", "IDX_events_visibility");
    await queryRunner.dropIndex("events", "IDX_events_startTime");
    await queryRunner.dropIndex("events", "IDX_events_venueId");
    await queryRunner.dropIndex("events", "IDX_events_creatorId");
    await queryRunner.dropIndex("events", "IDX_events_title");

    // Drop tables
    await queryRunner.dropTable("event_attendees");
    await queryRunner.dropTable("events");
  }
}
