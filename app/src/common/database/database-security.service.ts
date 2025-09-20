import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

/**
 * Database Security Service
 * 
 * Handles database security configuration, SSL verification,
 * and connection security monitoring.
 */
@Injectable()
export class DatabaseSecurityService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get enhanced SSL configuration for database connections
   */
  getSSLConfig() {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const sslEnabled = this.configService.get<string>('POSTGRES_SSL') === 'true';
    
    if (!isProduction && !sslEnabled) {
      return false;
    }

    if (isProduction || sslEnabled) {
      const sslMode = this.configService.get<string>('POSTGRES_SSLMODE') || 'require';
      const caCert = this.configService.get<string>('POSTGRES_CA_CERT');
      const clientCert = this.configService.get<string>('POSTGRES_CLIENT_CERT');
      const clientKey = this.configService.get<string>('POSTGRES_CLIENT_KEY');

      const sslConfig: any = {
        rejectUnauthorized: true, // Always validate certificates in production
        sslmode: sslMode,
      };

      // Add CA certificate if provided
      if (caCert) {
        sslConfig.ca = caCert;
      }

      // Add client certificates if provided
      if (clientCert) {
        sslConfig.cert = clientCert;
      }

      if (clientKey) {
        sslConfig.key = clientKey;
      }

      return sslConfig;
    }

    return false;
  }

  /**
   * Verify database connection encryption
   */
  async verifyConnectionEncryption(): Promise<boolean> {
    try {
      // Check if SSL is enabled and working
      const sslStatus = await this.dataSource.query(
        'SELECT ssl_is_used() as ssl_enabled, ssl_version() as ssl_version, ssl_cipher() as ssl_cipher'
      );
      
      const isSSLEnabled = sslStatus[0]?.ssl_enabled;
      
      if (!isSSLEnabled) {
        console.error('❌ Database connection is not encrypted');
        return false;
      }

      console.log('✅ Database connection is encrypted');
      console.log('📊 SSL Version:', sslStatus[0]?.ssl_version);
      console.log('🔐 SSL Cipher:', sslStatus[0]?.ssl_cipher);
      
      return true;
    } catch (error) {
      console.error('❌ Database encryption verification failed:', error);
      return false;
    }
  }

  /**
   * Get comprehensive connection security information
   */
  async getConnectionSecurityInfo() {
    try {
      const sslInfo = await this.dataSource.query(`
        SELECT 
          ssl_is_used() as ssl_enabled,
          ssl_version() as ssl_version,
          ssl_cipher() as ssl_cipher,
          current_database() as database_name,
          current_user as current_user,
          inet_server_addr() as server_address,
          inet_server_port() as server_port
      `);
      
      return {
        ssl: sslInfo[0],
        timestamp: new Date().toISOString(),
        environment: this.configService.get<string>('NODE_ENV'),
      };
    } catch (error) {
      console.error('❌ Failed to get connection security info:', error);
      return null;
    }
  }

  /**
   * Test database connection with enhanced security
   */
  async testSecureConnection(): Promise<boolean> {
    try {
      // Test basic connection
      await this.dataSource.query('SELECT 1');
      
      // Verify SSL encryption
      const isEncrypted = await this.verifyConnectionEncryption();
      
      if (!isEncrypted) {
        console.error('❌ Database connection security test failed - no encryption');
        return false;
      }

      console.log('✅ Database connection security test passed');
      return true;
    } catch (error) {
      console.error('❌ Database connection security test failed:', error);
      return false;
    }
  }

  /**
   * Log security configuration for debugging
   */
  logSecurityConfiguration() {
    const sslConfig = this.getSSLConfig();
    const environment = this.configService.get<string>('NODE_ENV');
    
    console.log('🔒 Database Security Configuration:');
    console.log(`   Environment: ${environment}`);
    console.log(`   SSL Enabled: ${sslConfig !== false}`);
    
    if (sslConfig && typeof sslConfig === 'object') {
      console.log(`   SSL Mode: ${sslConfig.sslmode || 'default'}`);
      console.log(`   Reject Unauthorized: ${sslConfig.rejectUnauthorized}`);
      console.log(`   CA Certificate: ${sslConfig.ca ? 'Provided' : 'Not provided'}`);
      console.log(`   Client Certificate: ${sslConfig.cert ? 'Provided' : 'Not provided'}`);
      console.log(`   Client Key: ${sslConfig.key ? 'Provided' : 'Not provided'}`);
    }
  }
}
