import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsInt, Min } from "class-validator";
import { VenueResponseDto } from "./venue-response.dto";

/**
 * Generic DTO for paginated responses.
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({
    isArray: true,
    description: "Array of items for the current page",
  })
  @IsArray()
  items: T[];

  @ApiProperty({ description: "Total number of items available", example: 100 })
  @IsInt()
  @Min(0)
  total: number;

  @ApiProperty({ description: "Current page number", example: 1 })
  @IsInt()
  @Min(1)
  page: number;

  @ApiProperty({ description: "Number of items per page", example: 10 })
  @IsInt()
  @Min(1)
  limit: number;

  @ApiProperty({
    description: "Indicates if there are more pages available",
    example: true,
  })
  @IsBoolean()
  hasMore: boolean;
}

/**
 * Specific paginated response DTO for venues.
 */
export class PaginatedVenueResponseDto extends PaginatedResponseDto<VenueResponseDto> {
  // Inherits all properties from PaginatedResponseDto
  // The type parameter specifies that the 'items' array will contain VenueResponseDto objects.
}
