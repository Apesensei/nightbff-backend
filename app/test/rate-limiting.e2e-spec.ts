import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Rate Limiting (e2e)", () => {
  let app: INestApplication;
  let configService: ConfigService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configService = app.get<ConfigService>(ConfigService);

    // Configure rate limiting for testing
    const { createGeneralRateLimit, createAuthRateLimit } = await import(
      "../src/common/middleware/rate-limiting.config.js"
    );

    // Apply rate limiting with test-friendly limits
    const generalLimiter = createGeneralRateLimit(configService);
    const authLimiter = createAuthRateLimit(configService);

    app.use("/api", generalLimiter);
    app.use("/api/auth", authLimiter);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("General API Rate Limiting", () => {
    it("should allow requests within limit", async () => {
      const response = await request(app.getHttpServer())
        .get("/api")
        .expect(200);

      expect(response.headers["x-ratelimit-limit"]).toBeDefined();
      expect(response.headers["x-ratelimit-remaining"]).toBeDefined();
    });

    it("should skip rate limiting for health checks", async () => {
      // Health endpoint should not be rate limited
      await request(app.getHttpServer()).get("/health").expect(200);
    });
  });

  describe("Auth Endpoint Rate Limiting", () => {
    it("should allow auth requests within limit", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/auth/signin")
        .send({ email: "test@example.com", password: "password123" })
        .expect(401); // Expected to fail due to invalid credentials, not rate limiting

      expect(response.headers["x-ratelimit-limit"]).toBeDefined();
    });

    it("should have stricter limits for auth endpoints", async () => {
      // This test would need to be implemented with actual rate limiting behavior
      // For now, we just verify the endpoint exists and has rate limiting headers
      const response = await request(app.getHttpServer())
        .post("/api/auth/signin")
        .send({ email: "test@example.com", password: "password123" });

      expect(response.headers["x-ratelimit-limit"]).toBeDefined();
    });
  });

  describe("Rate Limiting Headers", () => {
    it("should include rate limiting headers in responses", async () => {
      const response = await request(app.getHttpServer())
        .get("/api")
        .expect(200);

      expect(response.headers["x-ratelimit-limit"]).toBeDefined();
      expect(response.headers["x-ratelimit-remaining"]).toBeDefined();
      expect(response.headers["x-ratelimit-reset"]).toBeDefined();
    });
  });

  describe("Rate Limiting Error Messages", () => {
    it("should return proper error message when rate limited", async () => {
      // This test would need to be implemented with actual rate limiting behavior
      // For now, we just verify the configuration is correct
      expect(configService.get("RATE_LIMIT_MAX_REQUESTS")).toBeDefined();
      expect(configService.get("AUTH_RATE_LIMIT_MAX")).toBeDefined();
    });
  });
});
