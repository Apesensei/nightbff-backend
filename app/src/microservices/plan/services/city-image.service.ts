import { Injectable, Logger } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { CityRepository } from "../repositories/city.repository";
import { GoogleMapsService } from "../../venue/services/google-maps.service"; // Adjust path
import Redis from "ioredis"; // Import ioredis for idempotency
import { ConfigService } from "@nestjs/config";
import { Inject } from "@nestjs/common"; // Import Inject

interface CityCreatedPayload {
  cityId: string;
  name: string;
  countryCode?: string; // Add if available from repo event
  location?: any; // Add if available from repo event
  eventId: string; // For idempotency
}

@Injectable()
export class CityImageService {
  private readonly logger = new Logger(CityImageService.name);
  private readonly IDEMPOTENCY_LOCK_TTL_MS = 60000; // 60 seconds

  constructor(
    private readonly cityRepository: CityRepository,
    private readonly googleMapsService: GoogleMapsService,
    private readonly configService: ConfigService,
    @Inject("REDIS_CLIENT") private readonly redis: Redis,
  ) {
    // Remove instance creation and error listener setup from constructor
    // Ensure the injected client handles errors appropriately where it's provided
  }

  @EventPattern("city.created")
  async handleCityCreated(@Payload() data: CityCreatedPayload): Promise<void> {
    const lockKey = `lock:event:city.created:${data.eventId}`;
    let lockAcquired = false;
    this.logger.debug(
      `Received city.created event for city ${data.cityId} (Event ID: ${data.eventId})`,
    );

    try {
      // 1. Idempotency Check
      const setResult = await this.redis.set(
        lockKey,
        "locked",
        "PX",
        this.IDEMPOTENCY_LOCK_TTL_MS,
        "NX",
      );
      if (setResult !== "OK") {
        this.logger.warn(
          `Duplicate city.created event detected for event ID: ${data.eventId}. Skipping.`,
        );
        return;
      }
      lockAcquired = true;
      this.logger.debug(`Acquired lock for event ${data.eventId}`);

      // Check if image already exists (optional optimization)
      const city = await this.cityRepository.findOneById(data.cityId);
      if (!city) {
        this.logger.error(`City ${data.cityId} not found, cannot fetch image.`);
        return; // Or throw error?
      }
      if (city.imageUrl) {
        this.logger.log(
          `City ${data.cityId} already has an image URL. Skipping fetch.`,
        );
        return;
      }

      // 2. Get Place ID (using geocode as findPlaceFromText might be more complex)
      const placeQuery = `${data.name}, ${data.countryCode || ""}`.trim();
      this.logger.debug(
        `Attempting to find Place ID for query: \"${placeQuery}\"`,
      );
      const geocodeResult =
        await this.googleMapsService.geocodeAddress(placeQuery);
      const placeId = geocodeResult?.placeId;

      if (!placeId) {
        this.logger.warn(
          `Could not find Place ID for city: ${data.name} (${data.cityId}). Cannot fetch image.`,
        );
        return;
      }
      this.logger.debug(`Found Place ID: ${placeId} for city: ${data.name}`);

      // 3. Get Place Details (Photos)
      const placeDetails =
        await this.googleMapsService.getPlaceDetails(placeId); // Assumes getPlaceDetails requests photos

      if (
        !placeDetails ||
        !placeDetails.photos ||
        placeDetails.photos.length === 0
      ) {
        this.logger.warn(
          `No photos found in Place Details for Place ID: ${placeId} (City: ${data.name})`,
        );
        return;
      }

      // 4. Get Photo URL
      const photoReference = placeDetails.photos[0].photo_reference;
      const imageUrl = this.googleMapsService.getPhotoUrl(photoReference, 800); // Request 800px width
      this.logger.debug(
        `Generated image URL for city ${data.cityId}: ${imageUrl}`,
      );

      // 5. Update DB
      await this.cityRepository.updateImageUrl(data.cityId, imageUrl);
      this.logger.log(`Successfully updated image URL for city ${data.cityId}`);
    } catch (error) {
      this.logger.error(
        `Error handling city.created event for city ${data.cityId} (Event ID: ${data.eventId}): ${error.message}`,
        error.stack,
      );
      // Do not release lock on unexpected errors that might warrant a retry (depends on strategy)
      // For now, lock will expire via TTL.
      // Consider implementing more robust retry/DLQ logic if needed.
    } finally {
      // 6. Release Lock (only if acquired and processing is complete or failed non-transiently)
      if (lockAcquired) {
        try {
          await this.redis.del(lockKey);
          this.logger.debug(`Released lock for event ${data.eventId}`);
        } catch (delError) {
          this.logger.error(
            `Failed to release lock for event ${data.eventId}: ${delError.message}`,
            delError.stack,
          );
        }
      }
    }
  }
}
