import { Process, Processor } from "@nestjs/bull";
import type { Job } from "bull";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as ngeohash from "ngeohash";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { City } from "../../plan/entities/city.entity";

import { GoogleMapsService } from "../services/google-maps.service";
import { VenueRepository } from "../repositories/venue.repository";
import { ScannedAreaRepository } from "../repositories/scanned-area.repository";
import { VenueTypeRepository } from "../repositories/venue-type.repository";
import { Venue, VenueStatus } from "../entities/venue.entity";
import { VenueType } from "../entities/venue-type.entity";

interface VenueScanJobData {
  geohashPrefix: string;
}

function parseCityAndCountry(components: any[]): {
  cityName: string | null;
  countryCode: string | null;
} {
  let cityName: string | null = null;
  let countryCode: string | null = null;
  for (const component of components) {
    if (component.types.includes("locality")) {
      cityName = component.long_name;
    }
    if (component.types.includes("country")) {
      countryCode = component.short_name;
    }
    if (!cityName && component.types.includes("administrative_area_level_1")) {
      cityName = component.long_name;
    }
    if (cityName && countryCode) break;
  }
  return { cityName, countryCode };
}

@Injectable()
@Processor("venue-scan")
export class VenueScanConsumer {
  private readonly logger = new Logger(VenueScanConsumer.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly googleMapsService: GoogleMapsService,
    private readonly venueRepository: VenueRepository,
    private readonly venueTypeRepository: VenueTypeRepository,
    private readonly scannedAreaRepository: ScannedAreaRepository,
    @Inject("PLAN_SERVICE_RPC") private readonly planClient: ClientProxy,
  ) {}

