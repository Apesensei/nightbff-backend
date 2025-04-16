import { ApiProperty } from "@nestjs/swagger";
import { ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { VenueResponseDto } from "./venue-response.dto";
import { PaginatedVenueResponseDto } from "./paginated-venue-response.dto";

/**
 * DTO for the response of the main venue discovery page.
 * Aggregates different sections like recently viewed and trending.
 */
export class DiscoverVenuesResponseDto {
  @ApiProperty({
    description: "List of recently viewed venues (up to 5)",
    type: [VenueResponseDto],
  })
  @ValidateNested({ each: true })
  @Type(() => VenueResponseDto)
  recentlyViewed: VenueResponseDto[];

  @ApiProperty({
    description: "Paginated list of trending venues (first page)",
    type: PaginatedVenueResponseDto,
  })
  @ValidateNested()
  @Type(() => PaginatedVenueResponseDto)
  trendingVenues: PaginatedVenueResponseDto;

  // Potential future sections:
  // @ApiPropertyOptional({ description: 'List of featured venues' })
  // featuredVenues?: VenueResponseDto[];

  // @ApiPropertyOptional({ description: 'Venues grouped by category' })
  // venuesByCategory?: Record<string, VenueResponseDto[]>;
}
