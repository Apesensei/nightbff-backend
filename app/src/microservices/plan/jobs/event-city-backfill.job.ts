import { Injectable, Inject, Logger } from "@nestjs/common";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { GoogleMapsService } from "../../venue/services/google-maps.service"; // Adjust path
import { firstValueFrom } from "rxjs";
import {
  GetEventsWithoutCityIdResponseDto,
  EVENT_GET_WITHOUT_CITY_ID_PATTERN,
} from "../../event/dto/event-backfill.dto";
import { EVENT_UPDATE_CITY_ID_PATTERN } from "../../event/dto/event-backfill.dto";
import { FIND_OR_CREATE_CITY_RPC_PATTERN } from "../dto/city-communication.dto";
import { City } from "../entities/city.entity";
import { Event } from "../../event/entities/event.entity"; // Import Event entity
import { Venue } from "../../venue/entities/venue.entity"; // Import Venue entity

@Injectable()
export class EventCityBackfillJob {
  private readonly logger = new Logger(EventCityBackfillJob.name);
  private isRunning = false;

  constructor(
    @Inject("EVENT_SERVICE_RPC") private readonly eventClient: ClientProxy,
    @Inject("PLAN_SERVICE_RPC") private readonly planClient: ClientProxy,
    private readonly googleMapsService: GoogleMapsService,
  ) {}

  async runBackfill(): Promise<{
    processed: number;
    updated: number;
    failed: number;
    skipped: number;
  }> {
    if (this.isRunning) {
      this.logger.warn("Event city backfill job is already running.");
      throw new Error("Job already in progress");
    }
    this.isRunning = true;
    this.logger.log("Starting event city backfill job...");

    let offset = 0;
    const limit = 100;
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalFailed = 0;
    let totalSkipped = 0; // Track events skipped due to missing venue or venue location
    let keepFetching = true;

    try {
      while (keepFetching) {
        this.logger.debug(`Fetching batch: limit=${limit}, offset=${offset}`);
        let response: GetEventsWithoutCityIdResponseDto;
        try {
          response = await firstValueFrom(
            this.eventClient.send<GetEventsWithoutCityIdResponseDto>(
              EVENT_GET_WITHOUT_CITY_ID_PATTERN,
              { limit, offset },
            ),
          );
        } catch (rpcError) {
          this.logger.error(
            `RPC Error fetching events: ${rpcError.message}`,
            rpcError.stack,
          );
          throw new RpcException(
            `Failed to fetch events batch: ${rpcError.message}`,
          );
        }

        const events = response?.events || [];
        const batchSize = events.length;
        totalProcessed += batchSize;

        this.logger.log(`Processing batch of ${batchSize} events...`);

        if (batchSize === 0) {
          keepFetching = false;
          this.logger.log("No more events found without cityId.");
          continue;
        }

        for (const event of events) {
          try {
            // Event repository fetches venue relation
            const venue = (event as Event & { venue?: Venue }).venue;
            if (!venue) {
              this.logger.warn(
                `Event ${event.id} has no associated venue. Skipping.`,
              );
              totalSkipped++;
              continue;
            }

            // Location Parsing based on TypeORM/PostGIS GeoJSON object
            const locationObject = venue.location as unknown as {
              type?: string;
              coordinates?: number[];
            };
            if (
              !locationObject ||
              locationObject.type !== "Point" ||
              !Array.isArray(locationObject.coordinates) ||
              locationObject.coordinates.length !== 2
            ) {
              this.logger.warn(
                `Event ${event.id}'s venue ${venue.id} has invalid or missing location object. Skipping.`,
              );
              totalSkipped++;
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
                `Reverse geocode failed for event ${event.id} (venue ${venue.id} at ${latitude}, ${longitude}). Skipping.`,
              );
              totalSkipped++;
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
                `Could not parse city/country for event ${event.id} (venue ${venue.id}) from geocode. Skipping.`,
              );
              totalSkipped++;
              continue;
            }

            // 3. Find or Create City via RPC
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
                `RPC Error calling city.findOrCreate for event ${event.id}: ${rpcError.message}`,
                rpcError.stack,
              );
              totalSkipped++;
              continue;
            }

            if (!city) {
              this.logger.error(
                `city.findOrCreate returned null for event ${event.id} (${cityName}, ${countryCode}). Skipping.`,
              );
              totalSkipped++;
              continue;
            }

            // 4. Update Event via RPC
            try {
              const updateResult = await firstValueFrom(
                this.eventClient.send<{ success: boolean }>(
                  EVENT_UPDATE_CITY_ID_PATTERN,
                  {
                    eventId: event.id,
                    cityId: city.id,
                  },
                ),
              );

              if (updateResult?.success) {
                this.logger.debug(
                  `Successfully updated cityId for event ${event.id} to ${city.id}`,
                );
                totalUpdated++;
              } else {
                this.logger.warn(
                  `Failed to update cityId for event ${event.id} (RPC returned !success).`,
                );
                totalFailed++;
              }
            } catch (rpcError) {
              this.logger.error(
                `RPC Error calling event.updateCityId for event ${event.id}: ${rpcError.message}`,
                rpcError.stack,
              );
              totalFailed++;
              continue;
            }

            // Basic Rate Limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error) {
            this.logger.error(
              `Failed to process event ${event.id}: ${error.message}`,
              error.stack,
            );
            // An unexpected error during processing should count as failed, not skipped
            totalFailed++;
          }
        }

        offset += batchSize;
      }
    } catch (error) {
      this.logger.error(
        `Event city backfill job failed critically: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      this.isRunning = false;
      this.logger.log(
        `Event city backfill job finished. Processed: ${totalProcessed}, Updated: ${totalUpdated}, Failed: ${totalFailed}, Skipped: ${totalSkipped}`,
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
