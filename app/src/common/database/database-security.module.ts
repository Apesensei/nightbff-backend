import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { DatabaseSecurityService } from "./database-security.service";

/**
 * Database Security Module
 *
 * Provides database security services including SSL configuration,
 * connection verification, and security monitoring.
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([]), // No entities needed for this service
  ],
  providers: [DatabaseSecurityService],
  exports: [DatabaseSecurityService],
})
export class DatabaseSecurityModule {}
