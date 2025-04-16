import {
  IsEnum,
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import {
  NotificationType,
  ThemeMode,
} from "../entities/user-preference.entity";

export class UpdatePreferencesDto {
  @IsBoolean()
  @IsOptional()
  notificationEventsNearby?: boolean;

  @IsBoolean()
  @IsOptional()
  notificationFriendActivity?: boolean;

  @IsBoolean()
  @IsOptional()
  notificationPromotions?: boolean;

  @IsEnum(NotificationType)
  @IsOptional()
  notificationType?: NotificationType;

  @IsString()
  @IsOptional()
  distanceUnit?: string;

  @IsEnum(ThemeMode)
  @IsOptional()
  themeMode?: ThemeMode;

  @IsString()
  @IsOptional()
  language?: string;

  @IsBoolean()
  @IsOptional()
  autoCheckin?: boolean;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  searchRadiusMi?: number;
}
