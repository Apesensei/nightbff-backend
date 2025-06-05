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
import { Event } from "../entities/event.entity"; // Assuming Event entity path

// --- event.getWithoutCityId ---
export const EVENT_GET_WITHOUT_CITY_ID_PATTERN = "event.getWithoutCityId";

export class GetEventsWithoutCityIdRequestDto {
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

export class GetEventsWithoutCityIdResponseDto {
  @ApiProperty({
    type: () => [Event],
    description: "List of events without cityId.",
  })
  events: Event[];

  @ApiProperty({
    type: Number,
    description: "Total number of events matching the criteria.",
  })
  @IsNumber()
  total: number;
}

// --- event.updateCityId ---
export const EVENT_UPDATE_CITY_ID_PATTERN = "event.updateCityId";

export class UpdateEventCityIdRequestDto {
  @ApiProperty({ description: "UUID of the event to update.", format: "uuid" })
  @IsUUID()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({
    description: "UUID of the city to associate with the event.",
    format: "uuid",
  })
  @IsUUID()
  @IsNotEmpty()
  cityId: string;
}

export class UpdateEventCityIdResponseDto {
  @ApiProperty({
    type: Boolean,
    description: "Indicates if the update was successful.",
  })
  success: boolean;
}
