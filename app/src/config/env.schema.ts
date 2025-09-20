import { z } from "zod";

/**
 * Canonical environment variable schema for NightBFF services.
 *
 * 1. Validates presence & format of required POSTGRES_* variables.
 * 2. Allows DATABASE_URL as optional escape hatch.
 * 3. Fails fast if *any* deprecated DB_* variable is provided.
 */
export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "performance", "integration", "production"])
      .optional(),

    // Database (canonical Postgres split vars)
    POSTGRES_HOST: z.string(),
    POSTGRES_PORT: z.string(),
    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string(),
    POSTGRES_DB: z.string(),

    // Optional single-string connection override
    DATABASE_URL: z.string().optional(),

    // Redis
    REDIS_HOST: z.string().optional(),
    REDIS_PORT: z.string().optional(),

    // JWT / auth
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),

    // HTTPS / TLS (optional for development)
    HTTPS_KEY_PATH: z.string().optional(),
    HTTPS_CERT_PATH: z.string().optional(),

    // Database SSL Configuration
    POSTGRES_SSL: z.string().optional(),
    POSTGRES_CA_CERT: z.string().optional(),
    POSTGRES_CLIENT_CERT: z.string().optional(),
    POSTGRES_CLIENT_KEY: z.string().optional(),
    POSTGRES_SSLMODE: z.string().optional(),

    // Rate Limiting Configuration
    RATE_LIMIT_WINDOW_MS: z.string().optional(),
    RATE_LIMIT_MAX_REQUESTS: z.string().optional(),
    AUTH_RATE_LIMIT_MAX: z.string().optional(),
    UPLOAD_RATE_LIMIT_MAX: z.string().optional(),

    // Misc (allow extra)
  })
  .passthrough() // allow unknown vars so we don't block non-db config
  .superRefine((env: any, ctx: any) => {
    // Guardrail: legacy DB_* vars MUST NOT exist (except pool-related metrics)
    const allowedLegacy = [
      "DB_POOL_SIZE",
      "DB_TIMEOUT",
      "DB_POOL_ACQUIRE_TIMEOUT",
    ];
    const forbidden = Object.keys(process.env).filter(
      (k) => k.startsWith("DB_") && !allowedLegacy.includes(k),
    );

    if (forbidden.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Deprecated DB_* variables detected: ${forbidden.join(", ")}. Refactor to POSTGRES_* naming before starting service.`,
      });
    }
  });

/**
 * Helper invoked at application bootstrap.
 * Throws with rich message and exits when validation fails.
 */
export function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Environment validation failed:\n", result.error.format());
    // Immediate exit so Docker marks container as failed
    process.exit(1);
  }
  return result.data;
}
