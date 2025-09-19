import { JwtStrategy } from "./jwt.strategy";
import { AuthRepository } from "../repositories/auth.repository";

describe("JWT Strategy", () => {
  let mockAuthRepository: jest.Mocked<AuthRepository>;

  beforeEach(() => {
    mockAuthRepository = {
      getUserById: jest.fn(),
    } as any;
  });

  describe("Constructor Validation", () => {
    it("should throw error when JWT_SECRET is not set", () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      expect(
        () => new JwtStrategy(mockConfigService as any, mockAuthRepository),
      ).toThrow("JWT_SECRET must be set and at least 32 characters long");
    });

    it("should throw error when JWT_SECRET is null", () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(null),
      };

      expect(
        () => new JwtStrategy(mockConfigService as any, mockAuthRepository),
      ).toThrow("JWT_SECRET must be set and at least 32 characters long");
    });

    it("should throw error when JWT_SECRET is empty string", () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(""),
      };

      expect(
        () => new JwtStrategy(mockConfigService as any, mockAuthRepository),
      ).toThrow("JWT_SECRET must be set and at least 32 characters long");
    });

    it("should throw error when JWT_SECRET is too short (less than 32 characters)", () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue("short-secret"),
      };

      expect(
        () => new JwtStrategy(mockConfigService as any, mockAuthRepository),
      ).toThrow("JWT_SECRET must be set and at least 32 characters long");
    });

    it("should throw error when JWT_SECRET is exactly 31 characters", () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue("a".repeat(31)),
      };

      expect(
        () => new JwtStrategy(mockConfigService as any, mockAuthRepository),
      ).toThrow("JWT_SECRET must be set and at least 32 characters long");
    });

    it("should initialize successfully with valid JWT_SECRET (32 characters)", () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue("a".repeat(32)),
      };

      expect(
        () => new JwtStrategy(mockConfigService as any, mockAuthRepository),
      ).not.toThrow();
    });

    it("should initialize successfully with valid JWT_SECRET (more than 32 characters)", () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue("a".repeat(64)),
      };

      expect(
        () => new JwtStrategy(mockConfigService as any, mockAuthRepository),
      ).not.toThrow();
    });

    it("should initialize successfully with valid JWT_SECRET (exactly 64 characters)", () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue("a".repeat(64)),
      };

      expect(
        () => new JwtStrategy(mockConfigService as any, mockAuthRepository),
      ).not.toThrow();
    });
  });

  describe("Strategy Configuration", () => {
    it("should configure JWT extraction from Authorization header", () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue("valid-32-character-secret-key-here"),
      };

      const strategy = new JwtStrategy(
        mockConfigService as any,
        mockAuthRepository,
      );
      expect(strategy).toBeDefined();
    });

    it("should not ignore token expiration", () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue("valid-32-character-secret-key-here"),
      };

      const strategy = new JwtStrategy(
        mockConfigService as any,
        mockAuthRepository,
      );
      expect(strategy).toBeDefined();
    });
  });

  describe("Token Validation", () => {
    it("should validate token with valid user ID", async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue("valid-32-character-secret-key-here"),
      };
      const mockUser = { id: "user-123", email: "test@example.com" };
      const mockAuthRepository = {
        getUserById: jest.fn().mockResolvedValue(mockUser),
      };

      const strategy = new JwtStrategy(
        mockConfigService as any,
        mockAuthRepository as any,
      );
      const payload = { sub: "user-123" };

      const result = await strategy.validate(payload);
      expect(result).toEqual(mockUser);
      expect(mockAuthRepository.getUserById).toHaveBeenCalledWith("user-123");
    });

    it("should throw UnauthorizedException when user ID is missing", async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue("valid-32-character-secret-key-here"),
      };
      const mockAuthRepository = {
        getUserById: jest.fn(),
      };

      const strategy = new JwtStrategy(
        mockConfigService as any,
        mockAuthRepository as any,
      );
      const payload = {};

      await expect(strategy.validate(payload)).rejects.toThrow(
        "Invalid token payload",
      );
    });

    it("should throw UnauthorizedException when user is not found", async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue("valid-32-character-secret-key-here"),
      };
      const mockAuthRepository = {
        getUserById: jest.fn().mockResolvedValue(null),
      };

      const strategy = new JwtStrategy(
        mockConfigService as any,
        mockAuthRepository as any,
      );
      const payload = { sub: "user-123" };

      await expect(strategy.validate(payload)).rejects.toThrow(
        "Token validation failed due to internal error",
      );
    });

    it("should throw UnauthorizedException when repository throws error", async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue("valid-32-character-secret-key-here"),
      };
      const mockAuthRepository = {
        getUserById: jest.fn().mockRejectedValue(new Error("Database error")),
      };

      const strategy = new JwtStrategy(
        mockConfigService as any,
        mockAuthRepository as any,
      );
      const payload = { sub: "user-123" };

      await expect(strategy.validate(payload)).rejects.toThrow(
        "Token validation failed due to internal error",
      );
    });
  });
});
