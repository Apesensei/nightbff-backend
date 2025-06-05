import {
  MigrationInterface,
  QueryRunner,
  Table,
  // TableIndex, // Removed unused import
  // TableForeignKey, // Removed unused import
} from "typeorm";

export class CreateUserTable1694400000000 implements MigrationInterface {
  name = "CreateUserTable1694400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available for uuid_generate_v4()
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Check if users_status_enum type exists
    const enumExistsResult = await queryRunner.query(
      `SELECT 1 FROM pg_type WHERE typname = 'users_status_enum' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')`,
    );

    if (enumExistsResult.length === 0) {
      // Explicitly create enum type if it doesn't exist
      await queryRunner.query(
        `CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'inactive', 'suspended')`,
      );
    }

    // Create users table based on User entity
    await queryRunner.createTable(
      new Table({
        name: "users",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "email",
            type: "varchar",
            isUnique: true,
            isNullable: false,
          },
          {
            name: "username",
            type: "varchar",
            isUnique: true,
            isNullable: false,
          },
          {
            name: "display_name",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "password_hash",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "photo_url",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "bio",
            type: "text", // Use text for potentially longer bios
            isNullable: true,
          },
          {
            name: "interests",
            type: "text", // Store as simple-array, text is suitable
            isArray: true,
            isNullable: true,
          },
          {
            name: "is_verified",
            type: "boolean",
            default: false,
            isNullable: false,
          },
          {
            name: "is_premium",
            type: "boolean",
            default: false,
            isNullable: false,
          },
          {
            name: "is_age_verified",
            type: "boolean",
            default: false,
            isNullable: false,
          },
          {
            name: "is_online",
            type: "boolean",
            default: false,
            isNullable: false,
          },
          {
            name: "location_latitude",
            type: "float",
            isNullable: true,
          },
          {
            name: "location_longitude",
            type: "float",
            isNullable: true,
          },
          {
            name: "status",
            type: "enum",
            enumName: "users_status_enum", // Use the explicitly created enum
            enum: ["active", "inactive", "suspended"], // Still provide for TypeORM metadata
            default: "'active'",
            isNullable: false,
          },
          {
            name: "roles",
            type: "text", // Store as simple-array
            isArray: true,
            default: "'{user}'", // Default needs array literal syntax
            isNullable: false,
          },
          {
            name: "created_at",
            type: "timestamp with time zone", // Match entity
            default: "now()",
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamp with time zone", // Match entity
            default: "now()",
            isNullable: false,
            // ON UPDATE CURRENT_TIMESTAMP needs trigger in Postgres or handle in code
          },
          // ageVerification relation is handled by its own table/FK
        ],
        indices: [
          // Add relevant indices if needed (e.g., location)
          // new TableIndex({ name: "IDX_user_location", columnNames: ["location_latitude", "location_longitude"] }),
        ],
      }),
      true, // Create foreign keys if specified (none in this table definition)
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indices if created
    // await queryRunner.dropIndex("users", "IDX_user_location");
    await queryRunner.dropTable("users");

    // Check if users_status_enum type exists before trying to drop it
    const enumExistsResult = await queryRunner.query(
      `SELECT 1 FROM pg_type WHERE typname = 'users_status_enum' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')`,
    );

    if (enumExistsResult.length > 0) {
      await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    }
  }
}
