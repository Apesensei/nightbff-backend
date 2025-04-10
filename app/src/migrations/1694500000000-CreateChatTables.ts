import { MigrationInterface, QueryRunner } from "typeorm";
import { TableForeignKey } from "typeorm";

export class CreateChatTables1694500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create chat table
    await queryRunner.query(`
      CREATE TABLE "chat" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" varchar NOT NULL,
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
    await queryRunner.dropForeignKey(
      "chat_participants",
      "FK_chat_participants_user",
    );
    await queryRunner.dropForeignKey(
      "chat_participants",
      "FK_chat_participants_chat",
    );
    await queryRunner.dropForeignKey("message", "FK_message_chat");

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
  }
}
