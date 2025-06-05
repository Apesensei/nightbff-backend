import { ApiProperty } from "@nestjs/swagger";
import { City } from "../entities/city.entity"; // Import base entity

// DTO for trending cities list items
export class TrendingCityDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  countryCode: string;

  @ApiProperty({ required: false, nullable: true })
  imageUrl?: string;

  @ApiProperty({ required: false, nullable: true })
  flagEmoji?: string;

  // Constructor to map from entity
  constructor(city: City) {
    this.id = city.id;
    this.name = city.name;
    this.countryCode = city.countryCode;
    this.imageUrl = city.imageUrl;
    this.flagEmoji = city.flagEmoji;
  }
}

// DTO for detailed city view
export class CityDetailsDto extends City {
  // Inherits all properties from City entity
  // Add aggregated properties here later if needed
  // e.g., @ApiProperty({ type: () => [PlanSummaryDto], required: false })
  // recentPlans?: PlanSummaryDto[];

  // Constructor can simply call super or be omitted if no extra logic needed initially
  constructor(city: City) {
    super();
    Object.assign(this, city);
    // Add mapping for aggregated properties here later
  }
}
