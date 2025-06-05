import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Venue } from "../entities/venue.entity"; // Assuming Venue entity path

// --- venue.getWithoutCityId ---
export const VENUE_GET_WITHOUT_CITY_ID_PATTERN = "venue.getWithoutCityId";

export class GetVenuesWithoutCityIdRequestDto {
  @ApiProperty({
    description: "Number of records to return per batch.",
    minimum: 1,
    maximum: 1000, // Adjust max batch size as needed
    default: 100,
  })
  @IsInt()
  @Min(1)
  @Max(1000) // Match maximum
  @IsOptional()
  limit?: number = 100;

  @ApiProperty({
    description: "Number of records to skip for pagination.",
    minimum: 0,
    default: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number = 0;
}

export class GetVenuesWithoutCityIdResponseDto {
  @ApiProperty({
    type: () => [Venue],
    description: "List of venues without cityId.",
  })
  venues: Venue[];

  @ApiProperty({
    type: Number,
    description: "Total number of venues matching the criteria.",
  })
  @IsNumber()
  total: number;
}

// --- venue.updateCityId ---
export const VENUE_UPDATE_CITY_ID_PATTERN = "venue.updateCityId";

export class UpdateVenueCityIdRequestDto {
  @ApiProperty({ description: "UUID of the venue to update.", format: "uuid" })
  @IsUUID()
  @IsNotEmpty()
  venueId: string;

  @ApiProperty({
    description: "UUID of the city to associate with the venue.",
    format: "uuid",
  })
  @IsUUID()
  @IsNotEmpty()
  cityId: string;
}

export class UpdateVenueCityIdResponseDto {
  @ApiProperty({
    type: Boolean,
    description: "Indicates if the update was successful.",
  })
  success: boolean;
}
