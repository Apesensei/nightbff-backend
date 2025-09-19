import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
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
 * Returns local JWT tokens for consistent validation across the application.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseProvider: SupabaseProvider,
    private readonly configService: ConfigService,
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
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
   * @description Signs in a user using email and password. In performance mode,
   * validates against local database only. In normal mode, uses Supabase Auth.
   * Generates and returns a local JWT token for subsequent API calls.
   *
   * @param {SignInDto} signInDto - User login data (email, password).
   * @returns {Promise<object>} Object containing user data and local JWT session details.
   * @throws {UnauthorizedException} If authentication fails.
   * @throws {InternalServerErrorException} For other unexpected errors.
   */
  async signIn(signInDto: SignInDto) {
    try {
      const isPerformanceMode =
        this.configService.get<string>("PERFORMANCE_MODE") === "true";
      const authMode = this.configService.get<string>("AUTH_MODE", "supabase");

      let userId: string;
      let userEmail: string;

      if (isPerformanceMode || authMode === "local") {
        // Performance mode: validate credentials against local database only
        console.log("🚀 Performance mode: Using local authentication");

        // For performance testing, we'll lookup user by email and validate a basic password
        // This assumes users were seeded with a known password pattern
        const localUser = await this.authRepository.getUserByEmail(
          signInDto.email,
        );

        if (!localUser) {
          throw new UnauthorizedException("Invalid credentials");
        }

        // Validate password using bcrypt hash comparison
        const isPasswordValid = await localUser.validatePassword(
          signInDto.password,
        );
        if (!isPasswordValid) {
          throw new UnauthorizedException("Invalid credentials");
        }

        userId = localUser.id;
        userEmail = localUser.email;
      } else {
        // Standard mode: use Supabase authentication
        console.log("🔐 Standard mode: Using Supabase authentication");
        const supabase = this.supabaseProvider.getClient();

        const { data, error } = await supabase.auth.signInWithPassword({
          email: signInDto.email,
          password: signInDto.password,
        });

        if (error) {
          throw new UnauthorizedException("Invalid credentials");
        }

        if (!data.user?.id || !data.user?.email) {
          throw new UnauthorizedException(
            "Invalid user data from authentication provider",
          );
        }

        userId = data.user.id;
        userEmail = data.user.email;
      }

      // Get user profile from local database (common for both modes)
      const userProfile = await this.authRepository.getUserById(userId);

      if (!userProfile) {
        throw new UnauthorizedException("User profile not found");
      }

      // Generate local JWT token (common for both modes)
      const payload = {
        sub: userId,
        userId: userId,
        email: userEmail,
        username: userProfile?.username,
      };

      const accessToken = this.jwtService.sign(payload);
      const expiresIn = this.configService.get<string>("JWT_EXPIRES_IN", "7d");

      // Calculate expiration timestamp
      const expiresAt = new Date();
      const expirationValue = parseInt(expiresIn.replace(/\D/g, ""));
      const expirationUnit = expiresIn.replace(/\d/g, "");

      if (expirationUnit.includes("d")) {
        expiresAt.setDate(expiresAt.getDate() + expirationValue);
      } else if (expirationUnit.includes("h")) {
        expiresAt.setHours(expiresAt.getHours() + expirationValue);
      } else {
        // Default to days if unit is unclear
        expiresAt.setDate(expiresAt.getDate() + expirationValue);
      }

      return {
        success: true,
        data: {
          user: {
            id: userId,
            email: userEmail,
            username: userProfile.username,
            displayName: userProfile.displayName,
            isVerified: userProfile.isVerified,
            isPremium: userProfile.isPremium,
          },
          session: {
            accessToken: accessToken,
            refreshToken: null, // We'll implement refresh tokens later if needed
            expiresAt: expiresAt.toISOString(),
          },
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error("Auth service error:", error);
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
