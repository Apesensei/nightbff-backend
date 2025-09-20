import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { DatabasePermissionsService } from "./database-permissions.service";

describe("DatabasePermissionsService", () => {
  let service: DatabasePermissionsService;
  let dataSource: DataSource;
  let configService: ConfigService;

  const mockDataSource = {
    query: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabasePermissionsService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DatabasePermissionsService>(
      DatabasePermissionsService,
    );
    dataSource = module.get<DataSource>(DataSource);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createReadOnlyUser", () => {
    it("should create read-only user successfully", async () => {
      mockDataSource.query.mockResolvedValue([]);
      mockConfigService.get.mockReturnValue("nightbff_dev");

      const result = await service.createReadOnlyUser(
        "test_readonly",
        "password123",
      );

      expect(mockDataSource.query).toHaveBeenCalledWith(
        "\n        CREATE USER test_readonly WITH PASSWORD 'password123';\n      ",
      );
      expect(mockDataSource.query).toHaveBeenCalledWith(
        "\n        GRANT CONNECT ON DATABASE nightbff_dev TO test_readonly;\n      ",
      );
      expect(mockDataSource.query).toHaveBeenCalledWith(
        "\n        GRANT USAGE ON SCHEMA public TO test_readonly;\n      ",
      );
      expect(mockDataSource.query).toHaveBeenCalledWith(
        "\n        GRANT SELECT ON ALL TABLES IN SCHEMA public TO test_readonly;\n      ",
      );
      expect(mockDataSource.query).toHaveBeenCalledWith(
        "\n        GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO test_readonly;\n      ",
      );
      expect(result).toBe(true);
    });

    it("should handle errors when creating read-only user", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      mockDataSource.query.mockRejectedValue(new Error("User already exists"));
      mockConfigService.get.mockReturnValue("nightbff_dev");

      const result = await service.createReadOnlyUser(
        "test_readonly",
        "password123",
      );

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ Failed to create read-only user 'test_readonly':",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("createApplicationUser", () => {
    it("should create application user successfully", async () => {
      mockDataSource.query.mockResolvedValue([]);
      mockConfigService.get.mockReturnValue("nightbff_dev");

      const result = await service.createApplicationUser(
        "test_app",
        "password123",
      );

      expect(mockDataSource.query).toHaveBeenCalledWith(
        "\n        CREATE USER test_app WITH PASSWORD 'password123';\n      ",
      );
      expect(mockDataSource.query).toHaveBeenCalledWith(
        "\n        GRANT CONNECT ON DATABASE nightbff_dev TO test_app;\n      ",
      );
      expect(mockDataSource.query).toHaveBeenCalledWith(
        "\n        GRANT USAGE ON SCHEMA public TO test_app;\n      ",
      );
      expect(mockDataSource.query).toHaveBeenCalledWith(
        "\n        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO test_app;\n      ",
      );
      expect(mockDataSource.query).toHaveBeenCalledWith(
        "\n        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO test_app;\n      ",
      );
      expect(result).toBe(true);
    });
  });

  describe("createMigrationUser", () => {
    it("should create migration user successfully", async () => {
      mockDataSource.query.mockResolvedValue([]);
      mockConfigService.get.mockReturnValue("nightbff_dev");

      const result = await service.createMigrationUser(
        "test_migration",
        "password123",
      );

      expect(mockDataSource.query).toHaveBeenCalledWith(
        "\n        CREATE USER test_migration WITH PASSWORD 'password123';\n      ",
      );
      expect(mockDataSource.query).toHaveBeenCalledWith(
        "\n        GRANT ALL PRIVILEGES ON DATABASE nightbff_dev TO test_migration;\n      ",
      );
      expect(mockDataSource.query).toHaveBeenCalledWith(
        "\n        GRANT ALL PRIVILEGES ON SCHEMA public TO test_migration;\n      ",
      );
      expect(mockDataSource.query).toHaveBeenCalledWith(
        "\n        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO test_migration;\n      ",
      );
      expect(mockDataSource.query).toHaveBeenCalledWith(
        "\n        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO test_migration;\n      ",
      );
      expect(result).toBe(true);
    });
  });

  describe("getDatabaseUsers", () => {
    it("should return database users", async () => {
      const mockUsers = [
        {
          username: "postgres",
          is_superuser: true,
          can_create_db: true,
          can_create_roles: true,
          can_login: true,
          valid_until: null,
        },
        {
          username: "test_user",
          is_superuser: false,
          can_create_db: false,
          can_create_roles: false,
          can_login: true,
          valid_until: "2024-12-31",
        },
      ];

      mockDataSource.query.mockResolvedValue(mockUsers);

      const result = await service.getDatabaseUsers();

      expect(mockDataSource.query).toHaveBeenCalledWith(`
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

      expect(result).toEqual([
        {
          username: "postgres",
          isSuperuser: true,
          canCreateDB: true,
          canCreateRoles: true,
          canLogin: true,
          validUntil: null,
        },
        {
          username: "test_user",
          isSuperuser: false,
          canCreateDB: false,
          canCreateRoles: false,
          canLogin: true,
          validUntil: "2024-12-31",
        },
      ]);
    });

    it("should return empty array on error", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      mockDataSource.query.mockRejectedValue(new Error("Database error"));

      const result = await service.getDatabaseUsers();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ Failed to get database users:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("getUserTablePermissions", () => {
    it("should return user table permissions", async () => {
      const mockPermissions = [
        { privilege: "SELECT", granted: true },
        { privilege: "INSERT", granted: true },
        { privilege: "UPDATE", granted: false },
      ];

      mockDataSource.query.mockResolvedValue(mockPermissions);

      const result = await service.getUserTablePermissions(
        "test_user",
        "users",
      );

      expect(mockDataSource.query).toHaveBeenCalledWith(
        `
        SELECT 
          privilege_type as privilege,
          is_grantable as granted
        FROM information_schema.table_privileges
        WHERE grantee = $1 AND table_name = $2
        ORDER BY privilege_type;
      `,
        ["test_user", "users"],
      );

      expect(result).toEqual(mockPermissions);
    });
  });

  describe("revokeUserPermissions", () => {
    it("should revoke user permissions", async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.revokeUserPermissions(
        "test_user",
        ["SELECT", "INSERT"],
        "users",
      );

      expect(mockDataSource.query).toHaveBeenCalledWith(
        "\n          REVOKE SELECT ON TABLE users FROM test_user;\n        ",
      );
      expect(mockDataSource.query).toHaveBeenCalledWith(
        "\n          REVOKE INSERT ON TABLE users FROM test_user;\n        ",
      );
      expect(result).toBe(true);
    });

    it("should revoke permissions on all tables when no table specified", async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.revokeUserPermissions("test_user", [
        "SELECT",
        "INSERT",
      ]);

      expect(mockDataSource.query).toHaveBeenCalledWith(
        "\n          REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM test_user;\n        ",
      );
      expect(mockDataSource.query).toHaveBeenCalledWith(
        "\n          REVOKE INSERT ON ALL TABLES IN SCHEMA public FROM test_user;\n        ",
      );
      expect(result).toBe(true);
    });
  });

  describe("grantUserPermissions", () => {
    it("should grant user permissions", async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.grantUserPermissions(
        "test_user",
        ["SELECT", "INSERT"],
        "users",
      );

      expect(mockDataSource.query).toHaveBeenCalledWith(
        "\n          GRANT SELECT ON TABLE users TO test_user;\n        ",
      );
      expect(mockDataSource.query).toHaveBeenCalledWith(
        "\n          GRANT INSERT ON TABLE users TO test_user;\n        ",
      );
      expect(result).toBe(true);
    });
  });

  describe("dropUser", () => {
    it("should drop user successfully", async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.dropUser("test_user");

      expect(mockDataSource.query).toHaveBeenCalledWith(
        "\n        DROP USER IF EXISTS test_user;\n      ",
      );
      expect(result).toBe(true);
    });
  });

  describe("testUserConnection", () => {
    it("should test user connection successfully", async () => {
      mockDataSource.query.mockResolvedValue([{ current_user: "test_user" }]);
      mockConfigService.get.mockReturnValue("nightbff_dev");

      const result = await service.testUserConnection(
        "test_user",
        "password123",
      );

      expect(result).toBe(true);
    });

    it("should handle connection test failure", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      mockDataSource.query.mockRejectedValue(new Error("Connection failed"));

      const result = await service.testUserConnection(
        "test_user",
        "wrong_password",
      );

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ User connection test failed for 'test_user':",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("getSecuritySummary", () => {
    it("should return security summary", async () => {
      const mockUsers = [
        {
          username: "admin",
          isSuperuser: true,
          canCreateDB: true,
          canCreateRoles: true,
          canLogin: true,
          validUntil: null,
        },
        {
          username: "user1",
          isSuperuser: false,
          canCreateDB: false,
          canCreateRoles: false,
          canLogin: true,
          validUntil: null,
        },
        {
          username: "user2",
          isSuperuser: false,
          canCreateDB: false,
          canCreateRoles: false,
          canLogin: true,
          validUntil: "2024-12-31",
        },
      ];

      jest.spyOn(service, "getDatabaseUsers").mockResolvedValue(mockUsers);

      const result = await service.getSecuritySummary();

      expect(result).toEqual({
        totalUsers: 3,
        superUsers: 1,
        readOnlyUsers: 2,
        applicationUsers: 2,
        usersWithExpiredPasswords: 1,
        recommendations: expect.arrayContaining([
          "Some users have password expiration dates set",
        ]),
      });
    });

    it("should handle errors in security summary", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      jest
        .spyOn(service, "getDatabaseUsers")
        .mockRejectedValue(new Error("Database error"));

      const result = await service.getSecuritySummary();

      expect(result).toEqual({
        totalUsers: 0,
        superUsers: 0,
        readOnlyUsers: 0,
        applicationUsers: 0,
        usersWithExpiredPasswords: 0,
        recommendations: ["Failed to analyze database security"],
      });

      consoleSpy.mockRestore();
    });
  });

  describe("createProductionUsers", () => {
    it("should create all production users", async () => {
      jest.spyOn(service, "createReadOnlyUser").mockResolvedValue(true);
      jest.spyOn(service, "createApplicationUser").mockResolvedValue(true);
      jest.spyOn(service, "createMigrationUser").mockResolvedValue(true);

      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case "POSTGRES_READONLY_PASSWORD":
            return "readonly_pass";
          case "POSTGRES_APP_PASSWORD":
            return "app_pass";
          case "POSTGRES_MIGRATION_PASSWORD":
            return "migration_pass";
          default:
            return "default_pass";
        }
      });

      const result = await service.createProductionUsers();

      expect(service.createReadOnlyUser).toHaveBeenCalledWith(
        "nightbff_readonly",
        "readonly_pass",
      );
      expect(service.createApplicationUser).toHaveBeenCalledWith(
        "nightbff_app",
        "app_pass",
      );
      expect(service.createMigrationUser).toHaveBeenCalledWith(
        "nightbff_migration",
        "migration_pass",
      );

      expect(result).toEqual({
        readonly: true,
        application: true,
        migration: true,
      });
    });

    it("should handle partial failures in production user creation", async () => {
      jest.spyOn(service, "createReadOnlyUser").mockResolvedValue(true);
      jest.spyOn(service, "createApplicationUser").mockResolvedValue(false);
      jest.spyOn(service, "createMigrationUser").mockResolvedValue(true);

      mockConfigService.get.mockReturnValue("default_pass");

      const result = await service.createProductionUsers();

      expect(result).toEqual({
        readonly: true,
        application: false,
        migration: true,
      });
    });
  });
});
