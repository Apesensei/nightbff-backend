import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "../src/microservices/auth/auth.module";
import { DatabaseModule } from "../src/common/database/database.module";
import { envSchema } from "../src/config/env.schema";

describe("JWT Security Integration", () => {
  let module: TestingModule;

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe("JWT_SECRET Validation", () => {
    it("should fail to start without JWT_SECRET", async () => {
      // Clear JWT_SECRET from environment
      delete process.env.JWT_SECRET;

      await expect(async () => {
        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              validate: () => envSchema.parse(process.env),
            }),
            DatabaseModule,
            AuthModule,
          ],
        }).compile();
      }).rejects.toThrow();
    });

    it("should fail to start with short JWT_SECRET", async () => {
      // Set short JWT_SECRET
      process.env.JWT_SECRET = "short";

      await expect(async () => {
        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              validate: () => envSchema.parse(process.env),
            }),
            DatabaseModule,
            AuthModule,
          ],
        }).compile();
      }).rejects.toThrow();
    });

    it("should fail to start with JWT_SECRET shorter than 32 characters", async () => {
      // Set JWT_SECRET with 31 characters
      process.env.JWT_SECRET = "a".repeat(31);

      await expect(async () => {
        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              validate: () => envSchema.parse(process.env),
            }),
            DatabaseModule,
            AuthModule,
          ],
        }).compile();
      }).rejects.toThrow();
    });

    it("should start successfully with valid JWT_SECRET (32 characters)", async () => {
      // Set valid JWT_SECRET
      process.env.JWT_SECRET = "a".repeat(32);

      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            validate: () => envSchema.parse(process.env),
          }),
          AuthModule,
        ],
        providers: [
          {
            provide: "DbStatsService",
            useValue: {
              getStats: jest
                .fn()
                .mockResolvedValue({ total: 0, active: 0, idle: 0 }),
            },
          },
        ],
      }).compile();

      expect(module).toBeDefined();
    });

    it("should start successfully with valid JWT_SECRET (64 characters)", async () => {
      // Set valid JWT_SECRET
      process.env.JWT_SECRET = "a".repeat(64);

      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            validate: () => envSchema.parse(process.env),
          }),
          AuthModule,
        ],
        providers: [
          {
            provide: "DbStatsService",
            useValue: {
              getStats: jest
                .fn()
                .mockResolvedValue({ total: 0, active: 0, idle: 0 }),
            },
          },
        ],
      }).compile();

      expect(module).toBeDefined();
    });
  });

  describe("Environment Schema Validation", () => {
    it("should validate JWT_SECRET as required field", () => {
      const envWithoutJWT = {
        POSTGRES_HOST: "localhost",
        POSTGRES_PORT: "5432",
        POSTGRES_USER: "test",
        POSTGRES_PASSWORD: "test",
        POSTGRES_DB: "test",
      };

      expect(() => envSchema.parse(envWithoutJWT)).toThrow();
    });

    it("should validate JWT_SECRET minimum length", () => {
      const envWithShortJWT = {
        POSTGRES_HOST: "localhost",
        POSTGRES_PORT: "5432",
        POSTGRES_USER: "test",
        POSTGRES_PASSWORD: "test",
        POSTGRES_DB: "test",
        JWT_SECRET: "short",
      };

      expect(() => envSchema.parse(envWithShortJWT)).toThrow();
    });

    it("should accept valid JWT_SECRET", () => {
      const envWithValidJWT = {
        POSTGRES_HOST: "localhost",
        POSTGRES_PORT: "5432",
        POSTGRES_USER: "test",
        POSTGRES_PASSWORD: "test",
        POSTGRES_DB: "test",
        JWT_SECRET: "a".repeat(32),
      };

      expect(() => envSchema.parse(envWithValidJWT)).not.toThrow();
    });
  });

  describe("JWT Module Configuration", () => {
    beforeEach(() => {
      // Set valid JWT_SECRET for module tests
      process.env.JWT_SECRET = "a".repeat(32);
    });

    it("should configure JWT module with valid secret", async () => {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            validate: () => envSchema.parse(process.env),
          }),
          AuthModule,
        ],
        providers: [
          {
            provide: "DbStatsService",
            useValue: {
              getStats: jest
                .fn()
                .mockResolvedValue({ total: 0, active: 0, idle: 0 }),
            },
          },
        ],
      }).compile();

      // Test that the module compiles successfully with valid JWT configuration
      expect(module).toBeDefined();
    });

    it("should fail JWT module configuration with invalid secret", async () => {
      // Temporarily set invalid secret
      const originalSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = "short";

      await expect(async () => {
        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              validate: () => envSchema.parse(process.env),
            }),
            DatabaseModule,
            AuthModule,
          ],
        }).compile();
      }).rejects.toThrow();

      // Restore original secret
      process.env.JWT_SECRET = originalSecret;
    });
  });
});
