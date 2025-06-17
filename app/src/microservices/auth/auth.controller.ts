import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody,
  ApiHeader,
  ApiExtraModels
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { SignUpDto } from "./dto/sign-up.dto";
import { SignInDto } from "./dto/sign-in.dto";

// Response DTOs for better Swagger documentation
export class AuthResponseDto {
  success: boolean;
  message?: string;
  data?: {
    user: {
      id: string | undefined;
      email: string | undefined;
      username: string;
      displayName: string;
      isVerified?: boolean;
      isPremium?: boolean;
    };
    session?: {
      accessToken: string;
      refreshToken: string | null;
      expiresAt: string;
    };
  };
}

export class SignOutResponseDto {
  success: boolean;
  message: string;
}

@ApiTags("Authentication")
@ApiExtraModels(AuthResponseDto, SignOutResponseDto)
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  @ApiOperation({ 
    summary: "Register a new user",
    description: `
    Register a new user account with email and password.
    
    **Requirements:**
    - Unique email address
    - Strong password (8+ chars, uppercase, lowercase, number, special char)
    - Unique username (letters, numbers, underscores only)
    - Display name for profile
    
    **Process:**
    1. Creates account in Supabase Auth
    2. Stores user profile in local database
    3. Returns user details (without session - user must sign in)
    `
  })
  @ApiBody({ 
    type: SignUpDto,
    description: "User registration details",
    examples: {
      example1: {
        summary: "Standard Registration",
        value: {
          email: "alex@nightbff.com",
          username: "alex_nightlife",
          displayName: "Alex Johnson",
          password: "SecurePass123!"
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: "User registered successfully",
    type: AuthResponseDto,
    schema: {
      example: {
        success: true,
        message: "User registered successfully",
        data: {
          user: {
            id: "12345678-1234-1234-1234-123456789012",
            email: "alex@nightbff.com",
            username: "alex_nightlife",
            displayName: "Alex Johnson"
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: "Validation failed or email already exists",
    schema: {
      example: {
        statusCode: 400,
        message: ["Email already exists", "Password too weak"],
        error: "Bad Request"
      }
    }
  })
  @ApiResponse({ 
    status: 500, 
    description: "Internal server error during registration",
    schema: {
      example: {
        statusCode: 500,
        message: "Failed to register user",
        error: "Internal Server Error"
      }
    }
  })
  async signUp(@Body() signUpDto: SignUpDto): Promise<AuthResponseDto> {
    return this.authService.signUp(signUpDto);
  }

  @Post("signin")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: "Sign in user",
    description: `
    Authenticate user with email and password.
    
    **Two Authentication Modes:**
    - **Standard Mode:** Uses Supabase Auth for secure authentication
    - **Performance Mode:** Uses local database for testing (controlled by PERFORMANCE_MODE env var)
    
    **Returns:**
    - User profile information
    - JWT access token for API authentication
    - Token expiration details
    
    **Usage:**
    Use the returned accessToken in Authorization header for protected endpoints:
    \`Authorization: Bearer YOUR_ACCESS_TOKEN\`
    `
  })
  @ApiBody({ 
    type: SignInDto,
    description: "User login credentials",
    examples: {
      example1: {
        summary: "Standard Login",
        value: {
          email: "alex@nightbff.com",
          password: "SecurePass123!"
        }
      },
      performanceMode: {
        summary: "Performance Testing Login",
        value: {
          email: "test.user@example.com",
          password: "password123"
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: "User signed in successfully",
    type: AuthResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          user: {
            id: "12345678-1234-1234-1234-123456789012",
            email: "alex@nightbff.com",
            username: "alex_nightlife",
            displayName: "Alex Johnson",
            isVerified: false,
            isPremium: false
          },
          session: {
            accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            refreshToken: null,
            expiresAt: "2025-01-13T10:30:00.000Z"
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: "Invalid credentials",
    schema: {
      example: {
        statusCode: 401,
        message: "Invalid credentials",
        error: "Unauthorized"
      }
    }
  })
  @ApiResponse({ 
    status: 500, 
    description: "Internal server error during authentication",
    schema: {
      example: {
        statusCode: 500,
        message: "Failed to sign in",
        error: "Internal Server Error"
      }
    }
  })
  async signIn(@Body() signInDto: SignInDto): Promise<AuthResponseDto> {
    return this.authService.signIn(signInDto);
  }

  @Post("signout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: "Sign out user",
    description: `
    Sign out the current user by invalidating their Supabase session.
    
    **Note:** This endpoint invalidates the Supabase session but does not invalidate
    the JWT token returned by signin. The JWT will remain valid until its expiration time.
    
    **Frontend Implementation:**
    - Call this endpoint when user logs out
    - Remove stored JWT token from local storage
    - Redirect to login screen
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: "User signed out successfully",
    type: SignOutResponseDto,
    schema: {
      example: {
        success: true,
        message: "User signed out successfully"
      }
    }
  })
  @ApiResponse({ 
    status: 500, 
    description: "Failed to sign out",
    schema: {
      example: {
        statusCode: 500,
        message: "Failed to sign out",
        error: "Internal Server Error"
      }
    }
  })
  async signOut(): Promise<SignOutResponseDto> {
    return this.authService.signOut();
  }
}
