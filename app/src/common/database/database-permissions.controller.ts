import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { DatabasePermissionsService } from './database-permissions.service';
import { JwtAuthGuard } from '../../microservices/auth/guards/jwt-auth.guard';

/**
 * Database Permissions Controller
 * 
 * Provides endpoints for managing database user permissions and access controls.
 * Requires authentication and appropriate admin permissions.
 */
@ApiTags('Database Permissions')
@Controller('api/database/permissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DatabasePermissionsController {
  constructor(
    private readonly permissionsService: DatabasePermissionsService,
  ) {}

  /**
   * Get all database users
   */
  @Get('users')
  @ApiOperation({
    summary: 'Get all database users',
    description: 'Retrieves a list of all database users with their permissions and status',
  })
  @ApiResponse({
    status: 200,
    description: 'Database users retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          username: { type: 'string' },
          isSuperuser: { type: 'boolean' },
          canCreateDB: { type: 'boolean' },
          canCreateRoles: { type: 'boolean' },
          canLogin: { type: 'boolean' },
          validUntil: { type: 'string', nullable: true },
        },
      },
    },
  })
  async getDatabaseUsers() {
    return this.permissionsService.getDatabaseUsers();
  }

  /**
   * Get user permissions for a specific table
   */
  @Get('users/:username/table/:tableName')
  @ApiOperation({
    summary: 'Get user table permissions',
    description: 'Retrieves specific permissions for a user on a particular table',
  })
  @ApiResponse({
    status: 200,
    description: 'User table permissions retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          privilege: { type: 'string' },
          granted: { type: 'boolean' },
        },
      },
    },
  })
  async getUserTablePermissions(
    @Param('username') username: string,
    @Param('tableName') tableName: string,
  ) {
    return this.permissionsService.getUserTablePermissions(username, tableName);
  }

  /**
   * Get database security summary
   */
  @Get('security-summary')
  @ApiOperation({
    summary: 'Get database security summary',
    description: 'Retrieves a comprehensive security summary including user counts and recommendations',
  })
  @ApiResponse({
    status: 200,
    description: 'Security summary retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalUsers: { type: 'number' },
        superUsers: { type: 'number' },
        readOnlyUsers: { type: 'number' },
        applicationUsers: { type: 'number' },
        usersWithExpiredPasswords: { type: 'number' },
        recommendations: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  async getSecuritySummary() {
    return this.permissionsService.getSecuritySummary();
  }

  /**
   * Create read-only user
   */
  @Post('users/readonly')
  @ApiOperation({
    summary: 'Create read-only database user',
    description: 'Creates a new database user with read-only permissions',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        password: { type: 'string' },
        databaseName: { type: 'string' },
      },
      required: ['username', 'password'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Read-only user created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async createReadOnlyUser(
    @Body() body: { username: string; password: string; databaseName?: string },
  ) {
    const success = await this.permissionsService.createReadOnlyUser(
      body.username,
      body.password,
      body.databaseName,
    );

    return {
      success,
      message: success 
        ? `Read-only user '${body.username}' created successfully`
        : `Failed to create read-only user '${body.username}'`,
    };
  }

  /**
   * Create application user
   */
  @Post('users/application')
  @ApiOperation({
    summary: 'Create application database user',
    description: 'Creates a new database user with application-level permissions (CRUD)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        password: { type: 'string' },
        databaseName: { type: 'string' },
      },
      required: ['username', 'password'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Application user created successfully',
  })
  async createApplicationUser(
    @Body() body: { username: string; password: string; databaseName?: string },
  ) {
    const success = await this.permissionsService.createApplicationUser(
      body.username,
      body.password,
      body.databaseName,
    );

    return {
      success,
      message: success 
        ? `Application user '${body.username}' created successfully`
        : `Failed to create application user '${body.username}'`,
    };
  }

  /**
   * Create migration user
   */
  @Post('users/migration')
  @ApiOperation({
    summary: 'Create migration database user',
    description: 'Creates a new database user with full permissions for running migrations',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        password: { type: 'string' },
        databaseName: { type: 'string' },
      },
      required: ['username', 'password'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Migration user created successfully',
  })
  async createMigrationUser(
    @Body() body: { username: string; password: string; databaseName?: string },
  ) {
    const success = await this.permissionsService.createMigrationUser(
      body.username,
      body.password,
      body.databaseName,
    );

    return {
      success,
      message: success 
        ? `Migration user '${body.username}' created successfully`
        : `Failed to create migration user '${body.username}'`,
    };
  }

  /**
   * Create production users
   */
  @Post('users/production')
  @ApiOperation({
    summary: 'Create production database users',
    description: 'Creates all necessary production database users (readonly, application, migration)',
  })
  @ApiResponse({
    status: 201,
    description: 'Production users created successfully',
    schema: {
      type: 'object',
      properties: {
        readonly: { type: 'boolean' },
        application: { type: 'boolean' },
        migration: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async createProductionUsers() {
    const results = await this.permissionsService.createProductionUsers();
    
    const allSuccessful = Object.values(results).every(Boolean);
    
    return {
      ...results,
      message: allSuccessful 
        ? 'All production users created successfully'
        : 'Some production users failed to create',
    };
  }

  /**
   * Grant permissions to user
   */
  @Post('users/:username/grant')
  @ApiOperation({
    summary: 'Grant permissions to user',
    description: 'Grants specific permissions to a database user',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        permissions: {
          type: 'array',
          items: { type: 'string' },
        },
        tableName: { type: 'string' },
      },
      required: ['permissions'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions granted successfully',
  })
  async grantUserPermissions(
    @Param('username') username: string,
    @Body() body: { permissions: string[]; tableName?: string },
  ) {
    const success = await this.permissionsService.grantUserPermissions(
      username,
      body.permissions,
      body.tableName,
    );

    return {
      success,
      message: success 
        ? `Permissions granted to user '${username}'`
        : `Failed to grant permissions to user '${username}'`,
    };
  }

  /**
   * Revoke permissions from user
   */
  @Post('users/:username/revoke')
  @ApiOperation({
    summary: 'Revoke permissions from user',
    description: 'Revokes specific permissions from a database user',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        permissions: {
          type: 'array',
          items: { type: 'string' },
        },
        tableName: { type: 'string' },
      },
      required: ['permissions'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions revoked successfully',
  })
  async revokeUserPermissions(
    @Param('username') username: string,
    @Body() body: { permissions: string[]; tableName?: string },
  ) {
    const success = await this.permissionsService.revokeUserPermissions(
      username,
      body.permissions,
      body.tableName,
    );

    return {
      success,
      message: success 
        ? `Permissions revoked from user '${username}'`
        : `Failed to revoke permissions from user '${username}'`,
    };
  }

  /**
   * Test user connection
   */
  @Post('users/:username/test-connection')
  @ApiOperation({
    summary: 'Test user connection',
    description: 'Tests database connection for a specific user',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        password: { type: 'string' },
        databaseName: { type: 'string' },
      },
      required: ['password'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Connection test completed',
  })
  async testUserConnection(
    @Param('username') username: string,
    @Body() body: { password: string; databaseName?: string },
  ) {
    const success = await this.permissionsService.testUserConnection(
      username,
      body.password,
      body.databaseName,
    );

    return {
      success,
      message: success 
        ? `Connection test successful for user '${username}'`
        : `Connection test failed for user '${username}'`,
    };
  }

  /**
   * Drop database user
   */
  @Delete('users/:username')
  @ApiOperation({
    summary: 'Drop database user',
    description: 'Removes a database user and all associated permissions',
  })
  @ApiResponse({
    status: 200,
    description: 'User dropped successfully',
  })
  async dropUser(@Param('username') username: string) {
    const success = await this.permissionsService.dropUser(username);

    return {
      success,
      message: success 
        ? `User '${username}' dropped successfully`
        : `Failed to drop user '${username}'`,
    };
  }
}
