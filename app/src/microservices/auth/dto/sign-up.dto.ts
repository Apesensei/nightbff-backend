import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SignUpDto {
  @ApiProperty({
    description: "User's email address (must be unique)",
    example: "alex@nightbff.com",
    format: "email"
  })
  @IsEmail({}, { message: "Please provide a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email: string;

  @ApiProperty({
    description: "Username for the account (letters, numbers, underscores only, must be unique)",
    example: "alex_nightlife",
    pattern: "^[a-zA-Z0-9_]+$",
    minLength: 1
  })
  @IsString({ message: "Username must be a string" })
  @IsNotEmpty({ message: "Username is required" })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: "Username can only contain letters, numbers and underscores",
  })
  username: string;

  @ApiProperty({
    description: "Display name that will be shown to other users",
    example: "Alex Johnson",
    minLength: 1
  })
  @IsString({ message: "Display name must be a string" })
  @IsNotEmpty({ message: "Display name is required" })
  displayName: string;

  @ApiProperty({
    description: "Strong password (min 8 chars, must contain uppercase, lowercase, number, and special character)",
    example: "SecurePass123!",
    minLength: 8,
    pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]"
  })
  @IsString({ message: "Password must be a string" })
  @IsNotEmpty({ message: "Password is required" })
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character",
  })
  password: string;
}
