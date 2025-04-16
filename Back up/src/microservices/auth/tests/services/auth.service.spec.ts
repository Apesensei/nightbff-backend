import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import {
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { SupabaseProvider } from "@/common/database/supabase.provider";
import { AuthService } from "../../auth.service";
import { AuthRepository } from "../../repositories/auth.repository";
import { SignUpDto } from "../../dto/sign-up.dto";
import { UserStatus, UserRole } from "../../entities/user.entity";

describe("AuthService", () => {
  let authService: AuthService;
  let supabaseProvider: SupabaseProvider;
  let authRepository: AuthRepository;

  // Mock Supabase client and its methods
  const mockSupabaseClient = {
    auth: {
      signUp: jest.fn(),
    },
  };

  const mockSupabaseProvider = () => ({
    getClient: jest.fn().mockReturnValue(mockSupabaseClient),
  });

  const mockAuthRepository = () => ({
    createUser: jest.fn(),
    // Add other methods if needed by other tests
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseProvider, useFactory: mockSupabaseProvider },
        { provide: AuthRepository, useFactory: mockAuthRepository },
        // Mock ConfigService if needed, providing default values
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              // Provide mock values for any config keys used in AuthService
              if (key === "JWT_SECRET") return "test-secret";
              if (key === "JWT_EXPIRES_IN") return "7d";
              return null;
            }),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    supabaseProvider = module.get<SupabaseProvider>(SupabaseProvider);
    authRepository = module.get<AuthRepository>(AuthRepository);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(authService).toBeDefined();
  });

  describe("signUp", () => {
    // Test case from Step 3.3.1
    it("should register a new user successfully", async () => {
      const signUpDto: SignUpDto = {
        email: "test@example.com",
        password: "Password123!",
        username: "testuser",
        displayName: "Test User",
      };

      const mockSupabaseUser = {
        id: "supabase-user-id",
        email: signUpDto.email,
      };
      const mockSupabaseResponse = {
        data: { user: mockSupabaseUser },
        error: null,
      };
      const mockCreatedUser = {
        id: mockSupabaseUser.id,
        email: signUpDto.email,
        username: signUpDto.username,
        displayName: signUpDto.displayName,
        passwordHash: "hashed_password",
        isVerified: false,
        isPremium: false,
        isAgeVerified: false,
        isOnline: false,
        status: UserStatus.ACTIVE,
        roles: [UserRole.USER],
        createdAt: new Date(),
        updatedAt: new Date(),
        photoURL: undefined,
        bio: undefined,
        interests: undefined,
        locationLatitude: undefined,
        locationLongitude: undefined,
        ageVerification: null,
        get location() {
          return null;
        },
      };

      // Configure mocks
      mockSupabaseClient.auth.signUp.mockResolvedValue(mockSupabaseResponse);
      (authRepository.createUser as jest.Mock).mockResolvedValue(
        mockCreatedUser,
      );

      const result = await authService.signUp(signUpDto);

      // Assertions
      expect(supabaseProvider.getClient).toHaveBeenCalledTimes(1);
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: signUpDto.email,
        password: signUpDto.password,
        options: {
          data: {
            username: signUpDto.username,
            displayName: signUpDto.displayName,
          },
        },
      });
      expect(authRepository.createUser).toHaveBeenCalledWith({
        id: mockSupabaseUser.id,
        email: signUpDto.email,
        username: signUpDto.username,
        displayName: signUpDto.displayName,
        isVerified: false,
        isPremium: false,
        createdAt: expect.any(Date), // Expect a Date object
        updatedAt: expect.any(Date), // Expect a Date object
      });
      expect(result).toEqual({
        success: true,
        message: "User registered successfully",
        data: {
          user: {
            id: mockSupabaseUser.id,
            email: mockSupabaseUser.email,
            username: signUpDto.username,
            displayName: signUpDto.displayName,
          },
        },
      });
    });

    it("should throw BadRequestException if Supabase signup fails", async () => {
      const signUpDto: SignUpDto = {
        email: "test@example.com",
        password: "Password123!",
        username: "testuser",
        displayName: "Test User",
      };
      const mockError = { message: "Supabase signup error" };
      const mockSupabaseResponse = { data: null, error: mockError };

      mockSupabaseClient.auth.signUp.mockResolvedValue(mockSupabaseResponse);

      await expect(authService.signUp(signUpDto)).rejects.toThrow(
        new BadRequestException(mockError.message),
      );
      expect(authRepository.createUser).not.toHaveBeenCalled();
    });

    it("should throw InternalServerErrorException if AuthRepository fails", async () => {
      const signUpDto: SignUpDto = {
        email: "test@example.com",
        password: "Password123!",
        username: "testuser",
        displayName: "Test User",
      };
      const mockSupabaseUser = {
        id: "supabase-user-id",
        email: signUpDto.email,
      };
      const mockSupabaseResponse = {
        data: { user: mockSupabaseUser },
        error: null,
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue(mockSupabaseResponse);
      (authRepository.createUser as jest.Mock).mockRejectedValue(
        new Error("DB error"),
      );

      await expect(authService.signUp(signUpDto)).rejects.toThrow(
        new InternalServerErrorException("Failed to register user"),
      );
      expect(authRepository.createUser).toHaveBeenCalled();
    });
  });

  // Add describe blocks for signIn and signOut tests if needed later
});
