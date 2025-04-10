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
    const { sub: userId } = payload;
    const user = await this.authRepository.getUserById(userId);

    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    return user;
  }
}
