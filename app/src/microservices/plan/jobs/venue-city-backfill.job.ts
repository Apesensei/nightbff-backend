import { Injectable, Inject, Logger } from "@nestjs/common";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { GoogleMapsService } from "../../venue/services/google-maps.service"; // Adjust path as needed
import { firstValueFrom } from "rxjs";
import {
  GetVenuesWithoutCityIdResponseDto,
  VENUE_GET_WITHOUT_CITY_ID_PATTERN,
} from "../../venue/dto/venue-backfill.dto";
import { VENUE_UPDATE_CITY_ID_PATTERN } from "../../venue/dto/venue-backfill.dto";
import { FIND_OR_CREATE_CITY_RPC_PATTERN } from "../dto/city-communication.dto"; // Corrected import constant
import { City } from "../entities/city.entity";

@Injectable()
export class VenueCityBackfillJob {
  private readonly logger = new Logger(VenueCityBackfillJob.name);
  private isRunning = false;

  constructor(
    @Inject("VENUE_SERVICE_RPC") private readonly venueClient: ClientProxy,
    @Inject("PLAN_SERVICE_RPC") private readonly planClient: ClientProxy,
    private readonly googleMapsService: GoogleMapsService, // Assumes it's globally available/provided
  ) {}

  async runBackfill(): Promise<{
    processed: number;
    updated: number;
    failed: number;
    skipped: number;
  }> {
    if (this.isRunning) {
      this.logger.warn("Venue city backfill job is already running.");
      throw new Error("Job already in progress");
    }
    this.isRunning = true;
    this.logger.log("Starting venue city backfill job...");

    let offset = 0;
    const limit = 100; // Process in batches of 100
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalFailed = 0;
    let totalSkipped = 0; // Initialize skipped counter
    let keepFetching = true;

    try {
      while (keepFetching) {
        this.logger.debug(`Fetching batch: limit=${limit}, offset=${offset}`);
        let response: GetVenuesWithoutCityIdResponseDto;
        try {
          response = await firstValueFrom(
            this.venueClient.send<GetVenuesWithoutCityIdResponseDto>(
              VENUE_GET_WITHOUT_CITY_ID_PATTERN,
              { limit, offset },
            ),
          );
        } catch (rpcError) {
          this.logger.error(
            `RPC Error fetching venues: ${rpcError.message}`,
            rpcError.stack,
          );
          throw new RpcException(
            `Failed to fetch venues batch: ${rpcError.message}`,
          );
        }

        const venues = response?.venues || [];
        const batchSize = venues.length;
        totalProcessed += batchSize;

        this.logger.log(`Processing batch of ${batchSize} venues...`);

        if (batchSize === 0) {
          keepFetching = false;
          this.logger.log("No more venues found without cityId.");
          continue;
        }

        for (const venue of venues) {
          try {
            // Location Parsing based on TypeORM/PostGIS GeoJSON object
            const locationObject = venue.location as unknown as {
              type?: string;
              coordinates?: number[];
            }; // Type assertion
            if (
              !locationObject ||
              locationObject.type !== "Point" ||
              !Array.isArray(locationObject.coordinates) ||
              locationObject.coordinates.length !== 2
            ) {
              this.logger.warn(
                `Venue ${venue.id} has invalid or missing location object. Skipping.`,
              );
              totalFailed++;
              continue;
            }
            const longitude = locationObject.coordinates[0];
            const latitude = locationObject.coordinates[1];

            // 1. Reverse Geocode
            const geocodeResult = await this.googleMapsService.reverseGeocode(
              latitude,
              longitude,
            );
            if (!geocodeResult) {
              this.logger.warn(
                `Reverse geocode failed for venue ${venue.id} at (${latitude}, ${longitude}). Skipping.`,
              );
              totalFailed++;
              continue;
            }

            // 2. Parse City/Country
            let cityName: string | null = null;
            let countryCode: string | null = null;
            for (const component of geocodeResult.address_components || []) {
              if (component.types.includes("locality"))
                cityName = component.long_name;
              if (component.types.includes("country"))
                countryCode = component.short_name;
              if (
                !cityName &&
                component.types.includes("administrative_area_level_1")
              )
                cityName = component.long_name;
              if (cityName && countryCode) break;
            }

            if (!cityName || !countryCode) {
              this.logger.warn(
                `Could not parse city/country for venue ${venue.id} from geocode result. Skipping.`,
              );
              totalFailed++;
              continue;
            }

            // 3. Find or Create City via RPC (as per TDL)
            let city: City | null = null;
            try {
              city = await firstValueFrom(
                this.planClient.send<City | null>(
                  FIND_OR_CREATE_CITY_RPC_PATTERN,
                  {
                    name: cityName,
                    countryCode: countryCode,
                    location: {
                      type: "Point",
                      coordinates: [longitude, latitude],
                    },
                  },
                ),
              );
            } catch (rpcError) {
              this.logger.error(
                `RPC Error calling city.findOrCreate for venue ${venue.id}: ${rpcError.message}`,
                rpcError.stack,
              );
              totalFailed++;
              continue; // Skip this venue if city creation fails
            }

            if (!city) {
              this.logger.error(
                `city.findOrCreate returned null for venue ${venue.id} (${cityName}, ${countryCode}). Skipping.`,
              );
              totalFailed++;
              continue;
            }

            // 4. Update Venue via RPC
            try {
              const updateResult = await firstValueFrom(
                this.venueClient.send<{ success: boolean }>(
                  VENUE_UPDATE_CITY_ID_PATTERN,
                  {
                    venueId: venue.id,
                    cityId: city.id,
                  },
                ),
              );

              if (updateResult?.success) {
                this.logger.debug(
                  `Successfully updated cityId for venue ${venue.id} to ${city.id}`,
                );
                totalUpdated++;
              } else {
                this.logger.warn(
                  `Failed to update cityId for venue ${venue.id} (RPC returned !success).`,
                );
                totalFailed++; // Increment failed (final step failure)
              }
            } catch (rpcError) {
              this.logger.error(
                `RPC Error calling venue.updateCityId for venue ${venue.id}: ${rpcError.message}`,
                rpcError.stack,
              );
              totalFailed++; // Increment failed (final step failure)
              continue; // Skip this venue if update fails
            }

            // Basic Rate Limiting
            await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay between records
          } catch (error) {
            this.logger.error(
              `Failed to process venue ${venue.id}: ${error.message}`,
              error.stack,
            );
            totalFailed++;
          }
        }

        offset += batchSize;
      }
    } catch (error) {
      this.logger.error(
        `Venue city backfill job failed critically: ${error.message}`,
        error.stack,
      );
      // Re-throw the error to ensure the promise rejects on critical failure
      throw error;
    } finally {
      this.isRunning = false;
      this.logger.log(
        `Venue city backfill job finished. Processed: ${totalProcessed}, Updated: ${totalUpdated}, Failed: ${totalFailed}, Skipped: ${totalSkipped}`,
      );
    }

    return {
      processed: totalProcessed,
      updated: totalUpdated,
      failed: totalFailed,
      skipped: totalSkipped,
    };
  }
}
