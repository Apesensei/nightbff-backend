import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
  TableUnique,
} from "typeorm";

export class VenueTrendingFollows1712023000000 implements MigrationInterface {
  name = "VenueTrendingFollows1712023000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add columns to venues table
    await queryRunner.addColumns("venues", [
      new TableColumn({
        name: "viewCount",
        type: "integer",
        default: 0,
        isNullable: false,
      }),
      new TableColumn({
        name: "followerCount",
        type: "integer",
        default: 0,
        isNullable: false,
      }),
      new TableColumn({
        name: "associatedPlanCount",
        type: "integer",
        default: 0,
        isNullable: false,
      }),
      new TableColumn({
        name: "trendingScore",
        type: "real", // Use 'real' or 'double precision' for float
        default: 0,
        isNullable: false,
      }),
    ]);

    // Add index to trendingScore -- REMOVED, index created in CreateVenueTables migration
    // await queryRunner.createIndex('venues', new TableIndex({
    //     name: "IDX_venue_trending_score",
    //     columnNames: ["trendingScore"]
    // }));

    // Create follows table
    await queryRunner.createTable(
      new Table({
        name: "follows",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()", // Assuming uuid-ossp extension
          },
          {
            name: "userId",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "type",
            type: "enum",
            enum: ["user", "venue"], // Match enum defined in entity
            isNullable: false,
          },
          {
            name: "followedUserId",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "followedVenueId",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "createdAt",
            type: "timestamp with time zone",
            default: "now()",
            isNullable: false,
          },
        ],
        indices: [
          new TableIndex({
            name: "IDX_follow_userId",
            columnNames: ["userId"],
          }),
          new TableIndex({ name: "IDX_follow_type", columnNames: ["type"] }),
          new TableIndex({
            name: "IDX_follow_followedUserId",
            columnNames: ["followedUserId"],
          }),
          new TableIndex({
            name: "IDX_follow_followedVenueId",
            columnNames: ["followedVenueId"],
          }),
        ],
        uniques: [
          // Match unique constraint defined in entity
          new TableUnique({
            name: "UQ_user_follow",
            columnNames: ["userId", "followedUserId", "followedVenueId"],
          }),
        ],
      }),
      true, // Create foreign keys if specified (we haven't added FKs here yet)
    );

    // TODO: Consider adding foreign key constraints for userId, followedUserId, followedVenueId
    // Example:
    // await queryRunner.createForeignKey("follows", new TableForeignKey({
    //     columnNames: ["userId"],
    //     referencedColumnNames: ["id"],
    //     referencedTableName: "users", // Replace with actual users table name
    //     onDelete: "CASCADE"
    // }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop follows table uniques, indices, constraints, and table
    await queryRunner.dropUniqueConstraint("follows", "UQ_user_follow");
    await queryRunner.dropIndex("follows", "IDX_follow_followedVenueId");
    await queryRunner.dropIndex("follows", "IDX_follow_followedUserId");
    await queryRunner.dropIndex("follows", "IDX_follow_type");
    await queryRunner.dropIndex("follows", "IDX_follow_userId");
    // Drop foreign keys if they were added
    await queryRunner.dropTable("follows");

    // Drop venues index and columns
    await queryRunner.dropIndex("venues", "IDX_venue_trending_score");
    await queryRunner.dropColumns("venues", [
      "trendingScore",
      "associatedPlanCount",
      "followerCount",
      "viewCount",
    ]);
  }
}
