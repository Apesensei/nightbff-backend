import {
  IsNumber,
  IsOptional,
  IsDate,
  ValidateNested,
  Min,
  Max,
} from "class-validator";
import { Type, Transform } from "class-transformer";

export class LocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNumber()
  @Min(0.1)
  @Max(100)
  radiusInKm: number = 10;
}

export class TrendingPlansRequestDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 10;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;

  @IsOptional()
  @Transform(({ value }) => value && new Date(value))
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Transform(({ value }) => value && new Date(value))
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;
}
