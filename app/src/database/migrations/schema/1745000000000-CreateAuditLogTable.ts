import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateAuditLogTable1745000000000 implements MigrationInterface {
  name = 'CreateAuditLogTable1745000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'table_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'operation',
            type: 'enum',
            enum: ['INSERT', 'UPDATE', 'DELETE'],
            isNullable: false,
          },
          {
            name: 'record_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'old_values',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'new_values',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45', // IPv6 max length
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'request_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'session_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'additional_metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create indexes for better query performance
    await queryRunner.createIndex(
      'audit_logs',
      new Index('IDX_audit_logs_table_operation', ['table_name', 'operation']),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new Index('IDX_audit_logs_user_created', ['user_id', 'created_at']),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new Index('IDX_audit_logs_created_at', ['created_at']),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new Index('IDX_audit_logs_record_id', ['record_id']),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new Index('IDX_audit_logs_ip_address', ['ip_address']),
    );

    // Create a partial index for sensitive data logs
    await queryRunner.query(`
      CREATE INDEX IDX_audit_logs_sensitive_data 
      ON audit_logs USING GIN ((old_values || new_values))
      WHERE (old_values || new_values)::text ~* '(password|secret|token|key)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_table_operation');
    await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_user_created');
    await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_created_at');
    await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_record_id');
    await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_ip_address');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_audit_logs_sensitive_data');

    // Drop the table
    await queryRunner.dropTable('audit_logs');
  }
}
