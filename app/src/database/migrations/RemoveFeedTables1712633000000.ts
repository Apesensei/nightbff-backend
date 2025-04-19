import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from "typeorm";

// NOTE: Table/column definitions in the 'down' method are inferred guesses based on common patterns
// and the likely entities (Post, PostComment, PostLike, PostMedia).
// These should be verified against the original table structures if possible for accurate rollback.

export class RemoveFeedTables1712633000000 implements MigrationInterface {
  name = "RemoveFeedTables1712633000000";

  // Helper logging method
  private log(message: string): void {
    console.log(`[${this.name}] ${message}`);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.log("Migration UP Start: Dropping feed tables...");
    // Drop dependent tables first (comments, likes, media) - Ensure FKs are handled
    // The 'true' arguments attempt to drop foreign keys, indices automatically.
    await queryRunner.dropTable("post_comments", true, true, true);
    await queryRunner.dropTable("post_likes", true, true, true);
    await queryRunner.dropTable("post_media", true, true, true);

    // Drop the main posts table
    await queryRunner.dropTable("posts", true, true, true);

    this.log(
      "Migration UP Complete: Dropped posts, post_comments, post_likes, post_media tables.",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.log(
      "Migration DOWN Start: Recreating feed tables (Verify structure!)...",
    );
    // Recreate posts table (assuming basic structure)
    await queryRunner.createTable(
      new Table({
        name: "posts",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          { name: "userId", type: "uuid" },
          { name: "venueId", type: "uuid", isNullable: true },
          { name: "content", type: "text", isNullable: true },
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
        foreignKeys: [
          new TableForeignKey({
            columnNames: ["userId"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE",
          }),
          new TableForeignKey({
            columnNames: ["venueId"],
            referencedColumnNames: ["id"],
            referencedTableName: "venues",
            onDelete: "SET NULL",
          }),
        ],
      }),
      true,
    );

    // Recreate post_media table
    await queryRunner.createTable(
      new Table({
        name: "post_media",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          { name: "postId", type: "uuid" },
          { name: "url", type: "varchar" },
          { name: "type", type: "varchar" }, // e.g., 'image', 'video'
          {
            name: "createdAt",
            type: "timestamp with time zone",
            default: "CURRENT_TIMESTAMP",
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ["postId"],
            referencedColumnNames: ["id"],
            referencedTableName: "posts",
            onDelete: "CASCADE",
          }),
        ],
      }),
      true,
    );

    // Recreate post_likes table
    await queryRunner.createTable(
      new Table({
        name: "post_likes",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          { name: "postId", type: "uuid" },
          { name: "userId", type: "uuid" },
          {
            name: "createdAt",
            type: "timestamp with time zone",
            default: "CURRENT_TIMESTAMP",
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ["postId"],
            referencedColumnNames: ["id"],
            referencedTableName: "posts",
            onDelete: "CASCADE",
          }),
          new TableForeignKey({
            columnNames: ["userId"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE",
          }),
        ],
        uniques: [{ columnNames: ["postId", "userId"] }], // Ensure user can only like once
      }),
      true,
    );

    // Recreate post_comments table
    await queryRunner.createTable(
      new Table({
        name: "post_comments",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          { name: "postId", type: "uuid" },
          { name: "userId", type: "uuid" },
          { name: "content", type: "text" },
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
        foreignKeys: [
          new TableForeignKey({
            columnNames: ["postId"],
            referencedColumnNames: ["id"],
            referencedTableName: "posts",
            onDelete: "CASCADE",
          }),
          new TableForeignKey({
            columnNames: ["userId"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "CASCADE",
          }),
        ],
      }),
      true,
    );

    this.log("Migration DOWN Complete: Recreated feed tables.");
  }
}
