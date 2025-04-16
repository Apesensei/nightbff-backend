import {
  IsString,
  IsOptional,
  IsUUID,
  IsDate,
  IsInt,
  IsEnum,
  Min,
  Max,
  MaxLength,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { EventVisibility } from "../enums/event-visibility.enum";

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  venueId?: string;

  @IsOptional()
  @IsString()
  customLocation?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startTime?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endTime?: Date;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  attendeeLimit?: number;

  @IsOptional()
  @IsEnum(EventVisibility)
  visibility?: EventVisibility;

  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;
}
