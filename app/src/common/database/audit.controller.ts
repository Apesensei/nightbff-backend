import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  ParseEnumPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../microservices/auth/guards/jwt-auth.guard';

/**
 * Audit Controller
 * 
 * Provides endpoints for viewing and managing audit logs.
 * Requires authentication and appropriate permissions.
 */
@ApiTags('Audit Logs')
@Controller('api/audit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Get audit logs for a specific table
   */
  @Get('table/:tableName')
  @ApiOperation({
    summary: 'Get audit logs for a specific table',
    description: 'Retrieves audit logs for a specific database table with pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tableName: { type: 'string' },
          operation: { type: 'string', enum: ['INSERT', 'UPDATE', 'DELETE'] },
          recordId: { type: 'string' },
          userId: { type: 'string' },
          ipAddress: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          summary: { type: 'string' },
        },
      },
    },
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of records to return (default: 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of records to skip (default: 0)' })
  async getAuditLogsForTable(
    @Query('tableName') tableName: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.auditService.getAuditLogsForTable(tableName, limit, offset);
  }

  /**
   * Get audit logs for a specific user
   */
  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get audit logs for a specific user',
    description: 'Retrieves audit logs for a specific user with pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of records to return (default: 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of records to skip (default: 0)' })
  async getAuditLogsForUser(
    @Query('userId') userId: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.auditService.getAuditLogsForUser(userId, limit, offset);
  }

  /**
   * Get audit logs within a date range
   */
  @Get('range')
  @ApiOperation({
    summary: 'Get audit logs within a date range',
    description: 'Retrieves audit logs within a specified date range with pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
  })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'End date (ISO string)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of records to return (default: 1000)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of records to skip (default: 0)' })
  async getAuditLogsInRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit', new DefaultValuePipe(1000), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format. Use ISO string format.');
    }
    
    return this.auditService.getAuditLogsInRange(start, end, limit, offset);
  }

  /**
   * Get audit logs with sensitive data
   */
  @Get('sensitive')
  @ApiOperation({
    summary: 'Get audit logs containing sensitive data',
    description: 'Retrieves audit logs that contain sensitive information like passwords or tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs with sensitive data retrieved successfully',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of records to return (default: 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of records to skip (default: 0)' })
  async getAuditLogsWithSensitiveData(
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.auditService.getAuditLogsWithSensitiveData(limit, offset);
  }

  /**
   * Get audit statistics
   */
  @Get('statistics')
  @ApiOperation({
    summary: 'Get audit statistics',
    description: 'Retrieves comprehensive audit statistics including operation counts and activity summaries',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalLogs: { type: 'number' },
        operationsByType: {
          type: 'object',
          additionalProperties: { type: 'number' },
        },
        tablesByActivity: {
          type: 'object',
          additionalProperties: { type: 'number' },
        },
        usersByActivity: {
          type: 'object',
          additionalProperties: { type: 'number' },
        },
        sensitiveDataLogs: { type: 'number' },
      },
    },
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date for statistics (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date for statistics (ISO string)' })
  async getAuditStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    if (start && isNaN(start.getTime())) {
      throw new Error('Invalid startDate format. Use ISO string format.');
    }
    if (end && isNaN(end.getTime())) {
      throw new Error('Invalid endDate format. Use ISO string format.');
    }
    
    return this.auditService.getAuditStatistics(start, end);
  }

  /**
   * Export audit logs
   */
  @Get('export')
  @ApiOperation({
    summary: 'Export audit logs',
    description: 'Exports audit logs in JSON or CSV format for compliance purposes',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs exported successfully',
    content: {
      'application/json': {
        schema: { type: 'string' },
      },
      'text/csv': {
        schema: { type: 'string' },
      },
    },
  })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'Start date for export (ISO string)' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'End date for export (ISO string)' })
  @ApiQuery({ 
    name: 'format', 
    required: false, 
    enum: ['json', 'csv'], 
    description: 'Export format (default: json)' 
  })
  async exportAuditLogs(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format', new DefaultValuePipe('json'), new ParseEnumPipe(['json', 'csv'])) format: 'json' | 'csv',
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format. Use ISO string format.');
    }
    
    const data = await this.auditService.exportAuditLogs(start, end, format);
    
    return {
      data,
      format,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Clean up old audit logs
   */
  @Get('cleanup')
  @ApiOperation({
    summary: 'Clean up old audit logs',
    description: 'Removes audit logs older than specified number of days (maintenance operation)',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs cleaned up successfully',
    schema: {
      type: 'object',
      properties: {
        deletedCount: { type: 'number' },
        message: { type: 'string' },
      },
    },
  })
  @ApiQuery({ name: 'olderThanDays', required: false, type: Number, description: 'Delete logs older than this many days (default: 90)' })
  async cleanupOldAuditLogs(
    @Query('olderThanDays', new DefaultValuePipe(90), ParseIntPipe) olderThanDays: number,
  ) {
    const deletedCount = await this.auditService.cleanupOldAuditLogs(olderThanDays);
    
    return {
      deletedCount,
      message: `Deleted ${deletedCount} audit logs older than ${olderThanDays} days`,
    };
  }
}
