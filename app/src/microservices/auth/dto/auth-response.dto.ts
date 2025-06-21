import { ApiProperty } from "@nestjs/swagger";

// Our standard backend response format
export class AuthResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ required: false })
  message?: string;

  @ApiProperty({ required: false })
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

// Frontend-compatible response format for iOS app integration
export class FrontendAuthResponseDto {
  @ApiProperty({ description: "JWT access token for API authentication" })
  token: string;

  @ApiProperty({
    description: "User information compatible with frontend expectations",
    example: {
      id: "12345678-1234-1234-1234-123456789012",
      name: "Alex Johnson",
      email: "alex@nightbff.com",
    },
  })
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export class SignOutResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;
}
