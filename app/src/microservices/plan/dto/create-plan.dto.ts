import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  MinLength,
} from "class-validator";

export class CreatePlanDto {
  @ApiProperty({
    description:
      "The destination of the plan (e.g., city name, address, or Google Place ID)",
    example: "New York City",
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  destination: string;

  @ApiProperty({
    description: "The start date of the plan (YYYY-MM-DD format)",
    example: "2024-12-20",
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string; // Will be cast to Date by service/entity

  @ApiProperty({
    description: "The optional end date of the plan (YYYY-MM-DD format)",
    example: "2024-12-25",
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string; // Will be cast to Date by service/entity

  @ApiProperty({
    description: "Optional URL for the plan's cover image",
    example: "https://example.com/images/plan_cover.jpg",
    required: false,
  })
  @IsString()
  @IsOptional()
  coverImage?: string;
}
