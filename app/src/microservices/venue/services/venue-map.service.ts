import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleMapsService } from "./google-maps.service";
import { Venue, VenueStatus } from "../entities/venue.entity";
import { VenueType } from "../entities/venue-type.entity";
import { VenueSearchDto, VenueSortBy } from "../dto/venue-search.dto";
import { VenueTypeRepository } from "../repositories/venue-type.repository";
import { ScannedAreaRepository } from "../repositories/scanned-area.repository";
import { VenueScanProducerService } from "./venue-scan-producer.service";
import {
  VenueRepository,
  VenueSearchOptions,
} from "../repositories/venue.repository";

@Injectable()
export class VenueMapService {
  private readonly logger = new Logger(VenueMapService.name);

  constructor(
    private readonly venueRepository: VenueRepository,
    private readonly venueTypeRepository: VenueTypeRepository,
    private readonly googleMapsService: GoogleMapsService,
    private readonly configService: ConfigService,
    private readonly scannedAreaRepository: ScannedAreaRepository,
    private readonly venueScanProducerService: VenueScanProducerService,
  ) {}

  /**
   * Search venues based on location, radius, and other search criteria
   * Returns results from local DB and asynchronously triggers background scan if area is stale.
   */
  async searchVenues(
    searchDto: VenueSearchDto,
  ): Promise<{ venues: Venue[]; total: number }> {
    // --- START: Add validation for required coordinates ---
    if (searchDto.latitude === undefined || searchDto.longitude === undefined) {
      this.logger.warn(
        "VenueMapService.searchVenues called without required latitude/longitude.",
      );
      // Throwing error now as geo context is expected for this method
      throw new BadRequestException(
        "Latitude and Longitude are required for map search.",
      );
    }
    // --- END: Add validation ---

    let searchResult: { venues: Venue[]; total: number } = {
      venues: [],
      total: 0,
    };
    try {
      // --- Construct options object ---
      const options: VenueSearchOptions = {
        latitude: searchDto.latitude,
        longitude: searchDto.longitude,
        radiusMiles: searchDto.radius,
        query: searchDto.query,
        venueTypeIds: searchDto.venueTypes,
        sortBy: searchDto.sortBy,
        order: searchDto.order,
        openNow: searchDto.openNow,
        priceLevel: searchDto.priceLevel,
        limit: searchDto.limit,
        offset: searchDto.offset,
      };

      // 1. Query local database (now uses PostGIS)
      const [venues, total] = await this.venueRepository.search(options);
      searchResult = { venues, total };

      // 2. Asynchronously trigger background scan if needed (fire-and-forget)
      this.venueScanProducerService
        .enqueueScanIfStale(searchDto.latitude, searchDto.longitude)
        .catch((error) => {
          this.logger.error(
            `Error triggering background scan: ${error.message}`,
            error.stack,
          );
        });

      // 3. Return results from local DB immediately
      return searchResult;
    } catch (error) {
      this.logger.error(
        `Failed to search venues: ${error.message}`,
        error.stack,
      );
      // Return empty on error, but still try to trigger scan if coords available
      if (
        searchDto.latitude !== undefined &&
        searchDto.longitude !== undefined
      ) {
        this.venueScanProducerService
          .enqueueScanIfStale(searchDto.latitude, searchDto.longitude)
          .catch((e) =>
            this.logger.error(
              `Error triggering scan after search failure: ${e.message}`,
              e.stack,
            ),
          );
      }
      return { venues: [], total: 0 }; // Graceful fallback
    }
  }

