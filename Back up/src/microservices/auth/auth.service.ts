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

/**
 * @summary Service responsible for user authentication logic.
 *
 * @description Handles user sign-up, sign-in, and sign-out processes,
 * interacting with both Supabase Auth for authentication and the local
 * AuthRepository for storing/retrieving user data in the application database.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseProvider: SupabaseProvider,
    private readonly configService: ConfigService,
    private readonly authRepository: AuthRepository,
  ) {}

  /**
   * @summary Registers a new user.
   *
   * @description Creates a user in Supabase Auth and then creates a corresponding
   * user record in the local application database via AuthRepository.
   *
   * @param {SignUpDto} signUpDto - User registration data (email, password, username, displayName).
   * @returns {Promise<object>} Object indicating success and basic user data.
   * @throws {BadRequestException} If Supabase Auth returns an error (e.g., email exists).
   * @throws {InternalServerErrorException} For other unexpected errors.
   */
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

  /**
   * @summary Authenticates a user.
   *
   * @description Signs in a user using email and password via Supabase Auth.
   * Retrieves the corresponding user profile data from the local database.
   *
   * @param {SignInDto} signInDto - User login data (email, password).
   * @returns {Promise<object>} Object containing user data and Supabase session details (tokens).
   * @throws {UnauthorizedException} If Supabase Auth returns an error (invalid credentials).
   * @throws {InternalServerErrorException} For other unexpected errors.
   */
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

  /**
   * @summary Signs out the currently authenticated user.
   *
   * @description Invalidates the user's session in Supabase Auth.
   *
   * @returns {Promise<object>} Object indicating success.
   * @throws {InternalServerErrorException} If Supabase Auth fails to sign out.
   */
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
