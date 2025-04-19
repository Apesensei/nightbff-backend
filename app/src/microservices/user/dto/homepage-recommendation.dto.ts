import { ApiProperty } from "@nestjs/swagger";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
} from "class-validator";

export class HomepageRecommendationDto {
  @ApiProperty({
    description: "The unique identifier of the recommended user",
    example: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: "The display name of the recommended user",
    example: "Alex",
  })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiProperty({
    description: "The primary photo URL of the recommended user",
    example: "https://example.com/photos/alex.jpg",
    required: false,
  })
  @IsUrl()
  @IsOptional() // Assuming photoURL might be optional
  photoURL?: string;

  @ApiProperty({
    description:
      "The country of the recommended user (e.g., country code or name)",
    example: "CA",
    required: false,
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({
    description: "The calculated age of the recommended user",
    example: 25,
    minimum: 18, // Assuming a minimum age for users
    required: false,
  })
  @IsInt()
  @Min(18)
  @IsOptional()
  age: number | null;
}
