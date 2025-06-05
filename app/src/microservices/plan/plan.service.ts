import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { PlanRepository } from "@/microservices/plan/repositories/plan.repository";
import { CityRepository } from "@/microservices/plan/repositories/city.repository";
import { PlanUserRepository } from "@/microservices/plan/repositories/plan-user.repository";
import { GoogleMapsService } from "@/microservices/venue/services/google-maps.service";
import { Plan } from "@/microservices/plan/entities/plan.entity";
import { City } from "@/microservices/plan/entities/city.entity";
import { ConfigService } from "@nestjs/config";
import { v4 as uuidv4 } from "uuid";

// Define necessary DTOs (or import if they exist elsewhere)
interface CreatePlanDto {
  destination: string;
  startDate: Date;
  endDate?: Date;
  coverImage?: string;
  // Add other fields user can provide during creation
}

interface UpdatePlanDto {
  // Define fields that can be updated
  startDate?: Date;
  endDate?: Date;
  coverImage?: string;
}

@Injectable()
export class PlanService {
  private readonly logger = new Logger(PlanService.name);

  constructor(
    private readonly planRepository: PlanRepository,
    private readonly cityRepository: CityRepository,
    private readonly planUserRepository: PlanUserRepository,
    // Assuming GoogleMapsService is provided globally or in a shared module
    private readonly googleMapsService: GoogleMapsService,
    @Inject("PLAN_EVENTS_SERVICE") private readonly eventClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  // --- Core Plan CRUD --- //

  async createPlan(userId: string, dto: CreatePlanDto): Promise<Plan> {
    this.logger.log(
      `User ${userId} creating plan for destination: ${dto.destination}`,
    );

    // 1. Resolve City (using internal helper)
    const city = await this._resolveCity(dto.destination);
    if (!city) {
      // Should not happen if _resolveCity throws correctly, but defensive check
      throw new BadRequestException("Failed to resolve destination city.");
    }
    this.logger.debug(
      `Resolved destination to city: ${city.name} (ID: ${city.id})`,
    );

    // 2. Prepare Plan Data
    const planData: Partial<Plan> = {
      creatorId: userId,
      cityId: city.id,
      startDate: dto.startDate,
      endDate: dto.endDate,
      coverImage: dto.coverImage,
      // Set defaults for counts if not handled by DB default
      saveCount: 0,
      viewCount: 0,
    };

    // 3. Save Plan
    let newPlan: Plan;
    try {
      newPlan = await this.planRepository.create(planData);
      this.logger.log(`Plan created successfully with ID: ${newPlan.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to save new plan: ${error.message}`,
        error.stack,
      );
      throw new Error("Failed to create plan."); // Or more specific internal error
    }

    // 4. Emit Event (fire-and-forget, log errors)
    try {
      const eventId = uuidv4();
      this.eventClient.emit("plan.created", {
        planId: newPlan.id,
        cityId: city.id,
        creatorId: userId,
        startDate: newPlan.startDate,
        endDate: newPlan.endDate,
        // Include venueId if/when added during creation
        eventId: eventId,
      });
      this.logger.log(
        `Emitted plan.created event (ID: ${eventId}) for plan ${newPlan.id}`,
      );
    } catch (emitError) {
      this.logger.error(
        `Failed to emit plan.created event for plan ${newPlan.id}: ${emitError.message}`,
        emitError.stack,
      );
    }

    // 5. Return created plan (with eager loaded city)
    // Refetch might be necessary if create doesn't return relations correctly
    const createdPlanWithCity = await this.planRepository.findOneById(
      newPlan.id,
      { relations: ["city"] },
    );
    if (!createdPlanWithCity) {
      this.logger.error(
        `Failed to refetch created plan ${newPlan.id} with city relation.`,
      );
      // Return the basic plan object as fallback
      return newPlan;
    }
    return createdPlanWithCity;
  }

  async getPlanById(planId: string): Promise<Plan> {
    const plan = await this.planRepository.findOneById(planId, {
      relations: ["city"],
    });
    if (!plan) {
      throw new NotFoundException(`Plan with ID ${planId} not found.`);
    }
    // Increment view count asynchronously (fire-and-forget event)
    this._emitSimplePlanEvent("plan.viewed", plan.id, plan.cityId);
    return plan;
  }

  async updatePlan(
    planId: string,
    userId: string,
    dto: UpdatePlanDto,
  ): Promise<Plan> {
    const plan = await this.planRepository.findOneById(planId);
    if (!plan) {
      throw new NotFoundException(`Plan with ID ${planId} not found.`);
    }
    // Add authorization check: Ensure userId matches plan.creatorId
    if (plan.creatorId !== userId) {
      throw new ForbiddenException(
        "You are not authorized to update this plan.",
      );
    }

    try {
      await this.planRepository.update(planId, dto);
      this.logger.log(`Plan ${planId} updated successfully by user ${userId}.`);
      // Emit event?
      // this._emitSimplePlanEvent('plan.updated', plan.id, plan.cityId, userId);
      return await this.getPlanById(planId); // Refetch to return updated data
    } catch (error) {
      this.logger.error(
        `Failed to update plan ${planId}: ${error.message}`,
        error.stack,
      );
      throw new Error("Failed to update plan.");
    }
  }

  async deletePlan(planId: string, userId: string): Promise<void> {
    const plan = await this.planRepository.findOneById(planId);
    if (!plan) {
      throw new NotFoundException(`Plan with ID ${planId} not found.`);
    }
    // Add authorization check: Ensure userId matches plan.creatorId
    if (plan.creatorId !== userId) {
      throw new ForbiddenException(
        "You are not authorized to delete this plan.",
      );
    }

    const deleteResult = await this.planRepository.delete(planId);

    if (deleteResult.affected === 0) {
      this.logger.warn(
        `Delete operation failed for plan ${planId}, possibly already deleted.`,
      );
      throw new NotFoundException(
        `Plan with ID ${planId} could not be deleted.`,
      );
    }

    this.logger.log(`Plan ${planId} deleted successfully by user ${userId}.`);

    // Emit event (fire-and-forget, log errors)
    this._emitSimplePlanEvent("plan.deleted", plan.id, plan.cityId, userId);
  }

  // --- Plan User Actions (Save/Unsave) --- //

  async savePlanForUser(planId: string, userId: string): Promise<void> {
    const planExists = await this.planRepository.findOneById(planId);
    if (!planExists) {
      throw new NotFoundException(`Plan with ID ${planId} not found.`);
    }

    const savedRelation = await this.planUserRepository.savePlan(
      planId,
      userId,
    );

    // If savePlan didn't throw Conflict and returned a newly created record (check based on impl)
    // Increment save count asynchronously via event
    // This logic depends on how savePlan indicates a *new* save vs just returning existing
    // Assuming savePlan returns the record, we might check createdAt time or add a flag
    // For simplicity, let's assume we emit event for now, listener should be idempotent
    if (savedRelation) {
      // Basic check, refine based on savePlan behavior
      await this.planRepository.incrementSaveCount(planId, 1); // Consider direct increment for now
      // Or emit event for eventual consistency:
      // this._emitSimplePlanEvent('plan.saved', planId, planExists.cityId, userId);
    }
  }

  async unsavePlanForUser(planId: string, userId: string): Promise<void> {
    this.logger.log(`User ${userId} unsaving plan ${planId}`);
    // Ensure plan exists before attempting to unsave
    const plan = await this.planRepository.findOneById(planId);
    if (!plan) {
      this.logger.warn(
        `User ${userId} tried to unsave non-existent plan ${planId}`,
      );
      throw new NotFoundException(`Plan with ID ${planId} not found.`);
    }

    // Proceed with unsaving
    try {
      const deleteResult = await this.planUserRepository.unsavePlan(
        planId,
        userId,
      );

      // If deletion was successful, decrement count
      if (deleteResult.affected && deleteResult.affected > 0) {
        await this.planRepository.incrementSaveCount(planId, -1); // Consider direct decrement for now
        // Or emit event:
        // this._emitSimplePlanEvent('plan.unsaved', planId, planExists.cityId, userId);
      }
    } catch (error) {
      this.logger.error(
        `Failed to unsave plan ${planId}: ${error.message}`,
        error.stack,
      );
      throw new Error("Failed to unsave plan.");
    }
  }

  // --- Helper Methods --- //

  private async _resolveCity(destination: string): Promise<City> {
    this.logger.debug(`Resolving destination: \"${destination}\"`);
    // Simple parsing: assume "City" or "City, CountryCode/Name"
    // const parts = destination.split(",").map((p) => p.trim()); // Removed unused variable
    // const potentialCityName = parts[0]; // Removed unused variable
    // const potentialCountry = parts[1]; // Removed unused variable

    // TODO: Improve parsing - handle more complex inputs, maybe use a library?
    // For now, try finding by name only if country isn't obvious

    // Always use Geocoding for now
    this.logger.debug(`Attempting geocoding for \"${destination}\"`);
    const geocodeResult =
      await this.googleMapsService.geocodeAddress(destination);

    if (!geocodeResult || !geocodeResult.address_components) {
      this.logger.warn(
        `Geocoding failed or returned no components for destination: \"${destination}\"`,
      );
      throw new BadRequestException(
        `Could not resolve destination city: \"${destination}\".`,
      );
    }

    // Simplified Parsing Logic
    let cityName: string | null = null;
    let countryCode: string | null = null;

    for (const component of geocodeResult.address_components) {
      if (component.types.includes("locality")) {
        cityName = component.long_name;
      }
      if (component.types.includes("country")) {
        countryCode = component.short_name; // Use short code (e.g., US, GB, JP)
      }
      // Fallback to administrative area if locality not found
      if (
        !cityName &&
        component.types.includes("administrative_area_level_1")
      ) {
        cityName = component.long_name;
      }
      // Break if both found
      if (cityName && countryCode) break;
    }

    if (!cityName || !countryCode) {
      this.logger.warn(
        `Could not extract city name or country code from geocoding result for: \"${destination}\"`,
      );
      throw new BadRequestException(
        `Could not resolve city/country for destination: \"${destination}\".`,
      );
    }

    this.logger.debug(
      `Geocoding parsed: City=${cityName}, Country=${countryCode}`,
    );

    // Find or Create in DB
    try {
      const locationData = {
        type: "Point" as const,
        coordinates: [geocodeResult.longitude, geocodeResult.latitude],
      };
      const city = await this.cityRepository.findOrCreateByNameAndCountry(
        cityName,
        countryCode,
        locationData,
      );
      return city;
    } catch (error) {
      this.logger.error(
        `Failed during findOrCreate for ${cityName}, ${countryCode}: ${error.message}`,
        error.stack,
      );
      // If findOrCreate fails, we cannot proceed
      throw new Error("Failed to save city information.");
    }
  }

  private _emitSimplePlanEvent(
    eventName: string,
    planId: string,
    cityId: string,
    userId?: string,
  ): void {
    try {
      const eventId = uuidv4();
      const payload: any = { planId, cityId, eventId };
      if (userId) payload.userId = userId;

      this.eventClient.emit(eventName, payload);
      this.logger.log(
        `Emitted ${eventName} event (ID: ${eventId}) for plan ${planId}`,
      );
    } catch (emitError) {
      this.logger.error(
        `Failed to emit ${eventName} event for plan ${planId}: ${emitError.message}`,
        emitError.stack,
      );
    }
  }
}
