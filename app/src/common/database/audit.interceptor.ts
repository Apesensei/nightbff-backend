import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AuditService } from './audit.service';

/**
 * Audit Interceptor
 * 
 * Automatically logs database changes and security events.
 * Can be applied globally or to specific controllers/methods.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    // Get context information
    const contextInfo = this.extractContextInfo(request);
    
    // Check if auditing is disabled for this endpoint
    const skipAudit = this.reflector.get<boolean>('skipAudit', context.getHandler());
    if (skipAudit) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (data) => {
        try {
          // Log the request/response for audit purposes
          await this.logRequestAudit(request, response, data, contextInfo);
        } catch (error) {
          console.error('❌ Audit logging failed:', error);
          // Don't throw error to avoid breaking the main request
        }
      }),
    );
  }

  /**
   * Extract context information from request
   */
  private extractContextInfo(request: any) {
    return {
      userId: request.user?.id || request.user?.userId,
      ipAddress: request.ip || request.connection?.remoteAddress,
      userAgent: request.get('User-Agent'),
      requestId: request.id || request.headers['x-request-id'],
      sessionId: request.sessionID,
      method: request.method,
      url: request.url,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Log request audit information
   */
  private async logRequestAudit(
    request: any,
    response: any,
    data: any,
    contextInfo: any,
  ) {
    const { method, url, userId } = contextInfo;
    
    // Skip logging for health checks and static files
    if (url.includes('/health') || url.includes('/uploads/')) {
      return;
    }

    // Determine the table name from the URL
    const tableName = this.extractTableNameFromUrl(url);
    if (!tableName) {
      return;
    }

    // Determine operation type
    const operation = this.determineOperation(method, data);
    if (!operation) {
      return;
    }

    // Extract record ID if available
    const recordId = this.extractRecordId(request, data);

    // Log the audit event
    await this.auditService.logDatabaseChange(
      tableName,
      operation,
      null, // oldValues - would need to be captured before the operation
      data, // newValues
      {
        ...contextInfo,
        recordId,
        additionalMetadata: {
          method,
          url,
          statusCode: response.statusCode,
          responseTime: Date.now() - request.startTime,
        },
      },
    );
  }

  /**
   * Extract table name from URL
   */
  private extractTableNameFromUrl(url: string): string | null {
    // Map API endpoints to database table names
    const urlToTableMap: Record<string, string> = {
      '/api/users': 'users',
      '/api/auth': 'users', // Auth operations affect users table
      '/api/events': 'events',
      '/api/venues': 'venues',
      '/api/chats': 'chats',
      '/api/messages': 'messages',
      '/api/interests': 'interests',
      '/api/plans': 'plans',
    };

    for (const [urlPattern, tableName] of Object.entries(urlToTableMap)) {
      if (url.startsWith(urlPattern)) {
        return tableName;
      }
    }

    return null;
  }

  /**
   * Determine operation type from HTTP method and response
   */
  private determineOperation(method: string, data: any): 'INSERT' | 'UPDATE' | 'DELETE' | null {
    switch (method) {
      case 'POST':
        return 'INSERT';
      case 'PUT':
      case 'PATCH':
        return 'UPDATE';
      case 'DELETE':
        return 'DELETE';
      default:
        return null;
    }
  }

  /**
   * Extract record ID from request or response data
   */
  private extractRecordId(request: any, data: any): string | undefined {
    // Try to get ID from URL parameters
    if (request.params?.id) {
      return request.params.id;
    }

    // Try to get ID from response data
    if (data?.id) {
      return data.id;
    }

    // Try to get ID from nested response data
    if (data?.data?.id) {
      return data.data.id;
    }

    return undefined;
  }
}

/**
 * Decorator to skip audit logging for specific methods
 */
export const SkipAudit = () => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('skipAudit', true, descriptor.value);
    return descriptor;
  };
};
