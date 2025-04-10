import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsInt, Min, Max, IsNumber } from "class-validator";
import { Type } from "class-transformer";

/**
 * DTO for requesting trending venues, supporting pagination and optional location filtering.
 */
export class TrendingVenuesRequestDto {
  @ApiPropertyOptional({
    description: "Number of items per page",
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: "Offset for pagination (number of items to skip)",
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  // Optional: Add location filters if trending should be location-aware
  // @ApiPropertyOptional({ description: 'Center latitude for location-based trending' })
  // @IsOptional()
  // @Type(() => Number)
  // @IsNumber()
  // latitude?: number;

  // @ApiPropertyOptional({ description: 'Center longitude for location-based trending' })
  // @IsOptional()
  // @Type(() => Number)
  // @IsNumber()
  // longitude?: number;

  // @ApiPropertyOptional({ description: 'Radius in kilometers for location-based trending' })
  // @IsOptional()
  // @Type(() => Number)
  // @IsNumber()
  // @Min(1)
  // radiusKm?: number;
}
