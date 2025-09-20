import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Audit Log Entity
 * 
 * Tracks all database changes for security and compliance purposes.
 * This entity logs INSERT, UPDATE, and DELETE operations on sensitive tables.
 */
@Entity('audit_logs')
@Index(['tableName', 'operation'])
@Index(['userId', 'createdAt'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'table_name' })
  tableName: string;

  @Column({
    type: 'enum',
    enum: ['INSERT', 'UPDATE', 'DELETE'],
  })
  operation: 'INSERT' | 'UPDATE' | 'DELETE';

  @Column({ name: 'record_id', nullable: true })
  recordId?: string;

  @Column({ name: 'old_values', type: 'jsonb', nullable: true })
  oldValues?: any;

  @Column({ name: 'new_values', type: 'jsonb', nullable: true })
  newValues?: any;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent?: string;

  @Column({ name: 'request_id', nullable: true })
  requestId?: string;

  @Column({ name: 'session_id', nullable: true })
  sessionId?: string;

  @Column({ name: 'additional_metadata', type: 'jsonb', nullable: true })
  additionalMetadata?: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Get a summary of the audit log entry
   */
  getSummary(): string {
    return `${this.operation} on ${this.tableName}${this.recordId ? ` (ID: ${this.recordId})` : ''} by ${this.userId || 'system'}`;
  }

  /**
   * Check if this audit log contains sensitive data
   */
  hasSensitiveData(): boolean {
    const sensitiveFields = ['password', 'passwordHash', 'secret', 'token', 'key'];
    
    const checkObject = (obj: any): boolean => {
      if (!obj || typeof obj !== 'object') return false;
      
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          return true;
        }
        if (typeof value === 'object' && checkObject(value)) {
          return true;
        }
      }
      return false;
    };

    return checkObject(this.oldValues) || checkObject(this.newValues);
  }

  /**
   * Get sanitized values for logging (removes sensitive data)
   */
  getSanitizedValues(): { oldValues?: any; newValues?: any } {
    const sanitizeObject = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      
      const sanitized = { ...obj };
      const sensitiveFields = ['password', 'passwordHash', 'secret', 'token', 'key'];
      
      for (const key of Object.keys(sanitized)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object') {
          sanitized[key] = sanitizeObject(sanitized[key]);
        }
      }
      
      return sanitized;
    };

    return {
      oldValues: this.oldValues ? sanitizeObject(this.oldValues) : undefined,
      newValues: this.newValues ? sanitizeObject(this.newValues) : undefined,
    };
  }
}