  /**
   * Geocode an address to coordinates for venue search
   */
  async geocodeAddress(
    address: string,
  ): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const result = await this.googleMapsService.geocodeAddress(address);
      if (result) {
        return {
          latitude: result.latitude,
          longitude: result.longitude,
        };
      }
      return null;
    } catch (error) {
      this.logger.error(
        `Failed to geocode address: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Get venues near a specific location
   * Returns results from local DB and asynchronously triggers background scan if area is stale.
   */
  async getVenuesNearLocation(
    latitude: number,
    longitude: number,
    radius: number = 10,
    limit: number = 20,
  ): Promise<Venue[]> {
    let venuesResult: Venue[] = [];
    try {
      const options: VenueSearchOptions = {
        latitude,
        longitude,
        radiusMiles: radius,
        sortBy: VenueSortBy.DISTANCE,
        order: "ASC",
        limit,
        offset: 0,
      };

      // 1. Query local database
      const [venues] = await this.venueRepository.search(options);
      venuesResult = venues;

      // 2. Asynchronously trigger background scan if needed
      this.venueScanProducerService
        .enqueueScanIfStale(latitude, longitude)
        .catch((error) => {
          this.logger.error(
            `Error triggering background scan: ${error.message}`,
            error.stack,
          );
        });

      // 3. Return results from local DB immediately
      return venuesResult;
    } catch (error) {
      this.logger.error(
        `Failed to get venues near location: ${error.message}`,
        error.stack,
      );
      // Still try to trigger scan if coords available
      this.venueScanProducerService
        .enqueueScanIfStale(latitude, longitude)
        .catch((e) =>
          this.logger.error(
            `Error triggering scan after getVenuesNearLocation failure: ${e.message}`,
            e.stack,
          ),
        );
      return [];
    }
  }

  /**
   * Get all venue types for filtering
   */
  async getVenueTypes(): Promise<VenueType[]> {
    try {
      return await this.venueTypeRepository.findAll();
    } catch (error) {
      this.logger.error(
        `Failed to get venue types: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Import venues from Google Places API based on venue type
   * This is an admin operation to populate venues in a new area
   */
  async importVenuesFromGoogle(
    latitude: number,
    longitude: number,
    radius: number,
    venueType: string,
  ): Promise<number> {
    try {
      const places = await this.googleMapsService.searchNearby(
        latitude,
        longitude,
        radius,
        venueType,
      );

      let importedCount = 0;
      for (const place of places) {
        // Check if venue already exists by place_id
        const existingVenue = await this.venueRepository.findByGooglePlaceId(
          place.place_id,
        );
        if (existingVenue) {
          continue;
        }

        // Get more details about the place
        const placeDetails = await this.googleMapsService.getPlaceDetails(
          place.place_id,
        );
        if (!placeDetails) {
          continue;
        }

        // Find appropriate venue type(s)
        const venueTypes = await this.mapGoogleTypesToVenueTypes(
          placeDetails.types || [],
        );

        // Create new venue
        const venueData: Partial<Venue> = {
          name: placeDetails.name,
          address: placeDetails.formatted_address,
          location: `POINT(${placeDetails.geometry.location.lng} ${placeDetails.geometry.location.lat})`,
          googlePlaceId: placeDetails.place_id,
          googleRating: placeDetails.rating,
          googleRatingsTotal: placeDetails.user_ratings_total,
          priceLevel: placeDetails.price_level,
          website: placeDetails.website,
          phone: placeDetails.formatted_phone_number,
          isOpenNow: placeDetails.opening_hours?.open_now,
          venueTypes: venueTypes,
          status: VenueStatus.PENDING,
        };

        await this.venueRepository.create(venueData);
        importedCount++;
      }

      return importedCount;
    } catch (error) {
      this.logger.error(
        `Failed to import venues from Google: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Map Google place types to our venue types
   */
  private async mapGoogleTypesToVenueTypes(
    googleTypes: string[],
  ): Promise<VenueType[]> {
    const typeMapping: Record<string, string> = {
      bar: "Bar",
      night_club: "Nightclub",
      restaurant: "Restaurant",
      cafe: "Café",
      casino: "Casino",
      movie_theater: "Entertainment",
      amusement_park: "Entertainment",
      bowling_alley: "Entertainment",
    };

    const venueTypeNames = new Set<string>();
    for (const googleType of googleTypes) {
      if (typeMapping[googleType]) {
        venueTypeNames.add(typeMapping[googleType]);
      }
    }

    if (venueTypeNames.size === 0) {
      venueTypeNames.add("Other");
    }

    return await this.venueTypeRepository.findByNames(
      Array.from(venueTypeNames),
    );
  }
}
