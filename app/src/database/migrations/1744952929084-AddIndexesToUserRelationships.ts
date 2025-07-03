import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIndexesToUserRelationships1744952929084
  implements MigrationInterface
{
  name = "AddIndexesToUserRelationships1744952929084";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_dc17799b05c76e9a48bb4110c7" ON "user_profiles" ("lastActiveAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_97f30b3aff64d5025519a8f4b2" ON "user_relationships" ("recipient_id", "type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_be33b66b7f9e91e1d3dbe2f2e0" ON "user_relationships" ("requester_id", "type") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_be33b66b7f9e91e1d3dbe2f2e0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97f30b3aff64d5025519a8f4b2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dc17799b05c76e9a48bb4110c7"`,
    );
  }
}
