import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ngeohash from 'ngeohash';

import { GoogleMapsService } from '../services/google-maps.service';
import { VenueRepository } from '../repositories/venue.repository';
import { ScannedAreaRepository } from '../repositories/scanned-area.repository';
import { VenueTypeRepository } from '../repositories/venue-type.repository'; // Needed for mapping types
import { Venue, VenueStatus } from '../entities/venue.entity';
import { VenueType } from '../entities/venue-type.entity';

interface VenueScanJobData {
  geohashPrefix: string;
}

@Processor('venue-scan') // Name matches the queue registered in VenueModule
export class VenueScanConsumer {
  private readonly logger = new Logger(VenueScanConsumer.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly googleMapsService: GoogleMapsService,
    private readonly venueRepository: VenueRepository,
    private readonly venueTypeRepository: VenueTypeRepository, // Inject for type mapping
    private readonly scannedAreaRepository: ScannedAreaRepository,
  ) {}

  @Process({ name: 'scan-area', concurrency: 3 }) // Match job name from producer, set concurrency
  async processScanAreaJob(job: Job<VenueScanJobData>): Promise<void> {
    const { geohashPrefix } = job.data;
    const jobId = job.id;
    this.logger.log(`[Job ${jobId}] Starting scan for geohash: ${geohashPrefix}`);

    try {
      // 1. Get Configuration
      const radiusMeters = this.configService.get<number>('VENUE_SCAN_RADIUS_METERS', 1000);
      this.logger.debug(`[Job ${jobId}] Using search radius: ${radiusMeters}m`);

      // 2. Decode Geohash to get center point
      const { latitude, longitude } = ngeohash.decode(geohashPrefix);
      this.logger.debug(`[Job ${jobId}] Decoded coordinates: Lat=${latitude}, Lon=${longitude}`);

      // 3. Search Google Maps API (using all relevant Google types for broad discovery)
      // We map to our types *after* getting details.
      // TODO: Consider making the list of Google types configurable?
      const googlePlaceTypesToSearch = ['bar', 'night_club', 'restaurant', 'cafe', 'casino', 'movie_theater', 'amusement_park', 'bowling_alley']; 
      let totalPlacesProcessed = 0;
      let successfullyUpserted = 0;
      let erroredPlaces = 0;

      // Assuming searchNearby handles pagination or we process only the first page for now
      // This could be expanded to handle pagination from Google if needed.
      for (const googleType of googlePlaceTypesToSearch) {
        this.logger.debug(`[Job ${jobId}] Searching Google for type: ${googleType}`);
        const places = await this.googleMapsService.searchNearby(
            latitude,
            longitude,
            radiusMeters,
            googleType
        );
        this.logger.debug(`[Job ${jobId}] Found ${places.length} places for type ${googleType}`);

        totalPlacesProcessed += places.length;

        // 4. Process each place found
        for (const place of places) {
          try {
            if (!place.place_id) {
              this.logger.warn(`[Job ${jobId}] Skipping place with no place_id.`);
              continue;
            }

            // 5. Get Place Details
            const placeDetails = await this.googleMapsService.getPlaceDetails(place.place_id);
            if (!placeDetails) {
              this.logger.warn(`[Job ${jobId}] Failed to get details for place_id: ${place.place_id}. Skipping.`);
              continue;
            }

            // 6. Map Google Types to Internal Venue Types
            const venueTypes = await this.mapGoogleTypesToVenueTypes(placeDetails.types || []);
            if (venueTypes.length === 0) {
                 this.logger.debug(`[Job ${jobId}] Place ${place.place_id} (${placeDetails.name}) did not map to any known venue types. Skipping.`);
                 continue; // Skip if it doesn't match any relevant type for us
            }

            // 7. Prepare Venue Data for Upsert
            const locationWkt = `POINT(${placeDetails.geometry.location.lng} ${placeDetails.geometry.location.lat})`;
            const venueData: Partial<Venue> = {
              name: placeDetails.name,
              address: placeDetails.formatted_address,
              location: locationWkt,
              googlePlaceId: placeDetails.place_id,
              googleRating: placeDetails.rating,
              googleRatingsTotal: placeDetails.user_ratings_total,
              priceLevel: placeDetails.price_level,
              website: placeDetails.website,
              phone: placeDetails.formatted_phone_number,
              isOpenNow: placeDetails.opening_hours?.open_now,
              venueTypes: venueTypes, // Use the mapped types
              lastRefreshed: new Date(), // Mark when this data was fetched
              // Keep status PENDING unless explicitly set otherwise
              status: VenueStatus.PENDING, 
            };

            // 8. Upsert Venue (Create or Update)
            const existingVenue = await this.venueRepository.findByGooglePlaceId(place.place_id);
            if (existingVenue) {
              // Preserve existing fields not sourced from Google (like status, adminOverrides etc.)
              // Only update fields obtained from Google + lastRefreshed
              // Consider using refreshGoogleData method if it handles overrides correctly
              await this.venueRepository.update(existingVenue.id, {
                ...venueData, // Apply new Google data
                status: existingVenue.status, // Keep existing status
                adminOverrides: existingVenue.adminOverrides, // Keep existing overrides
                lastModifiedBy: existingVenue.lastModifiedBy, // Keep audit fields
                lastModifiedAt: existingVenue.lastModifiedAt, // Keep audit fields
                isFeatured: existingVenue.isFeatured, // Keep existing flags
                popularity: existingVenue.popularity, // Don't overwrite calculated fields
                reviewCount: existingVenue.reviewCount,
                rating: existingVenue.rating, // Keep our calculated rating
                // etc. for other non-Google fields
              });
              this.logger.debug(`[Job ${jobId}] Updated existing venue: ${venueData.name} (ID: ${existingVenue.id})`);
            } else {
              // Set initial status for new venues
              venueData.status = VenueStatus.PENDING;
              const newVenue = await this.venueRepository.create(venueData);
              this.logger.debug(`[Job ${jobId}] Created new venue: ${venueData.name} (ID: ${newVenue.id})`);
            }
            successfullyUpserted++;
          } catch (placeError) {
            erroredPlaces++;
            // CRITICAL: Log error for the specific place but continue the loop
            this.logger.error(
              `[Job ${jobId}] Failed to process place_id ${place?.place_id || 'unknown'}: ${placeError.message}`,
              placeError.stack,
            );
          }
        } // End loop for places within a type
      } // End loop for Google types

      // 9. Update Scanned Area Timestamp (AFTER successful processing)
      await this.scannedAreaRepository.upsertLastScanned(geohashPrefix, new Date());

      this.logger.log(
          `[Job ${jobId}] Completed scan for geohash: ${geohashPrefix}. ` +
          `Total places found: ${totalPlacesProcessed}. ` +
          `Successfully upserted: ${successfullyUpserted}. ` +
          `Errored places: ${erroredPlaces}.`
      );

    } catch (error) {
      this.logger.error(
        `[Job ${jobId}] CRITICAL ERROR processing scan for geohash ${geohashPrefix}: ${error.message}`,
        error.stack,
      );
      // Re-throw the error to make BullMQ mark the job as failed
      throw error;
    }
  }

