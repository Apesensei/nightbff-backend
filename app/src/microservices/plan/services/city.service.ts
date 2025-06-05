import { Injectable, Logger } from "@nestjs/common";
import { MessagePattern, Payload, RpcException } from "@nestjs/microservices";
import { CityRepository } from "../repositories/city.repository";
import { City } from "../entities/city.entity";

// Interface for the RPC payload
interface FindOrCreateCityPayload {
  name: string;
  countryCode: string;
  location?: {
    // Match Point structure used elsewhere
    type: "Point";
    coordinates: number[]; // [longitude, latitude]
  };
}

@Injectable()
export class CityService {
  private readonly logger = new Logger(CityService.name);

  constructor(
    private readonly cityRepository: CityRepository,
    // Inject event client ONLY if this service needs to emit (e.g., for trending calculation later)
    // @Inject('PLAN_EVENTS_SERVICE') private readonly eventClient: ClientProxy,
  ) {}

  /**
   * Handles RPC requests for finding or creating a city.
   * Called by other services (e.g., VenueScanConsumer, EventService).
   */
  @MessagePattern("city.findOrCreate")
  async handleFindOrCreateCity(
    @Payload() data: FindOrCreateCityPayload,
  ): Promise<City | null> {
    this.logger.debug(
      `RPC call received: city.findOrCreate for ${data.name}, ${data.countryCode}`,
    );
    try {
      // Basic validation
      if (!data.name || !data.countryCode) {
        throw new Error("Missing required fields: name and countryCode");
      }

      // Call the repository method which handles find/create and event emission
      const city = await this.cityRepository.findOrCreateByNameAndCountry(
        data.name,
        data.countryCode,
        data.location,
      );
      return city; // Repository returns the found or created city
    } catch (error) {
      this.logger.error(
        `Error handling city.findOrCreate RPC for ${data.name}, ${data.countryCode}: ${error.message}`,
        error.stack,
      );
      // Throw an RpcException so the calling service knows the request failed
      throw new RpcException(`Failed to find or create city: ${error.message}`);
    }
  }

  // --- Add Listener Logic Here or in a separate CityEventListenerService --- //
  // Example structure if placed here:
  /*
  @EventPattern('plan.created')
  async handlePlanCreated(@Payload() data: { cityId: string, eventId: string }) {
     // Add idempotency check using data.eventId
     this.logger.debug(`Received plan.created event for city ${data.cityId}`);
     try {
        await this.cityRepository.incrementPlanCount(data.cityId, 1);
     } catch (error) {
        this.logger.error(`Failed to increment plan count for city ${data.cityId}`, error.stack);
     }
  }

  @EventPattern('plan.deleted')
  async handlePlanDeleted(@Payload() data: { cityId: string, eventId: string }) {
      // Add idempotency check using data.eventId
      this.logger.debug(`Received plan.deleted event for city ${data.cityId}`);
      try {
          await this.cityRepository.incrementPlanCount(data.cityId, -1);
      } catch (error) {
          this.logger.error(`Failed to decrement plan count for city ${data.cityId}`, error.stack);
      }
  }
  */

  // Method for calculating trending scores (to be called by scheduled job)
  async calculateAndSaveTrendingScore(cityId: string): Promise<void> {
    // Placeholder: Implement actual scoring logic based on planCount, views, etc.
    const city = await this.cityRepository.findOneById(cityId);
    if (city) {
      const score = city.planCount; // Very basic score for now
      await this.cityRepository.updateTrendingScore(cityId, score);
    }
  }
}
