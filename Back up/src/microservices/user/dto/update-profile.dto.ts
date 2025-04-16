import {
  IsEnum,
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  IsDateString,
} from "class-validator";
import { Gender } from "../entities/user-profile.entity";

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  bio?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsDateString()
  @IsOptional()
  birthday?: string;

  @IsArray()
  @IsOptional()
  favoriteVenues?: string[];

  @IsString()
  @IsOptional()
  profileCoverUrl?: string;

  @IsString()
  @IsOptional()
  socialInstagram?: string;

  @IsString()
  @IsOptional()
  socialTwitter?: string;

  @IsString()
  @IsOptional()
  socialTiktok?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
