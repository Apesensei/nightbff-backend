import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNumber,
  IsOptional,
  Min,
  IsString,
  IsUUID,
  IsBoolean,
} from "class-validator";

/**
 * DTO representing a venue for client responses.
 * Include fields necessary for display in lists or detail views.
 */
export class VenueResponseDto {
  @ApiProperty({
    description: "Venue ID",
    example: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  })
  @IsUUID()
  id: string;

  @ApiProperty({ description: "Venue Name", example: "The Grand Nightclub" })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: "Venue Description",
    example: "A popular spot for weekend nights.",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: "Full address",
    example: "123 Main St, Anytown, CA 90210",
  })
  @IsString()
  address: string;

  @ApiProperty({ description: "Latitude", example: 34.0522 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: "Longitude", example: -118.2437 })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ description: "Primary photo URL for the venue" })
  @IsString()
  @IsOptional()
  primaryPhotoUrl?: string | null;

  @ApiPropertyOptional({ description: "Current average rating", example: 4.5 })
  @IsNumber()
  @IsOptional()
  rating?: number;

  @ApiPropertyOptional({ description: "Number of followers", example: 125 })
  @IsNumber()
  @IsOptional()
  followerCount?: number;

  @ApiPropertyOptional({
    description: "Indicates if the current user is following this venue",
  })
  @IsBoolean()
  @IsOptional()
  isFollowing?: boolean;

  // Add other fields needed for display, e.g.:
  // @ApiPropertyOptional({ description: 'Price Level (1-4)' })
  // priceLevel?: number;

  // @ApiPropertyOptional({ description: 'Website URL' })
  // website?: string;
}
