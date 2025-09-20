import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

/**
 * Audit Service
 * 
 * Handles database audit logging for security and compliance.
 * Logs all database changes with context information.
 */
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  /**
   * Log a database change
   */
  async logDatabaseChange(
    tableName: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    oldValues: any,
    newValues: any,
    context: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
      sessionId?: string;
      recordId?: string;
      additionalMetadata?: any;
    } = {},
  ): Promise<AuditLog> {
    try {
      const auditLog = this.auditRepository.create({
        tableName,
        operation,
        recordId: context.recordId,
        oldValues: operation === 'INSERT' ? null : oldValues,
        newValues: operation === 'DELETE' ? null : newValues,
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
        sessionId: context.sessionId,
        additionalMetadata: context.additionalMetadata,
      });

      const savedLog = await this.auditRepository.save(auditLog);
      
      // Log to console for development debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`📝 Audit Log: ${savedLog.getSummary()}`);
      }

      return savedLog;
    } catch (error) {
      console.error('❌ Failed to create audit log:', error);
      throw error;
    }
  }

  /**
   * Log user authentication events
   */
  async logAuthEvent(
    event: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PASSWORD_CHANGE' | 'ACCOUNT_LOCKED',
    userId: string,
    context: {
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
      sessionId?: string;
      additionalMetadata?: any;
    } = {},
  ): Promise<AuditLog> {
    return this.logDatabaseChange(
      'auth_events',
      'INSERT',
      null,
      {
        event,
        userId,
        timestamp: new Date().toISOString(),
        ...context.additionalMetadata,
      },
      {
        userId,
        ...context,
      },
    );
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    event: 'RATE_LIMIT_EXCEEDED' | 'SUSPICIOUS_ACTIVITY' | 'UNAUTHORIZED_ACCESS' | 'DATA_EXPORT',
    details: any,
    context: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
      sessionId?: string;
      additionalMetadata?: any;
    } = {},
  ): Promise<AuditLog> {
    return this.logDatabaseChange(
      'security_events',
      'INSERT',
      null,
      {
        event,
        details,
        timestamp: new Date().toISOString(),
        ...context.additionalMetadata,
      },
      context,
    );
  }

  /**
   * Get audit logs for a specific table
   */
  async getAuditLogsForTable(
    tableName: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { tableName },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get audit logs for a specific user
   */
  async getAuditLogsForUser(
    userId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get audit logs within a date range
   */
  async getAuditLogsInRange(
    startDate: Date,
    endDate: Date,
    limit: number = 1000,
    offset: number = 0,
  ): Promise<AuditLog[]> {
    return this.auditRepository
      .createQueryBuilder('audit_log')
      .where('audit_log.createdAt >= :startDate', { startDate })
      .andWhere('audit_log.createdAt <= :endDate', { endDate })
      .orderBy('audit_log.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getMany();
  }

  /**
   * Get audit logs with sensitive data
   */
  async getAuditLogsWithSensitiveData(
    limit: number = 100,
    offset: number = 0,
  ): Promise<AuditLog[]> {
    const logs = await this.auditRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return logs.filter(log => log.hasSensitiveData());
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalLogs: number;
    operationsByType: Record<string, number>;
    tablesByActivity: Record<string, number>;
    usersByActivity: Record<string, number>;
    sensitiveDataLogs: number;
  }> {
    const query = this.auditRepository.createQueryBuilder('audit_log');

    if (startDate) {
      query.andWhere('audit_log.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('audit_log.createdAt <= :endDate', { endDate });
    }

    const logs = await query.getMany();

    const operationsByType = logs.reduce((acc, log) => {
      acc[log.operation] = (acc[log.operation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tablesByActivity = logs.reduce((acc, log) => {
      acc[log.tableName] = (acc[log.tableName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const usersByActivity = logs.reduce((acc, log) => {
      const userId = log.userId || 'system';
      acc[userId] = (acc[userId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sensitiveDataLogs = logs.filter(log => log.hasSensitiveData()).length;

    return {
      totalLogs: logs.length,
      operationsByType,
      tablesByActivity,
      usersByActivity,
      sensitiveDataLogs,
    };
  }

  /**
   * Clean up old audit logs (for maintenance)
   */
  async cleanupOldAuditLogs(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.auditRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  /**
   * Export audit logs for compliance
   */
  async exportAuditLogs(
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json',
  ): Promise<string> {
    const logs = await this.getAuditLogsInRange(startDate, endDate, 10000, 0);

    if (format === 'csv') {
      const csvHeaders = [
        'ID',
        'Table Name',
        'Operation',
        'Record ID',
        'User ID',
        'IP Address',
        'User Agent',
        'Created At',
        'Summary',
      ];

      const csvRows = logs.map(log => [
        log.id,
        log.tableName,
        log.operation,
        log.recordId || '',
        log.userId || '',
        log.ipAddress || '',
        log.userAgent || '',
        log.createdAt.toISOString(),
        log.getSummary(),
      ]);

      return [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
    }

    return JSON.stringify(logs, null, 2);
  }
}
