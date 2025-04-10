import {
  IsString,
  IsNotEmpty,
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

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsUUID()
  venueId?: string;

  @IsOptional()
  @IsString()
  customLocation?: string;

  @IsDate()
  @Type(() => Date)
  startTime: Date;

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

  @IsEnum(EventVisibility)
  visibility: EventVisibility = EventVisibility.PUBLIC;

  @IsOptional()
  @IsBoolean()
  requireApproval: boolean = false;
}
