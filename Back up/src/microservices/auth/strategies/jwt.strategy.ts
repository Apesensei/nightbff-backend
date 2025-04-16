import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { AuthRepository } from "../repositories/auth.repository";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authRepository: AuthRepository,
  ) {
    const secret = configService.get<string>("JWT_SECRET") || "";
    if (!secret) {
      console.warn("Warning: JWT_SECRET environment variable is not set.");
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    console.log(
      "--- JWT_STRATEGY: Validate called with payload:",
      JSON.stringify(payload),
    );
    const { sub: userId } = payload;
    if (!userId) {
      console.error("--- JWT_STRATEGY: No userId (sub) in payload!");
      throw new UnauthorizedException("Invalid token payload");
    }

    console.log(`--- JWT_STRATEGY: Attempting to find user ${userId}`);
    try {
      const user = await this.authRepository.getUserById(userId);
      console.log(
        `--- JWT_STRATEGY: Found user result: ${user ? user.id : "null"}`,
      );

      if (!user) {
        console.warn(
          `--- JWT_STRATEGY: User ${userId} not found by AuthRepository`,
        );
        throw new UnauthorizedException("User not found or invalid token");
      }

      console.log(
        `--- JWT_STRATEGY: Validation successful for user ${user.id}`,
      );
      return user;
    } catch (error) {
      console.error(
        `--- JWT_STRATEGY: Error during user validation for ${userId}:`,
        error,
      );
      throw new UnauthorizedException(
        "Token validation failed due to internal error",
      );
    }
  }
}
