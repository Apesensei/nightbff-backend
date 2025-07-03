import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from "typeorm";

export class AddUserProfileTable1744510698754 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure the uuid-ossp extension is enabled (idempotent)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    await queryRunner.createTable(
      new Table({
        name: "user_profiles",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "userId",
            type: "uuid",
            isUnique: true, // Add uniqueness constraint to userId
          },
          {
            name: "country",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "lastActiveAt",
            type: "timestamp with time zone", // Use TIMESTAMPTZ for consistency
            isNullable: true,
          },
          {
            name: "createdAt",
            type: "timestamp with time zone", // Use TIMESTAMPTZ
            default: "now()",
          },
          {
            name: "updatedAt",
            type: "timestamp with time zone", // Use TIMESTAMPTZ
            default: "now()",
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      "user_profiles",
      new TableForeignKey({
        columnNames: ["userId"],
        referencedColumnNames: ["id"],
        referencedTableName: "users", // Assumes the auth user table is named 'users'
        onDelete: "CASCADE",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("user_profiles");
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf("userId") !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey("user_profiles", foreignKey);
    }
    await queryRunner.dropTable("user_profiles");
  }
}
