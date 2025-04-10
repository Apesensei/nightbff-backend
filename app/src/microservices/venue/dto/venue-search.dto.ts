import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { Transform, Type } from "class-transformer";

export enum VenueSortBy {
  DISTANCE = "distance",
  RATING = "rating",
  POPULARITY = "popularity",
  PRICE = "price",
}

export class VenueSearchDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0.1)
  @Max(50)
  radius?: number = 10; // miles

  @IsString()
  @IsOptional()
  query?: string;

  @IsArray()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? [value] : Array.isArray(value) ? value : [],
  )
  venueTypes?: string[];

  @IsEnum(VenueSortBy)
  @IsOptional()
  sortBy?: VenueSortBy = VenueSortBy.DISTANCE;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  openNow?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(4)
  @Type(() => Number)
  priceLevel?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}
