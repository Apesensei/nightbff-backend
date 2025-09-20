import { Module, Global } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { SupabaseProvider } from "./supabase.provider";

// Import User entity
import { User } from "../../microservices/auth/entities/user.entity";

// Import Event entities
import { Event } from "../../microservices/event/entities/event.entity";
import { EventAttendee } from "../../microservices/event/entities/event-attendee.entity";

// Import Interest entities
import { Interest } from "../../microservices/interest/entities/interest.entity";
import { UserInterest } from "../../microservices/interest/entities/user-interest.entity";
import { EventInterest } from "../../microservices/interest/entities/event-interest.entity";

// Import Chat entities
import { Chat } from "../../microservices/chat/entities/chat.entity";
import { Message } from "../../microservices/chat/entities/message.entity";

// Import Audit entities
import { AuditLog } from "./entities/audit-log.entity";

/**
 * Global DatabaseModule that centralizes entity registration.
 *
 * This module registers all entities with TypeORM once to avoid circular dependencies
 * between modules that share entities (e.g., Event and Interest modules).
 *
 * All modules that need access to repositories should import this module instead
 * of calling TypeOrmModule.forFeature() directly.
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      // Add User entity here
      User,
      // Event entities
      Event,
      EventAttendee,
      // Interest entities
      Interest,
      UserInterest,
      EventInterest,
      // Chat entities
      Chat,
      Message,
      // Audit entities
      AuditLog,
    ]),
  ],
  providers: [SupabaseProvider],
  exports: [SupabaseProvider, TypeOrmModule],
})
export class DatabaseModule {}
