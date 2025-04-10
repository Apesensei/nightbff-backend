import { ApiProperty } from "@nestjs/swagger";
import { Venue } from "../entities/venue.entity";

export class AdminVenueResponseDto {
  @ApiProperty({ description: "Venue ID" })
  id: string;

  @ApiProperty({ description: "Venue name" })
  name: string;

  @ApiProperty({ description: "Venue description" })
  description: string;

  @ApiProperty({ description: "Venue address" })
  address: string;

  @ApiProperty({ description: "Venue city" })
  city: string;

  @ApiProperty({ description: "Venue state" })
  state: string;

  @ApiProperty({ description: "Venue postal code" })
  postalCode: string;

  @ApiProperty({ description: "Venue country" })
  country: string;

  @ApiProperty({ description: "Venue website URL" })
  websiteUrl: string;

  @ApiProperty({ description: "Venue phone number" })
  phoneNumber: string;

  @ApiProperty({ description: "Venue latitude" })
  latitude: number;

  @ApiProperty({ description: "Venue longitude" })
  longitude: number;

  @ApiProperty({ description: "Venue rating (average review score)" })
  rating: number;

  @ApiProperty({ description: "Number of reviews" })
  reviewCount: number;

  @ApiProperty({ description: "Whether venue is verified by admin" })
  isVerified: boolean;

  @ApiProperty({ description: "Whether venue is featured" })
  isFeatured: boolean;

  @ApiProperty({ description: "Venue types" })
  venueTypes: string[];

  @ApiProperty({ description: "Venue amenities" })
  amenities: string[];

  @ApiProperty({ description: "When the venue was created" })
  createdAt: Date;

  @ApiProperty({ description: "When the venue was last updated" })
  updatedAt: Date;

  @ApiProperty({ description: "Google Place ID if imported from Google" })
  googlePlaceId: string;

  @ApiProperty({ description: "Fields that have been overridden by admin" })
  adminOverrides: Record<string, any>;

  @ApiProperty({ description: "Admin who last modified venue" })
  lastModifiedBy: string;

  @ApiProperty({ description: "When admin last modified venue" })
  lastModifiedAt: Date;

  @ApiProperty({ description: "Admin notes (not visible to users)" })
  adminNotes: string;

  constructor(venue: Venue) {
    Object.assign(this, venue);
  }
}
