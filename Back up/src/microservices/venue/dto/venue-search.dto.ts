import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  IsLatitude,
  IsLongitude,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export enum VenueSortBy {
  DISTANCE = "distance",
  RATING = "rating",
  POPULARITY = "popularity",
  PRICE = "price",
}

export class VenueSearchDto {
  @ApiPropertyOptional({ description: "Center latitude for geographic search" })
  @IsLatitude()
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({
    description: "Center longitude for geographic search",
  })
  @IsLongitude()
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({ description: "Search radius in miles", default: 10 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0.1)
  @Max(50)
  radius?: number = 10; // Assuming radius, not radiusMiles based on previous read

  @ApiPropertyOptional({ description: "Search query text" })
  @IsString()
  @IsOptional()
  query?: string;

  @ApiPropertyOptional({
    description: "Filter by interest ID",
    example: "uuid-for-interest",
  })
  @IsString()
  @IsOptional()
  interestId?: string;

  @ApiPropertyOptional({ description: "Filter by venue type IDs" })
  @IsArray()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? [value] : Array.isArray(value) ? value : [],
  )
  venueTypes?: string[];

  @ApiPropertyOptional({
    description: "Sort results by",
    enum: VenueSortBy,
    default: VenueSortBy.DISTANCE,
  })
  @IsEnum(VenueSortBy)
  @IsOptional()
  sortBy?: VenueSortBy = VenueSortBy.DISTANCE;

  @ApiPropertyOptional({
    description: "Sort order",
    enum: ["ASC", "DESC"],
    default: "ASC",
  })
  @IsEnum(["ASC", "DESC"])
  @IsOptional()
  order?: "ASC" | "DESC" = "ASC";

  @ApiPropertyOptional({ description: "Filter for venues open now" })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  openNow?: boolean;

  @ApiPropertyOptional({ description: "Filter by price level (1-4)" })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(4)
  @Type(() => Number)
  priceLevel?: number;

  @ApiPropertyOptional({ description: "Maximum results per page", default: 20 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: "Number of results to skip", default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}
