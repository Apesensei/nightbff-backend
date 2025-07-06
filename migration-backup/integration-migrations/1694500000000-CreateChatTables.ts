import { MigrationInterface, QueryRunner, TableForeignKey } from "typeorm";

export class CreateChatTables1694500000000 implements MigrationInterface {
  public readonly name = "CreateChatTables1694500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Explicitly create chat_type_enum if it doesn't exist
    const chatTypeEnumExists = await queryRunner.query(
      `SELECT 1 FROM pg_type WHERE typname = 'chat_type_enum' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')`,
    );
    if (chatTypeEnumExists.length === 0) {
      await queryRunner.query(
        `CREATE TYPE "public"."chat_type_enum" AS ENUM('DIRECT', 'GROUP', 'EVENT')`,
      );
    }

    // Explicitly create chat_participants_role_enum if it doesn't exist
    const chatParticipantRoleEnumExists = await queryRunner.query(
      `SELECT 1 FROM pg_type WHERE typname = 'chat_participants_role_enum' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')`,
    );
    if (chatParticipantRoleEnumExists.length === 0) {
      await queryRunner.query(
        `CREATE TYPE "public"."chat_participants_role_enum" AS ENUM('MEMBER', 'ADMIN', 'OWNER')`,
      );
    }

    // Create chat table
    await queryRunner.query(`
      CREATE TABLE "chat" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "public"."chat_type_enum" NOT NULL DEFAULT 'DIRECT',
        "title" varchar,
        "imageUrl" varchar,
        "creatorId" uuid,
        "eventId" uuid,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "lastActivityAt" TIMESTAMP,
        CONSTRAINT "PK_chat" PRIMARY KEY ("id")
      )
    `);

    // Create message table
    await queryRunner.query(`
      CREATE TABLE "message" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "chatId" uuid NOT NULL,
        "senderId" uuid NOT NULL,
        "type" varchar NOT NULL,
        "content" text,
        "mediaUrl" varchar,
        "locationLatitude" float,
        "locationLongitude" float,
        "status" varchar NOT NULL DEFAULT 'SENT',
        "isEdited" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_message" PRIMARY KEY ("id")
      )
    `);

    // Create chat_participants table (many-to-many join table)
    await queryRunner.query(`
      CREATE TABLE "chat_participants" (
        "chatId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "role" "public"."chat_participants_role_enum" NOT NULL DEFAULT 'MEMBER',
        CONSTRAINT "PK_chat_participants" PRIMARY KEY ("chatId", "userId")
      )
    `);

    // Add foreign key constraints
    await queryRunner.createForeignKey(
      "message",
      new TableForeignKey({
        columnNames: ["chatId"],
        referencedColumnNames: ["id"],
        referencedTableName: "chat",
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "chat_participants",
      new TableForeignKey({
        columnNames: ["chatId"],
        referencedColumnNames: ["id"],
        referencedTableName: "chat",
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "chat_participants",
      new TableForeignKey({
        columnNames: ["userId"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "CASCADE",
      }),
    );

    // Add indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_message_chatId" ON "message" ("chatId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_message_senderId" ON "message" ("senderId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_message_status" ON "message" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_message_createdAt" ON "message" ("createdAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_chat_type" ON "chat" ("type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_chat_creatorId" ON "chat" ("creatorId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_chat_eventId" ON "chat" ("eventId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_chat_lastActivityAt" ON "chat" ("lastActivityAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_chat_participants_userId" ON "chat_participants" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const fksToDrop = [
      { table: "chat_participants", constraint: "FK_chat_participants_userId" },
      { table: "chat_participants", constraint: "FK_chat_participants_chatId" },
      { table: "message", constraint: "FK_messages_senderId" },
      { table: "message", constraint: "FK_messages_chatId" },
    ];

    for (const fk of fksToDrop) {
      try {
        const constraintExists = await queryRunner.query(`
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_name = '${fk.table}' AND constraint_name = '${fk.constraint}' AND constraint_type = 'FOREIGN KEY'
            `);
        if (constraintExists.length > 0) {
          await queryRunner.dropForeignKey(fk.table, fk.constraint);
        }
      } catch (error) {
        console.warn(
          `Warning: Could not drop foreign key ${fk.constraint} on table ${fk.table}. It might not exist or name is different. Error: ${error.message}`,
        );
      }
    }

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_message_chatId"`);
    await queryRunner.query(`DROP INDEX "IDX_message_senderId"`);
    await queryRunner.query(`DROP INDEX "IDX_message_status"`);
    await queryRunner.query(`DROP INDEX "IDX_message_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_chat_type"`);
    await queryRunner.query(`DROP INDEX "IDX_chat_creatorId"`);
    await queryRunner.query(`DROP INDEX "IDX_chat_eventId"`);
    await queryRunner.query(`DROP INDEX "IDX_chat_lastActivityAt"`);
    await queryRunner.query(`DROP INDEX "IDX_chat_participants_userId"`);

    // Drop tables
    await queryRunner.dropTable("chat_participants");
    await queryRunner.dropTable("message");
    await queryRunner.dropTable("chat");

    // Explicitly drop chat_type_enum if it exists
    const chatTypeEnumExists = await queryRunner.query(
      `SELECT 1 FROM pg_type WHERE typname = 'chat_type_enum' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')`,
    );
    if (chatTypeEnumExists.length > 0) {
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."chat_type_enum"`);
    }

    // Explicitly drop chat_participants_role_enum if it exists
    const chatParticipantRoleEnumExists = await queryRunner.query(
      `SELECT 1 FROM pg_type WHERE typname = 'chat_participants_role_enum' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')`,
    );
    if (chatParticipantRoleEnumExists.length > 0) {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."chat_participants_role_enum"`,
      );
    }
  }
}
