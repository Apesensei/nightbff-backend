import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditService } from "./audit.service";
import { AuditLog } from "./entities/audit-log.entity";

describe("AuditService", () => {
  let service: AuditService;
  let repository: Repository<AuditLog>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    repository = module.get<Repository<AuditLog>>(getRepositoryToken(AuditLog));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("logDatabaseChange", () => {
    it("should create and save an audit log for INSERT operation", async () => {
      const mockAuditLog = {
        id: "audit-123",
        tableName: "users",
        operation: "INSERT",
        newValues: { name: "John Doe", email: "john@example.com" },
        userId: "user-123",
        createdAt: new Date(),
      };

      mockRepository.create.mockReturnValue(mockAuditLog);
      mockRepository.save.mockResolvedValue(mockAuditLog);

      const result = await service.logDatabaseChange(
        "users",
        "INSERT",
        null,
        { name: "John Doe", email: "john@example.com" },
        { userId: "user-123" },
      );

      expect(mockRepository.create).toHaveBeenCalledWith({
        tableName: "users",
        operation: "INSERT",
        recordId: undefined,
        oldValues: null,
        newValues: { name: "John Doe", email: "john@example.com" },
        userId: "user-123",
        ipAddress: undefined,
        userAgent: undefined,
        requestId: undefined,
        sessionId: undefined,
        additionalMetadata: undefined,
      });

      expect(mockRepository.save).toHaveBeenCalledWith(mockAuditLog);
      expect(result).toEqual(mockAuditLog);
    });

    it("should create and save an audit log for UPDATE operation", async () => {
      const mockAuditLog = {
        id: "audit-456",
        tableName: "users",
        operation: "UPDATE",
        oldValues: { name: "John Doe" },
        newValues: { name: "Jane Doe" },
        userId: "user-123",
        createdAt: new Date(),
      };

      mockRepository.create.mockReturnValue(mockAuditLog);
      mockRepository.save.mockResolvedValue(mockAuditLog);

      const result = await service.logDatabaseChange(
        "users",
        "UPDATE",
        { name: "John Doe" },
        { name: "Jane Doe" },
        { userId: "user-123", recordId: "user-456" },
      );

      expect(mockRepository.create).toHaveBeenCalledWith({
        tableName: "users",
        operation: "UPDATE",
        recordId: "user-456",
        oldValues: { name: "John Doe" },
        newValues: { name: "Jane Doe" },
        userId: "user-123",
        ipAddress: undefined,
        userAgent: undefined,
        requestId: undefined,
        sessionId: undefined,
        additionalMetadata: undefined,
      });

      expect(result).toEqual(mockAuditLog);
    });

    it("should handle errors gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockRejectedValue(new Error("Database error"));

      await expect(
        service.logDatabaseChange("users", "INSERT", null, {}, {}),
      ).rejects.toThrow("Database error");

      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ Failed to create audit log:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("logAuthEvent", () => {
    it("should log authentication events", async () => {
      const mockAuditLog = {
        id: "audit-789",
        tableName: "auth_events",
        operation: "INSERT",
        newValues: {
          event: "LOGIN",
          userId: "user-123",
          timestamp: expect.any(String),
        },
        userId: "user-123",
        createdAt: new Date(),
      };

      mockRepository.create.mockReturnValue(mockAuditLog);
      mockRepository.save.mockResolvedValue(mockAuditLog);

      const result = await service.logAuthEvent("LOGIN", "user-123", {
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
      });

      expect(mockRepository.create).toHaveBeenCalledWith({
        tableName: "auth_events",
        operation: "INSERT",
        recordId: undefined,
        oldValues: null,
        newValues: {
          event: "LOGIN",
          userId: "user-123",
          timestamp: expect.any(String),
        },
        userId: "user-123",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        requestId: undefined,
        sessionId: undefined,
        additionalMetadata: undefined,
      });

      expect(result).toEqual(mockAuditLog);
    });
  });

  describe("logSecurityEvent", () => {
    it("should log security events", async () => {
      const mockAuditLog = {
        id: "audit-security-123",
        tableName: "security_events",
        operation: "INSERT",
        newValues: {
          event: "RATE_LIMIT_EXCEEDED",
          details: { ip: "192.168.1.1", endpoint: "/api/auth/signin" },
          timestamp: expect.any(String),
        },
        createdAt: new Date(),
      };

      mockRepository.create.mockReturnValue(mockAuditLog);
      mockRepository.save.mockResolvedValue(mockAuditLog);

      const result = await service.logSecurityEvent(
        "RATE_LIMIT_EXCEEDED",
        { ip: "192.168.1.1", endpoint: "/api/auth/signin" },
        { ipAddress: "192.168.1.1" },
      );

      expect(mockRepository.create).toHaveBeenCalledWith({
        tableName: "security_events",
        operation: "INSERT",
        recordId: undefined,
        oldValues: null,
        newValues: {
          event: "RATE_LIMIT_EXCEEDED",
          details: { ip: "192.168.1.1", endpoint: "/api/auth/signin" },
          timestamp: expect.any(String),
        },
        userId: undefined,
        ipAddress: "192.168.1.1",
        userAgent: undefined,
        requestId: undefined,
        sessionId: undefined,
        additionalMetadata: undefined,
      });

      expect(result).toEqual(mockAuditLog);
    });
  });

  describe("getAuditLogsForTable", () => {
    it("should retrieve audit logs for a specific table", async () => {
      const mockLogs = [
        { id: "1", tableName: "users", operation: "INSERT" },
        { id: "2", tableName: "users", operation: "UPDATE" },
      ];

      mockRepository.find.mockResolvedValue(mockLogs);

      const result = await service.getAuditLogsForTable("users", 10, 0);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { tableName: "users" },
        order: { createdAt: "DESC" },
        take: 10,
        skip: 0,
      });

      expect(result).toEqual(mockLogs);
    });
  });

  describe("getAuditLogsForUser", () => {
    it("should retrieve audit logs for a specific user", async () => {
      const mockLogs = [
        { id: "1", userId: "user-123", operation: "INSERT" },
        { id: "2", userId: "user-123", operation: "UPDATE" },
      ];

      mockRepository.find.mockResolvedValue(mockLogs);

      const result = await service.getAuditLogsForUser("user-123", 10, 0);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        order: { createdAt: "DESC" },
        take: 10,
        skip: 0,
      });

      expect(result).toEqual(mockLogs);
    });
  });

  describe("getAuditLogsInRange", () => {
    it("should retrieve audit logs within date range", async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      await service.getAuditLogsInRange(startDate, endDate, 100, 0);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith(
        "audit_log",
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "audit_log.createdAt >= :startDate",
        { startDate },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "audit_log.createdAt <= :endDate",
        { endDate },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        "audit_log.createdAt",
        "DESC",
      );
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(100);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(0);
    });
  });

  describe("getAuditStatistics", () => {
    it("should return audit statistics", async () => {
      const mockLogs = [
        {
          operation: "INSERT" as const,
          tableName: "users",
          userId: "user-1",
          hasSensitiveData: () => false,
        },
        {
          operation: "UPDATE" as const,
          tableName: "users",
          userId: "user-1",
          hasSensitiveData: () => false,
        },
        {
          operation: "DELETE",
          tableName: "events",
          userId: "user-2",
          hasSensitiveData: () => false,
        },
        {
          operation: "INSERT" as const,
          tableName: "events",
          userId: "user-2",
          hasSensitiveData: () => false,
        },
      ];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockLogs),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getAuditStatistics();

      expect(result).toEqual({
        totalLogs: 4,
        operationsByType: {
          INSERT: 2,
          UPDATE: 1,
          DELETE: 1,
        },
        tablesByActivity: {
          users: 2,
          events: 2,
        },
        usersByActivity: {
          "user-1": 2,
          "user-2": 2,
        },
        sensitiveDataLogs: 0,
      });
    });
  });

  describe("cleanupOldAuditLogs", () => {
    it("should clean up old audit logs", async () => {
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 50 }),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.cleanupOldAuditLogs(90);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "createdAt < :cutoffDate",
        expect.any(Object),
      );
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
      expect(result).toBe(50);
    });
  });

  describe("exportAuditLogs", () => {
    it("should export audit logs in JSON format", async () => {
      const mockLogs = [
        {
          id: "1",
          tableName: "users",
          operation: "INSERT" as const,
          createdAt: new Date("2024-01-01T10:00:00Z"),
          getSummary: () => "INSERT on users by system",
          hasSensitiveData: () => false,
          getSanitizedValues: () => ({
            oldValues: undefined,
            newValues: undefined,
          }),
        },
        {
          id: "2",
          tableName: "users",
          operation: "UPDATE" as const,
          createdAt: new Date("2024-01-01T11:00:00Z"),
          getSummary: () => "UPDATE on users by system",
          hasSensitiveData: () => false,
          getSanitizedValues: () => ({
            oldValues: undefined,
            newValues: undefined,
          }),
        },
      ];

      // Mock the getAuditLogsInRange method directly
      jest.spyOn(service, "getAuditLogsInRange").mockResolvedValue(mockLogs);

      const result = await service.exportAuditLogs(
        new Date("2024-01-01"),
        new Date("2024-01-31"),
        "json",
      );

      expect(typeof result).toBe("string");
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it("should export audit logs in CSV format", async () => {
      const mockLogs = [
        {
          id: "1",
          tableName: "users",
          operation: "INSERT" as const,
          recordId: "user-123",
          userId: "user-456",
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0",
          createdAt: new Date("2024-01-01T10:00:00Z"),
          getSummary: () => "INSERT on users (ID: user-123) by user-456",
          hasSensitiveData: () => false,
          getSanitizedValues: () => ({
            oldValues: undefined,
            newValues: undefined,
          }),
        },
      ];

      // Mock the getAuditLogsInRange method directly
      jest.spyOn(service, "getAuditLogsInRange").mockResolvedValue(mockLogs);

      const result = await service.exportAuditLogs(
        new Date("2024-01-01"),
        new Date("2024-01-31"),
        "csv",
      );

      expect(typeof result).toBe("string");
      expect(result).toContain('"ID","Table Name","Operation"');
      expect(result).toContain('"1","users","INSERT"');
    });
  });
});
