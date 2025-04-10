import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SupabaseProvider } from "@/common/database/supabase.provider";
import { SignUpDto } from "./dto/sign-up.dto";
import { SignInDto } from "./dto/sign-in.dto";
import { AuthRepository } from "./repositories/auth.repository";

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseProvider: SupabaseProvider,
    private readonly configService: ConfigService,
    private readonly authRepository: AuthRepository,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    try {
      const supabase = this.supabaseProvider.getClient();

      const { data, error } = await supabase.auth.signUp({
        email: signUpDto.email,
        password: signUpDto.password,
        options: {
          data: {
            username: signUpDto.username,
            displayName: signUpDto.displayName,
          },
        },
      });

      if (error) {
        throw new BadRequestException(error.message);
      }

      // Store additional user information in our database
      await this.authRepository.createUser({
        id: data.user?.id,
        email: signUpDto.email,
        username: signUpDto.username,
        displayName: signUpDto.displayName,
        isVerified: false, // User needs to verify age
        isPremium: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        success: true,
        message: "User registered successfully",
        data: {
          user: {
            id: data.user?.id,
            email: data.user?.email,
            username: signUpDto.username,
            displayName: signUpDto.displayName,
          },
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException("Failed to register user");
    }
  }

  async signIn(signInDto: SignInDto) {
    try {
      const supabase = this.supabaseProvider.getClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInDto.email,
        password: signInDto.password,
      });

      if (error) {
        throw new UnauthorizedException("Invalid credentials");
      }

      // Get user profile
      const userProfile = await this.authRepository.getUserById(data.user?.id);

      return {
        success: true,
        data: {
          user: {
            id: data.user?.id,
            email: data.user?.email,
            ...userProfile,
          },
          session: {
            accessToken: data.session?.access_token,
            refreshToken: data.session?.refresh_token,
            expiresAt: data.session?.expires_at,
          },
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException("Failed to sign in");
    }
  }

  async signOut() {
    try {
      const supabase = this.supabaseProvider.getClient();

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw new InternalServerErrorException("Failed to sign out");
      }

      return {
        success: true,
        message: "User signed out successfully",
      };
    } catch {
      throw new InternalServerErrorException("Failed to sign out");
    }
  }
}
