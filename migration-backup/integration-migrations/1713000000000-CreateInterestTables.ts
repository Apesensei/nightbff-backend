import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class CreateInterestTables1713000000000 implements MigrationInterface {
  name = "CreateInterestTables1713000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create interests table
    await queryRunner.createTable(
      new Table({
        name: "interests",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          {
            name: "name",
            type: "varchar",
            isNullable: false,
            isUnique: true,
          },
          {
            name: "icon",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "is_icon_emoji",
            type: "boolean",
            default: true,
            isNullable: false,
          },
          {
            name: "image_url",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "usage_count",
            type: "integer",
            default: 0,
            isNullable: false,
          },
          {
            name: "is_active",
            type: "boolean",
            default: true,
            isNullable: false,
          },
          {
            name: "sort_order",
            type: "integer",
            default: 0,
            isNullable: false,
          },
          {
            name: "created_at",
            type: "timestamp with time zone",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamp with time zone",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create indexes on interests table
    await queryRunner.createIndex(
      "interests",
      new TableIndex({
        name: "IDX_interests_name",
        columnNames: ["name"],
      }),
    );

    await queryRunner.createIndex(
      "interests",
      new TableIndex({
        name: "IDX_interests_sort_order",
        columnNames: ["sort_order"],
      }),
    );

    // Create user_interests table
    await queryRunner.createTable(
      new Table({
        name: "user_interests",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          {
            name: "user_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "interest_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "created_at",
            type: "timestamp with time zone",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
        ],
        uniques: [
          {
            name: "UQ_user_interests_user_id_interest_id",
            columnNames: ["user_id", "interest_id"],
          },
        ],
      }),
      true,
    );

    // Create indexes on user_interests table
    await queryRunner.createIndex(
      "user_interests",
      new TableIndex({
        name: "IDX_user_interests_user_id",
        columnNames: ["user_id"],
      }),
    );

    await queryRunner.createIndex(
      "user_interests",
      new TableIndex({
        name: "IDX_user_interests_interest_id",
        columnNames: ["interest_id"],
      }),
    );

    // Create foreign keys for user_interests table
    await queryRunner.createForeignKey(
      "user_interests",
      new TableForeignKey({
        name: "FK_user_interests_user_id",
        columnNames: ["user_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "user_interests",
      new TableForeignKey({
        name: "FK_user_interests_interest_id",
        columnNames: ["interest_id"],
        referencedTableName: "interests",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    // Create event_interests table
    await queryRunner.createTable(
      new Table({
        name: "event_interests",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          {
            name: "event_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "interest_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "created_at",
            type: "timestamp with time zone",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
        ],
        uniques: [
          {
            name: "UQ_event_interests_event_id_interest_id",
            columnNames: ["event_id", "interest_id"],
          },
        ],
      }),
      true,
    );

    // Create indexes on event_interests table
    await queryRunner.createIndex(
      "event_interests",
      new TableIndex({
        name: "IDX_event_interests_event_id",
        columnNames: ["event_id"],
      }),
    );

    await queryRunner.createIndex(
      "event_interests",
      new TableIndex({
        name: "IDX_event_interests_interest_id",
        columnNames: ["interest_id"],
      }),
    );

    // Create foreign keys for event_interests table
    await queryRunner.createForeignKey(
      "event_interests",
      new TableForeignKey({
        name: "FK_event_interests_event_id",
        columnNames: ["event_id"],
        referencedTableName: "events",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "event_interests",
      new TableForeignKey({
        name: "FK_event_interests_interest_id",
        columnNames: ["interest_id"],
        referencedTableName: "interests",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop event_interests table and its foreign keys
    await queryRunner.dropForeignKey(
      "event_interests",
      "FK_event_interests_interest_id",
    );
    await queryRunner.dropForeignKey(
      "event_interests",
      "FK_event_interests_event_id",
    );
    await queryRunner.dropIndex(
      "event_interests",
      "IDX_event_interests_interest_id",
    );
    await queryRunner.dropIndex(
      "event_interests",
      "IDX_event_interests_event_id",
    );
    await queryRunner.dropTable("event_interests");

    // Drop user_interests table and its foreign keys
    await queryRunner.dropForeignKey(
      "user_interests",
      "FK_user_interests_interest_id",
    );
    await queryRunner.dropForeignKey(
      "user_interests",
      "FK_user_interests_user_id",
    );
    await queryRunner.dropIndex(
      "user_interests",
      "IDX_user_interests_interest_id",
    );
    await queryRunner.dropIndex("user_interests", "IDX_user_interests_user_id");
    await queryRunner.dropTable("user_interests");

    // Drop interests table and its indexes
    await queryRunner.dropIndex("interests", "IDX_interests_sort_order");
    await queryRunner.dropIndex("interests", "IDX_interests_name");
    await queryRunner.dropTable("interests");
  }
}
