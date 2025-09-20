import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DatabasePermissionsService } from './database-permissions.service';
import { DatabasePermissionsController } from './database-permissions.controller';

/**
 * Database Permissions Module
 * 
 * Provides comprehensive database user permission management including:
 * - User creation and management
 * - Permission granting and revoking
 * - Security analysis and recommendations
 * - Production user setup
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([]), // No entities needed for this service
  ],
  providers: [DatabasePermissionsService],
  controllers: [DatabasePermissionsController],
  exports: [DatabasePermissionsService],
})
export class DatabasePermissionsModule {}
