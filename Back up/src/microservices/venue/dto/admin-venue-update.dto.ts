import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsLatitude,
  IsLongitude,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AdminVenueUpdateDto {
  @ApiProperty({
    description: "Venue name",
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: "Venue description",
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: "Venue address",
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: "Venue city",
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    description: "Venue state",
    required: false,
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    description: "Venue postal code",
    required: false,
  })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({
    description: "Venue country",
    required: false,
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({
    description: "Venue website URL",
    required: false,
  })
  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @ApiProperty({
    description: "Venue phone number",
    required: false,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({
    description: "Venue latitude",
    required: false,
  })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiProperty({
    description: "Venue longitude",
    required: false,
  })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiProperty({
    description: "Whether venue is verified by admin",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiProperty({
    description: "Whether venue is featured",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({
    description: "Venue type (e.g. restaurant, bar, etc.)",
    required: false,
  })
  @IsOptional()
  @IsString()
  venueType?: string;

  @ApiProperty({
    description: "Venue amenities list",
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiProperty({
    description: "Admin notes (not visible to users)",
    required: false,
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
