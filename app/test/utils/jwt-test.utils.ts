import { JwtService } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";

/**
 * Generates a JWT token suitable for test environments.
 * It creates a temporary Nest module to access the ConfigService,
 * ensuring it uses the same configuration (e.g., .env.test) as the main application
 * for loading JWT secrets.
 *
 * @param payload The payload to sign. Must include `userId`.
 * @param expiresIn Optional expiration time (e.g., '1h', '7d'). Defaults to JWT_EXPIRES_IN or '1h'.
 * @returns A promise that resolves to the signed JWT string.
 */
export async function generateTestJwt(
  payload: { userId: string; [key: string]: any },
  expiresIn?: string,
): Promise<string> {
  // Determine if running in a CI environment where .env files might not exist
  const isCI = process.env.CI === "true";

  // Create a minimal standalone NestJS module to access ConfigService
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        // Load .env.test specifically, unless in CI where env vars are expected directly
        envFilePath: isCI ? undefined : "config/env/test.env",
        // If in CI, ignore .env file absence; otherwise, it might warn/error
        ignoreEnvFile: isCI,
        // Allow environment variables to override .env file values
        load: [
          () => ({
            /* Add default test values here if needed */
          }),
        ], // Optional default values
      }),
    ],
    providers: [
      // Provide JwtService using the loaded configuration
      {
        provide: JwtService,
        useFactory: (configService: ConfigService) => {
          const secret = configService.get<string>("JWT_SECRET");
          if (!secret) {
            // Provide a default secret ONLY FOR TESTS if none is found
            // WARNING: Do not use this default in production!
            console.warn(
              "JWT_SECRET not found in test config, using default test secret.",
            );
            return new JwtService({ secret: "DEFAULT_TEST_SECRET_CHANGE_ME" });
          }
          return new JwtService({ secret });
        },
        inject: [ConfigService],
      },
      ConfigService, // Ensure ConfigService itself is provided
    ],
  }).compile();

  const jwtService = moduleRef.get(JwtService);
  const configService = moduleRef.get(ConfigService);

  // Use the loaded config for expiration, with a sensible test default
  const defaultExpiresIn = configService.get<string>("JWT_EXPIRES_IN", "1h");

  // Ensure the jwtService instance has the secret correctly configured
  // (The factory above should handle this)
  const options = {
    expiresIn: expiresIn ?? defaultExpiresIn,
  };

  // The payload should at least contain `sub` for the JwtStrategy
  const finalPayload = { sub: payload.userId, ...payload };

  try {
    const token = jwtService.sign(finalPayload, options);
    // Optional: Close the temporary module context if needed
    // await moduleRef.close();
    return token;
  } catch (error) {
    console.error("Error signing JWT in test helper:", error);
    // await moduleRef.close();
    throw new Error(
      "Failed to generate test JWT. Check JWT_SECRET configuration.",
    );
  }
}
