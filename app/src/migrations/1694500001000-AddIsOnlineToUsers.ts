import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsOnlineToUsers1694500001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the column exists before adding it
    const tableColumns = await queryRunner.getTable("users");
    const isOnlineColumnExists = tableColumns?.findColumnByName("is_online");

    if (!isOnlineColumnExists) {
      await queryRunner.query(`
        ALTER TABLE "users" 
        ADD COLUMN "is_online" boolean NOT NULL DEFAULT false
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN "is_online"
    `);
  }
}