  @Process({ name: "scan-area", concurrency: 3 })
  async processScanAreaJob(job: Job<VenueScanJobData>): Promise<void> {
    const { geohashPrefix } = job.data;
    const jobId = job.id;
    this.logger.log(
      `[Job ${jobId}] Starting scan for geohash: ${geohashPrefix}`,
    );

    try {
      const radiusMeters = this.configService.get<number>(
        "VENUE_SCAN_RADIUS_METERS",
        1000,
      );
      const { latitude, longitude } = ngeohash.decode(geohashPrefix);
      const googlePlaceTypesToSearch = [
        "bar",
        "night_club",
        "restaurant",
        "cafe",
        "casino",
        "movie_theater",
        "amusement_park",
        "bowling_alley",
      ];
      let totalPlacesProcessed = 0;
      let successfullyUpserted = 0;
      let erroredPlaces = 0;

      for (const googleType of googlePlaceTypesToSearch) {
        this.logger.debug(
          `[Job ${jobId}] Searching Google for type: ${googleType}`,
        );
        const places = await this.googleMapsService.searchNearby(
          latitude,
          longitude,
          radiusMeters,
          googleType,
        );
        this.logger.debug(
          `[Job ${jobId}] Found ${places.length} places for type ${googleType}`,
        );

        totalPlacesProcessed += places.length;

        for (const place of places) {
          let cityId: string | undefined = undefined;
          try {
            if (!place.place_id) {
              this.logger.warn(
                `[Job ${jobId}] Skipping place with no place_id.`,
              );
              continue;
            }

            const placeDetails = await this.googleMapsService.getPlaceDetails(
              place.place_id,
            );
            if (!placeDetails) {
              this.logger.warn(
                `[Job ${jobId}] Failed to get details for place_id: ${place.place_id}. Skipping.`,
              );
              continue;
            }

            const venueTypes = await this.mapGoogleTypesToVenueTypes(
              placeDetails.types || [],
            );
            if (venueTypes.length === 0) {
              this.logger.debug(
                `[Job ${jobId}] Place ${place.place_id} (${placeDetails.name}) did not map to any known venue types. Skipping.`,
              );
              continue;
            }

            try {
              const { cityName, countryCode } = parseCityAndCountry(
                placeDetails.address_components || [],
              );
              if (cityName && countryCode) {
                const rpcPayload = {
                  name: cityName,
                  countryCode: countryCode,
                  location: {
                    type: "Point" as const,
                    coordinates: [
                      placeDetails.geometry.location.lng,
                      placeDetails.geometry.location.lat,
                    ],
                  },
                };
                const cityResult = await firstValueFrom(
                  this.planClient.send<City | null>(
                    "city.findOrCreate",
                    rpcPayload,
                  ),
                ).catch((err) => {
                  this.logger.error(
                    `RPC call 'city.findOrCreate' failed for ${cityName}, ${countryCode}: ${err.message}`,
                    err.stack,
                  );
                  return null;
                });
                if (cityResult) {
                  cityId = cityResult.id;
                  this.logger.debug(
                    `[Job ${jobId}] Resolved city ${cityName} to ID: ${cityId} for venue ${place.place_id}`,
                  );
                } else {
                  this.logger.warn(
                    `[Job ${jobId}] Could not resolve/create city via RPC for venue ${place.place_id} (${cityName}, ${countryCode})`,
                  );
                }
              } else {
                this.logger.warn(
                  `[Job ${jobId}] Could not parse city/country for venue ${place.place_id} from address components.`,
                );
              }
            } catch (cityResolveError) {
              this.logger.error(
                `[Job ${jobId}] Error during city resolution for venue ${place.place_id}: ${cityResolveError.message}`,
                cityResolveError.stack,
              );
            }

            const locationWkt = `POINT(${placeDetails.geometry.location.lng} ${placeDetails.geometry.location.lat})`;
            const venueData: Partial<Venue> = {
              name: placeDetails.name,
              address: placeDetails.formatted_address,
              location: locationWkt,
              cityId: cityId,
              googlePlaceId: placeDetails.place_id,
              googleRating: placeDetails.rating,
              googleRatingsTotal: placeDetails.user_ratings_total,
              priceLevel: placeDetails.price_level,
              website: placeDetails.website,
              phone: placeDetails.formatted_phone_number,
              isOpenNow: placeDetails.opening_hours?.open_now,
              venueTypes: venueTypes,
              lastRefreshed: new Date(),
              status: VenueStatus.PENDING,
            };

            const existingVenue =
              await this.venueRepository.findByGooglePlaceId(place.place_id);
            if (existingVenue) {
              const dataToUpdate = {
                ...venueData,
                status: existingVenue.status,
                adminOverrides: existingVenue.adminOverrides,
                lastModifiedBy: existingVenue.lastModifiedBy,
                lastModifiedAt: existingVenue.lastModifiedAt,
                isFeatured: existingVenue.isFeatured,
                popularity: existingVenue.popularity,
                reviewCount: existingVenue.reviewCount,
                rating: existingVenue.rating,
                viewCount: existingVenue.viewCount,
                followerCount: existingVenue.followerCount,
                associatedPlanCount: existingVenue.associatedPlanCount,
                trendingScore: existingVenue.trendingScore,
                isActive: existingVenue.isActive,
                metadata: existingVenue.metadata,
              };
              await this.venueRepository.update(existingVenue.id, dataToUpdate);
              this.logger.debug(
                `[Job ${jobId}] Updated existing venue: ${venueData.name} (ID: ${existingVenue.id}) - CityID: ${cityId}`,
              );
            } else {
              venueData.status = VenueStatus.PENDING;
              const newVenue = await this.venueRepository.create(venueData);
              this.logger.debug(
                `[Job ${jobId}] Created new venue: ${venueData.name} (ID: ${newVenue.id}) - CityID: ${cityId}`,
              );
            }
            successfullyUpserted++;
          } catch (placeError) {
            erroredPlaces++;
            this.logger.error(
              `[Job ${jobId}] Failed to process place_id ${place?.place_id || "unknown"}: ${placeError.message}`,
              placeError.stack,
            );
          }
        }
      }

      await this.scannedAreaRepository.upsertLastScanned(
        geohashPrefix,
        new Date(),
      );

      this.logger.log(
        `[Job ${jobId}] Completed scan for geohash: ${geohashPrefix}. ` +
          `Total places found: ${totalPlacesProcessed}. ` +
          `Successfully upserted: ${successfullyUpserted}. ` +
          `Errored places: ${erroredPlaces}.`,
      );
    } catch (error) {
      this.logger.error(
        `[Job ${jobId}] CRITICAL ERROR processing scan for geohash ${geohashPrefix}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

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
      return [];
    }

    try {
      return await this.venueTypeRepository.findByNames(
        Array.from(venueTypeNames),
      );
    } catch (error) {
      this.logger.error(
        `Failed to find venue types by names [${Array.from(venueTypeNames).join(", ")}]: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }
}
