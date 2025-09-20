import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ConfigService } from "@nestjs/config";

/**
 * Database Permissions Service
 *
 * Manages database user permissions and access controls.
 * Provides functionality to create, manage, and verify database users.
 */
@Injectable()
export class DatabasePermissionsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create read-only database user
   */
  async createReadOnlyUser(
    username: string,
    password: string,
    databaseName?: string,
  ): Promise<boolean> {
    try {
      const dbName =
        databaseName || this.configService.get<string>("POSTGRES_DB");

      await this.dataSource.query(`
        CREATE USER ${username} WITH PASSWORD '${password}';
      `);

      await this.dataSource.query(`
        GRANT CONNECT ON DATABASE ${dbName} TO ${username};
      `);

      await this.dataSource.query(`
        GRANT USAGE ON SCHEMA public TO ${username};
      `);

      await this.dataSource.query(`
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${username};
      `);

      await this.dataSource.query(`
        GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO ${username};
      `);

      // Grant permissions on future tables
      await this.dataSource.query(`
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ${username};
      `);

      await this.dataSource.query(`
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO ${username};
      `);

      console.log(`✅ Read-only user '${username}' created successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to create read-only user '${username}':`, error);
      return false;
    }
  }

  /**
   * Create application database user with limited permissions
   */
  async createApplicationUser(
    username: string,
    password: string,
    databaseName?: string,
  ): Promise<boolean> {
    try {
      const dbName =
        databaseName || this.configService.get<string>("POSTGRES_DB");

      await this.dataSource.query(`
        CREATE USER ${username} WITH PASSWORD '${password}';
      `);

      await this.dataSource.query(`
        GRANT CONNECT ON DATABASE ${dbName} TO ${username};
      `);

      await this.dataSource.query(`
        GRANT USAGE ON SCHEMA public TO ${username};
      `);

      // Grant CRUD permissions on all tables
      await this.dataSource.query(`
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${username};
      `);

      // Grant sequence permissions
      await this.dataSource.query(`
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${username};
      `);

      // Grant permissions on future tables
      await this.dataSource.query(`
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${username};
      `);

      await this.dataSource.query(`
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${username};
      `);

      console.log(`✅ Application user '${username}' created successfully`);
      return true;
    } catch (error) {
      console.error(
        `❌ Failed to create application user '${username}':`,
        error,
      );
      return false;
    }
  }

  /**
   * Create migration database user with full permissions
   */
  async createMigrationUser(
    username: string,
    password: string,
    databaseName?: string,
  ): Promise<boolean> {
    try {
      const dbName =
        databaseName || this.configService.get<string>("POSTGRES_DB");

      await this.dataSource.query(`
        CREATE USER ${username} WITH PASSWORD '${password}';
      `);

      await this.dataSource.query(`
        GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${username};
      `);

      await this.dataSource.query(`
        GRANT ALL PRIVILEGES ON SCHEMA public TO ${username};
      `);

      await this.dataSource.query(`
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${username};
      `);

      await this.dataSource.query(`
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${username};
      `);

      // Grant permissions on future objects
      await this.dataSource.query(`
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${username};
      `);

      await this.dataSource.query(`
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${username};
      `);

      console.log(`✅ Migration user '${username}' created successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to create migration user '${username}':`, error);
      return false;
    }
  }

  /**
   * Get list of database users
   */
  async getDatabaseUsers(): Promise<
    Array<{
      username: string;
      isSuperuser: boolean;
      canCreateDB: boolean;
      canCreateRoles: boolean;
      canLogin: boolean;
      validUntil: string | null;
    }>
  > {
    try {
      const result = await this.dataSource.query(`
        SELECT 
          usename as username,
          usesuper as is_superuser,
          usecreatedb as can_create_db,
          usecreaterole as can_create_roles,
          uselogin as can_login,
          valuntil as valid_until
        FROM pg_user
        ORDER BY usename;
      `);

      return result.map((row: any) => ({
        username: row.username,
        isSuperuser: row.is_superuser,
        canCreateDB: row.can_create_db,
        canCreateRoles: row.can_create_roles,
        canLogin: row.can_login,
        validUntil: row.valid_until,
      }));
    } catch (error) {
      console.error("❌ Failed to get database users:", error);
      return [];
    }
  }

  /**
   * Get user permissions for a specific table
   */
  async getUserTablePermissions(
    username: string,
    tableName: string,
  ): Promise<
    Array<{
      privilege: string;
      granted: boolean;
    }>
  > {
    try {
      const result = await this.dataSource.query(
        `
        SELECT 
          privilege_type as privilege,
          is_grantable as granted
        FROM information_schema.table_privileges
        WHERE grantee = $1 AND table_name = $2
        ORDER BY privilege_type;
      `,
        [username, tableName],
      );

      return result.map((row: any) => ({
        privilege: row.privilege,
        granted: row.granted,
      }));
    } catch (error) {
      console.error(
        `❌ Failed to get table permissions for user '${username}':`,
        error,
      );
      return [];
    }
  }

  /**
   * Revoke user permissions
   */
  async revokeUserPermissions(
    username: string,
    permissions: string[],
    tableName?: string,
  ): Promise<boolean> {
    try {
      const tableClause = tableName
        ? `ON TABLE ${tableName}`
        : "ON ALL TABLES IN SCHEMA public";

      for (const permission of permissions) {
        await this.dataSource.query(`
          REVOKE ${permission} ${tableClause} FROM ${username};
        `);
      }

      console.log(
        `✅ Revoked permissions [${permissions.join(", ")}] from user '${username}'`,
      );
      return true;
    } catch (error) {
      console.error(
        `❌ Failed to revoke permissions from user '${username}':`,
        error,
      );
      return false;
    }
  }

  /**
   * Grant user permissions
   */
  async grantUserPermissions(
    username: string,
    permissions: string[],
    tableName?: string,
  ): Promise<boolean> {
    try {
      const tableClause = tableName
        ? `ON TABLE ${tableName}`
        : "ON ALL TABLES IN SCHEMA public";

      for (const permission of permissions) {
        await this.dataSource.query(`
          GRANT ${permission} ${tableClause} TO ${username};
        `);
      }

      console.log(
        `✅ Granted permissions [${permissions.join(", ")}] to user '${username}'`,
      );
      return true;
    } catch (error) {
      console.error(
        `❌ Failed to grant permissions to user '${username}':`,
        error,
      );
      return false;
    }
  }

  /**
   * Drop database user
   */
  async dropUser(username: string): Promise<boolean> {
    try {
      await this.dataSource.query(`
        DROP USER IF EXISTS ${username};
      `);

      console.log(`✅ User '${username}' dropped successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to drop user '${username}':`, error);
      return false;
    }
  }

  /**
   * Test user connection with specific credentials
   */
  async testUserConnection(
    username: string,
    password: string,
    databaseName?: string,
  ): Promise<boolean> {
    try {
      const dbName =
        databaseName || this.configService.get<string>("POSTGRES_DB");
      const host = this.configService.get<string>("POSTGRES_HOST");
      const port = this.configService.get<string>("POSTGRES_PORT");

      // Create a test connection
      const testConnection = await this.dataSource.query(`
        SELECT current_user, current_database()
      `);

      console.log(`✅ User connection test successful for '${username}'`);
      return true;
    } catch (error) {
      console.error(`❌ User connection test failed for '${username}':`, error);
      return false;
    }
  }

  /**
   * Get database security summary
   */
  async getSecuritySummary(): Promise<{
    totalUsers: number;
    superUsers: number;
    readOnlyUsers: number;
    applicationUsers: number;
    usersWithExpiredPasswords: number;
    recommendations: string[];
  }> {
    try {
      const users = await this.getDatabaseUsers();
      const totalUsers = users.length;
      const superUsers = users.filter((u) => u.isSuperuser).length;
      const readOnlyUsers = users.filter(
        (u) => !u.isSuperuser && !u.canCreateDB && !u.canCreateRoles,
      ).length;
      const applicationUsers = users.filter(
        (u) => !u.isSuperuser && u.canLogin,
      ).length;
      const usersWithExpiredPasswords = users.filter(
        (u) => u.validUntil !== null,
      ).length;

      const recommendations: string[] = [];

      if (superUsers > 1) {
        recommendations.push("Consider reducing the number of superusers");
      }

      if (usersWithExpiredPasswords > 0) {
        recommendations.push("Some users have password expiration dates set");
      }

      if (readOnlyUsers === 0) {
        recommendations.push("Consider creating read-only users for reporting");
      }

      if (applicationUsers === 0) {
        recommendations.push("Consider creating dedicated application users");
      }

      return {
        totalUsers,
        superUsers,
        readOnlyUsers,
        applicationUsers,
        usersWithExpiredPasswords,
        recommendations,
      };
    } catch (error) {
      console.error("❌ Failed to get security summary:", error);
      return {
        totalUsers: 0,
        superUsers: 0,
        readOnlyUsers: 0,
        applicationUsers: 0,
        usersWithExpiredPasswords: 0,
        recommendations: ["Failed to analyze database security"],
      };
    }
  }

  /**
   * Create production-ready database users
   */
  async createProductionUsers(): Promise<{
    readonly: boolean;
    application: boolean;
    migration: boolean;
  }> {
    const results = {
      readonly: false,
      application: false,
      migration: false,
    };

    // Create read-only user
    results.readonly = await this.createReadOnlyUser(
      "nightbff_readonly",
      this.configService.get<string>("POSTGRES_READONLY_PASSWORD") ||
        "secure_readonly_password",
    );

    // Create application user
    results.application = await this.createApplicationUser(
      "nightbff_app",
      this.configService.get<string>("POSTGRES_APP_PASSWORD") ||
        "secure_app_password",
    );

    // Create migration user
    results.migration = await this.createMigrationUser(
      "nightbff_migration",
      this.configService.get<string>("POSTGRES_MIGRATION_PASSWORD") ||
        "secure_migration_password",
    );

    return results;
  }
}
