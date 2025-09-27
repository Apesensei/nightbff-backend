import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { DatabaseSecurityService } from "./database-security.service";

describe("DatabaseSecurityService", () => {
  let service: DatabaseSecurityService;
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
        DatabaseSecurityService,
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

    service = module.get<DatabaseSecurityService>(DatabaseSecurityService);
    dataSource = module.get<DataSource>(DataSource);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getSSLConfig", () => {
    it("should return false for development environment without SSL enabled", () => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case "NODE_ENV":
            return "development";
          case "POSTGRES_SSL":
            return "false";
          default:
            return undefined;
        }
      });

      const result = service.getSSLConfig();
      expect(result).toBe(false);
    });

    it("should return SSL config for production environment", () => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case "NODE_ENV":
            return "production";
          case "POSTGRES_SSL":
            return "true";
          case "POSTGRES_SSLMODE":
            return "require";
          case "POSTGRES_CA_CERT":
            return "ca-cert-content";
          case "POSTGRES_CLIENT_CERT":
            return "client-cert-content";
          case "POSTGRES_CLIENT_KEY":
            return "client-key-content";
          default:
            return undefined;
        }
      });

      const result = service.getSSLConfig();

      expect(result).toEqual({
        rejectUnauthorized: true,
        sslmode: "require",
        ca: "ca-cert-content",
        cert: "client-cert-content",
        key: "client-key-content",
      });
    });

    it("should return SSL config when SSL is explicitly enabled", () => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case "NODE_ENV":
            return "development";
          case "POSTGRES_SSL":
            return "true";
          case "POSTGRES_SSLMODE":
            return "prefer";
          default:
            return undefined;
        }
      });

      const result = service.getSSLConfig();

      expect(result).toEqual({
        rejectUnauthorized: true,
        sslmode: "prefer",
      });
    });
  });

  describe("verifyConnectionEncryption", () => {
    it("should return true when SSL is enabled", async () => {
      mockDataSource.query.mockResolvedValue([
        {
          ssl_enabled: true,
          ssl_version: "TLSv1.3",
          ssl_cipher: "TLS_AES_256_GCM_SHA384",
        },
      ]);

      const result = await service.verifyConnectionEncryption();

      expect(result).toBe(true);
      expect(mockDataSource.query).toHaveBeenCalledWith(
        "SELECT ssl_is_used() as ssl_enabled, ssl_version() as ssl_version, ssl_cipher() as ssl_cipher",
      );
    });

    it("should return false when SSL is not enabled", async () => {
      mockDataSource.query.mockResolvedValue([
        {
          ssl_enabled: false,
          ssl_version: null,
          ssl_cipher: null,
        },
      ]);

      const result = await service.verifyConnectionEncryption();

      expect(result).toBe(false);
    });

    it("should return false when query fails", async () => {
      mockDataSource.query.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result = await service.verifyConnectionEncryption();

      expect(result).toBe(false);
    });
  });

  describe("getConnectionSecurityInfo", () => {
    it("should return comprehensive security information", async () => {
      const mockSecurityInfo = {
        ssl_enabled: true,
        ssl_version: "TLSv1.3",
        ssl_cipher: "TLS_AES_256_GCM_SHA384",
        database_name: "nightbff_dev",
        current_user: "postgres",
        server_address: "127.0.0.1",
        server_port: 5432,
      };

      mockDataSource.query.mockResolvedValue([mockSecurityInfo]);
      mockConfigService.get.mockReturnValue("development");

      const result = await service.getConnectionSecurityInfo();

      expect(result).toEqual({
        ssl: mockSecurityInfo,
        timestamp: expect.any(String),
        environment: "development",
      });
    });

    it("should return null when query fails", async () => {
      mockDataSource.query.mockRejectedValue(
        new Error("Database query failed"),
      );

      const result = await service.getConnectionSecurityInfo();

      expect(result).toBeNull();
    });
  });

  describe("testSecureConnection", () => {
    it("should return true when connection and SSL are working", async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ result: 1 }]) // Basic connection test
        .mockResolvedValueOnce([{ ssl_enabled: true }]); // SSL verification

      const result = await service.testSecureConnection();

      expect(result).toBe(true);
      expect(mockDataSource.query).toHaveBeenCalledTimes(2);
    });

    it("should return false when basic connection fails", async () => {
      mockDataSource.query.mockRejectedValue(new Error("Connection failed"));

      const result = await service.testSecureConnection();

      expect(result).toBe(false);
    });

    it("should return false when SSL verification fails", async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ result: 1 }]) // Basic connection test
        .mockResolvedValueOnce([{ ssl_enabled: false }]); // SSL verification

      const result = await service.testSecureConnection();

      expect(result).toBe(false);
    });
  });

  describe("logSecurityConfiguration", () => {
    it("should log security configuration for development", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case "NODE_ENV":
            return "development";
          default:
            return undefined;
        }
      });

      service.logSecurityConfiguration();

      expect(consoleSpy).toHaveBeenCalledWith(
        "🔒 Database Security Configuration:",
      );
      expect(consoleSpy).toHaveBeenCalledWith("   Environment: development");
      expect(consoleSpy).toHaveBeenCalledWith("   SSL Enabled: false");

      consoleSpy.mockRestore();
    });

    it("should log detailed SSL configuration for production", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case "NODE_ENV":
            return "production";
          case "POSTGRES_SSL":
            return "true";
          case "POSTGRES_SSLMODE":
            return "require";
          case "POSTGRES_CA_CERT":
            return "ca-cert";
          case "POSTGRES_CLIENT_CERT":
            return "client-cert";
          case "POSTGRES_CLIENT_KEY":
            return "client-key";
          default:
            return undefined;
        }
      });

      service.logSecurityConfiguration();

      expect(consoleSpy).toHaveBeenCalledWith(
        "🔒 Database Security Configuration:",
      );
      expect(consoleSpy).toHaveBeenCalledWith("   Environment: production");
      expect(consoleSpy).toHaveBeenCalledWith("   SSL Enabled: true");
      expect(consoleSpy).toHaveBeenCalledWith("   SSL Mode: require");
      expect(consoleSpy).toHaveBeenCalledWith("   Reject Unauthorized: true");
      expect(consoleSpy).toHaveBeenCalledWith("   CA Certificate: Provided");
      expect(consoleSpy).toHaveBeenCalledWith(
        "   Client Certificate: Provided",
      );
      expect(consoleSpy).toHaveBeenCalledWith("   Client Key: Provided");

      consoleSpy.mockRestore();
    });
  });
});
