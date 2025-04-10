import { IsString, IsNumber, IsOptional, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for venue text search requests
 */
export class VenueTextSearchDto {
  @ApiPropertyOptional({
    description: "Search query text",
    example: "nightclub",
  })
  @IsString()
  @IsOptional()
  query?: string;

  @ApiPropertyOptional({
    description: "Maximum number of results to return",
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: "Number of results to skip (for pagination)",
    default: 0,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}