  /**
   * Helper to map Google place types to our internal VenueType entities.
   * Replicated from VenueMapService - consider moving to a shared utility/service.
   */
  private async mapGoogleTypesToVenueTypes(googleTypes: string[]): Promise<VenueType[]> {
      const typeMapping: Record<string, string> = {
        bar: "Bar",
        night_club: "Nightclub",
        restaurant: "Restaurant",
        cafe: "Café",
        casino: "Casino",
        movie_theater: "Entertainment",
        amusement_park: "Entertainment",
        bowling_alley: "Entertainment",
        // Add more mappings as needed
      };
  
      const venueTypeNames = new Set<string>();
      for (const googleType of googleTypes) {
        if (typeMapping[googleType]) {
          venueTypeNames.add(typeMapping[googleType]);
        }
      }
  
      // If no specific types matched, don't assign "Other" automatically.
      // Let the venue be untyped or handle "Other" explicitly if desired.
      // if (venueTypeNames.size === 0) {
      //   venueTypeNames.add("Other");
      // }
  
      if (venueTypeNames.size === 0) {
          return []; // Return empty if no relevant types match
      }
      
      try {
           return await this.venueTypeRepository.findByNames(Array.from(venueTypeNames));
      } catch (error) {
          this.logger.error(`Failed to find venue types by names [${Array.from(venueTypeNames).join(', ')}]: ${error.message}`, error.stack);
          return []; // Return empty on error
      }
    }

} 