import {
  IsEnum,
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  IsDateString,
} from "class-validator";
import { Gender } from "../entities/user-profile.entity";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateProfileDto {
  @ApiProperty({ description: "User's biography", required: false })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiProperty({ enum: Gender, enumName: 'Gender', description: "User's gender", required: false, example: Gender.FEMALE })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiProperty({ description: "User's birthday (YYYY-MM-DD)", required: false, example: '1995-07-21' })
  @IsDateString()
  @IsOptional()
  birthday?: string;

  @ApiProperty({ type: [String], description: "Array of favorite venue IDs", required: false })
  @IsArray()
  @IsOptional()
  favoriteVenues?: string[];

  @ApiProperty({ description: "URL for profile cover image", required: false })
  @IsString()
  @IsOptional()
  profileCoverUrl?: string;

  @ApiProperty({ description: "Instagram profile username/URL", required: false })
  @IsString()
  @IsOptional()
  socialInstagram?: string;

  @ApiProperty({ description: "Twitter profile username/URL", required: false })
  @IsString()
  @IsOptional()
  socialTwitter?: string;

  @ApiProperty({ description: "TikTok profile username/URL", required: false })
  @IsString()
  @IsOptional()
  socialTiktok?: string;

  @ApiProperty({ description: "Profile visibility", required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
