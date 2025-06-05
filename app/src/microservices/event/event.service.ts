import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { MessagePattern, Payload, RpcException } from "@nestjs/microservices";
import {
  EventRepository,
  FindEventsOptions,
} from "./repositories/event.repository";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { JoinEventDto } from "./dto/join-event.dto";
import { Event } from "./entities/event.entity";
import { EventAttendee } from "./entities/event-attendee.entity";
import { EventResponseDto } from "./dto/event-response.dto";
import { AttendeeResponseDto } from "./dto/attendee-response.dto";
import { EventVisibility } from "./enums/event-visibility.enum";
import { PlanAnalyticsService } from "./services/plan-analytics.service";
import { PlanTrendingService } from "./services/plan-trending.service";
import { InterestService } from "../interest/services/interest.service";
import {
  GetEventsWithoutCityIdRequestDto,
  GetEventsWithoutCityIdResponseDto,
  UpdateEventCityIdRequestDto,
  UpdateEventCityIdResponseDto,
  EVENT_GET_WITHOUT_CITY_ID_PATTERN,
  EVENT_UPDATE_CITY_ID_PATTERN,
} from "./dto/event-backfill.dto";

// Import TrendingPlansRequestDto
interface TrendingPlansRequestDto {
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  location?: {
    latitude: number;
    longitude: number;
    radiusInKm: number;
  };
}

// Import PaginatedEventResponseDto
interface PaginatedEventResponseDto {
  items: EventResponseDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly planAnalyticsService: PlanAnalyticsService,
    private readonly planTrendingService: PlanTrendingService,
    private readonly interestService: InterestService,
  ) {}

  async create(
    userId: string,
    createEventDto: CreateEventDto,
  ): Promise<EventResponseDto> {
    // Create the event
    const event = await this.eventRepository.create(createEventDto, userId);

    if (event.venueId) {
      this.eventEmitter.emit("plan.associated_with_venue", {
        venueId: event.venueId,
        planId: event.id,
      });
    }

    // Emit event for integration with chat service
    this.eventEmitter.emit("event.created", {
      eventId: event.id,
      title: event.title,
      creatorId: userId,
      visibility: event.visibility,
    });

    // Emit event for notifications
    this.eventEmitter.emit("notification.event.created", {
      eventId: event.id,
      title: event.title,
      creatorId: userId,
    });

    // Transform to DTO
    return this.transformToResponseDto(event, userId);
  }

  async findAll(
    options: FindEventsOptions = {},
    userId: string,
  ): Promise<{ events: EventResponseDto[]; total: number }> {
    this.logger.debug(
      `findAll called with options: ${JSON.stringify(options)} for userId: ${userId}`,
    );
    // Handle visibility filtering based on user
    if (userId) {
      options.visibility = [EventVisibility.PUBLIC];
    } else {
      options.visibility = [EventVisibility.PUBLIC];
    }

    // Clone options to avoid modifying the original object
    const serviceOptions = { ...options }; // Use serviceOptions to avoid confusion with repo options
    let actualInterestId: string | undefined = serviceOptions.interestId; // Store original or resolved ID

    // --- Start: Phase 3 "For You" Logic --- New Block ---
    if (serviceOptions.interestId === "forYou") {
      this.logger.debug(
        `'forYou' interest filter requested for userId: ${userId}`,
      );
      // Guard should prevent userId being missing, but check for robustness
      if (!userId) {
        this.logger.error(
          `'forYou' requested but userId missing unexpectedly! Returning empty.`,
        );
        return { events: [], total: 0 };
      }

      try {
        const userInterests =
          await this.interestService.getUserInterests(userId);
        if (userInterests && userInterests.length > 0) {
          // V1: Use the first interest found
          actualInterestId = userInterests[0].id;
          this.logger.debug(
            `Resolved 'forYou' to interestId: ${actualInterestId} for user ${userId}`,
          );
        } else {
          this.logger.debug(
            `User ${userId} has no interests for 'forYou'. Returning empty.`,
          );
          return { events: [], total: 0 }; // Return empty if user has no interests
        }
      } catch (error) {
        this.logger.error(
          `Error fetching user interests for 'forYou' (userId: ${userId}): ${error.message}`,
          error.stack,
        );
        return { events: [], total: 0 }; // Return empty on error
      }
    }
    // --- End: Phase 3 "For You" Logic ---

    // --- START: Modified Phase 1 Interest Filtering ---
    // Check if we have a resolved interest ID (either original or from 'forYou')
    if (actualInterestId && this.interestService) {
      // ** Important: Set the resolved interest ID in options for the repository **
      serviceOptions.interestId = actualInterestId;

      try {
        this.logger.debug(
          `Fetching event IDs for interestId: ${actualInterestId}`,
        );
        const eventIds =
          await this.interestService.getEventIdsByInterest(actualInterestId);

        if (eventIds.length > 0) {
          serviceOptions.eventIds = eventIds; // Add eventIds to the options passed to repository
        } else {
          // No matching events for this interest, return empty result
          this.logger.debug(
            `No events found for interestId: ${actualInterestId}. Returning empty.`,
          );
          return { events: [], total: 0 };
        }
        // We have eventIds, remove original interestId from options if repo doesn't use it
        // delete serviceOptions.interestId; // Keep this line if repo ONLY uses eventIds
      } catch (error) {
        if (error instanceof NotFoundException) {
          // Interest ID resolved from 'forYou' or provided directly was not found
          this.logger.warn(
            `Interest ID ${actualInterestId} not found. Returning empty results.`,
          );
          return { events: [], total: 0 }; // Return empty if interest not found
        } else {
          // Log other errors from InterestService but return empty
          this.logger.error(
            `Error using InterestService for interest ID ${actualInterestId}: ${error.message}`,
            error.stack,
          );
          return { events: [], total: 0 }; // Return empty on other errors
        }
      }
    }
    // --- END: Modified Phase 1 Interest Filtering ---

    // Call repository with potentially modified options
    const [events, total] = await this.eventRepository.findAll(serviceOptions);

    // Transform to DTOs
    const responseDtos = events.map((event) =>
      this.transformToResponseDto(event, userId),
    );

    return {
      events: responseDtos,
      total,
    };
  }

  async findOne(id: string, userId?: string): Promise<EventResponseDto> {
    const event = await this.eventRepository.findOne(id);

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    // Check visibility permissions
    if (
      event.visibility !== EventVisibility.PUBLIC &&
      (!userId ||
        (event.visibility === EventVisibility.PRIVATE &&
          event.creatorId !== userId))
    ) {
      throw new ForbiddenException(
        "You do not have permission to view this event",
      );
    }

    // Track individual plan view
    this.planAnalyticsService.trackPlanView(id, userId);

    // Increment view count
    await this.eventRepository.incrementViewCount(id);

    // Update trending score asynchronously
    this.planTrendingService
      .updatePlanTrendingScore(id)
      .catch((err) =>
        console.error(`Failed to update trending score for plan ${id}:`, err),
      );

    return this.transformToResponseDto(event, userId);
  }

  async update(
    id: string,
    userId: string,
    updateEventDto: UpdateEventDto,
  ): Promise<EventResponseDto> {
    // Check if event exists
    const originalEvent = await this.eventRepository.findOne(id);
    if (!originalEvent) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    // Check permissions
    if (originalEvent.creatorId !== userId) {
      throw new ForbiddenException(
        "You do not have permission to update this event",
      );
    }

    // Update the event
    const updatedEvent = await this.eventRepository.update(id, updateEventDto);

    const originalVenueId = originalEvent.venueId;
    const newVenueId = updatedEvent.venueId;

    if (originalVenueId !== newVenueId) {
      // Venue was removed or changed
      if (originalVenueId) {
        this.eventEmitter.emit("plan.disassociated_from_venue", {
          venueId: originalVenueId,
          planId: updatedEvent.id,
        });
      }
      // Venue was added or changed
      if (newVenueId) {
        this.eventEmitter.emit("plan.associated_with_venue", {
          venueId: newVenueId,
          planId: updatedEvent.id,
        });
      }
    }

    // Emit event for integration
    this.eventEmitter.emit("event.updated", {
      eventId: updatedEvent.id,
      title: updatedEvent.title,
      creatorId: userId,
    });

    return this.transformToResponseDto(updatedEvent, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    // Check if event exists and get venueId before deletion
    const event = await this.eventRepository.findOne(id);
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    // Check permissions
    if (event.creatorId !== userId) {
      throw new ForbiddenException(
        "You do not have permission to delete this event",
      );
    }

    const venueId = event.venueId; // Store before deleting

    // Delete the event
    await this.eventRepository.remove(id);

    if (venueId) {
      this.eventEmitter.emit("plan.disassociated_from_venue", {
        venueId: venueId,
        planId: id,
      });
    }

    // Emit event for integration
    this.eventEmitter.emit("event.deleted", {
      eventId: id,
      title: event.title,
      creatorId: userId,
    });
  }

  async getAttendees(
    eventId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<{ attendees: AttendeeResponseDto[]; total: number }> {
    // Check if event exists
    const event = await this.eventRepository.findOne(eventId);

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    const [attendees, total] = await this.eventRepository.getAttendees(
      eventId,
      options,
    );

    // Transform to DTOs
    // This is simplified and would need user data from user service
    const responseDtos = attendees.map((attendee) =>
      this.transformToAttendeeResponseDto(attendee),
    );

    return {
      attendees: responseDtos,
      total,
    };
  }

  async joinEvent(
    eventId: string,
    userId: string,
    joinEventDto: JoinEventDto,
  ): Promise<AttendeeResponseDto> {
    // Check if event exists
    const event = await this.eventRepository.findOne(eventId);

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Check if event requires approval
    if (event.requireApproval && event.creatorId !== userId) {
      // Instead of auto-joining, we'd create a pending request
      // For now, we'll just throw an exception
      throw new ForbiddenException(
        "This event requires approval from the creator to join",
      );
    }

    // Check attendee limit
    if (event.attendeeLimit) {
      const attendeeCount =
        await this.eventRepository.getAttendeeCount(eventId);
      if (attendeeCount >= event.attendeeLimit) {
        throw new BadRequestException(
          "This event has reached its attendee limit",
        );
      }
    }

    // Join the event
    const attendee = await this.eventRepository.joinEvent(
      eventId,
      userId,
      joinEventDto,
    );

    // Emit event for integration
    this.eventEmitter.emit("event.joined", {
      eventId,
      userId,
      status: attendee.status,
    });

    // Track join for analytics and trending
    this.planAnalyticsService.trackPlanJoin(eventId, userId);

    // Update trending score asynchronously
    this.planTrendingService
      .updatePlanTrendingScore(eventId)
      .catch((err) =>
        console.error(
          `Failed to update trending score for plan ${eventId}:`,
          err,
        ),
      );

    return this.transformToAttendeeResponseDto(attendee);
  }

  async leaveEvent(eventId: string, userId: string): Promise<void> {
    // Check if event exists
    const event = await this.eventRepository.findOne(eventId);

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Check if user is already an attendee
    const isAttendee = await this.eventRepository.isAttendee(eventId, userId);

    if (!isAttendee) {
      throw new BadRequestException("You are not attending this event");
    }

    // Creator can't leave their own event
    if (event.creatorId === userId) {
      throw new BadRequestException(
        "Event creator cannot leave their own event",
      );
    }

    // Leave the event
    await this.eventRepository.leaveEvent(eventId, userId);

    // Emit event for integration
    this.eventEmitter.emit("event.left", {
      eventId,
      userId,
    });
  }

  async getEventsAttendedByUser(
    userId: string,
    options: FindEventsOptions = {},
  ): Promise<{ events: EventResponseDto[]; total: number }> {
    const [events, total] = await this.eventRepository.getEventsAttendedByUser(
      userId,
      options,
    );

    // Transform to DTOs
    const responseDtos = events.map((event) =>
      this.transformToResponseDto(event, userId),
    );

    return {
      events: responseDtos,
      total,
    };
  }

  // Add method for trending plans
  async getTrendingPlans(
    options: TrendingPlansRequestDto,
    userId?: string,
  ): Promise<PaginatedEventResponseDto> {
    const { limit = 10, offset = 0, location, startDate, endDate } = options;

    // Get trending plans from repository
    const [plans, total] = await this.eventRepository.getTrendingPlans({
      limit,
      offset,
      userId,
      startDate,
      endDate,
      location,
    });

    // Transform to response DTOs
    const items = await Promise.all(
      plans.map((plan) => this.transformToResponseDto(plan, userId)),
    );

    // Note: Removed trackPlanView call with "trending_section" as it's not a valid plan ID
    // Section-level analytics should be tracked differently if needed

    return {
      items,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      hasMore: total > offset + limit,
    };
  }

  // --- START: Add Helper Method for Interest Filtering ---
  /**
   * Finds distinct venue IDs associated with a given list of event IDs.
   * Delegates to the repository method.
   * Used by VenueService for interest-based venue filtering.
   */
  async getVenueIdsForEvents(eventIds: string[]): Promise<string[]> {
    if (!eventIds || eventIds.length === 0) {
      return [];
    }
    this.logger.debug(`Fetching venue IDs for ${eventIds.length} event IDs.`);
    const venueIds =
      await this.eventRepository.findVenueIdsByEventIds(eventIds);
    this.logger.debug(`Found ${venueIds.length} distinct venue IDs.`);
    return venueIds;
  }
  // --- END: Add Helper Method ---

  private transformToResponseDto(
    event: Event,
    currentUserId?: string,
  ): EventResponseDto {
    // This would ideally fetch creator and venue information from respective services
    // For now, we'll use a simplified version
    const dto = new EventResponseDto({
      ...event,
      creatorName: "User Name", // Would be fetched from user service
      venueName: event.venueId ? "Venue Name" : undefined, // Would be fetched from venue service
      attendeeCount: event.attendees?.length || 0,
      isAttending: currentUserId
        ? event.attendees?.some((a) => a.userId === currentUserId) || false
        : false,
    });

    return dto;
  }

  private transformToAttendeeResponseDto(
    attendee: EventAttendee,
  ): AttendeeResponseDto {
    // This would ideally fetch user information from user service
    // For now, we'll use a simplified version
    return new AttendeeResponseDto({
      ...attendee,
      userName: "User Name", // Would be fetched from user service
      userProfileImage: "https://example.com/profile.jpg", // Would be fetched from user service
    });
  }

  async getAttendeeCount(eventId: string): Promise<number> {
    return this.eventRepository.getAttendeeCount(eventId);
  }

  // --- Backfill RPC Handlers/Service Methods ---

  @MessagePattern(EVENT_GET_WITHOUT_CITY_ID_PATTERN)
  async handleGetEventsWithoutCityId(
    @Payload() payload: GetEventsWithoutCityIdRequestDto,
  ): Promise<GetEventsWithoutCityIdResponseDto> {
    this.logger.debug(
      `RPC Handler: Received ${EVENT_GET_WITHOUT_CITY_ID_PATTERN} with payload: ${JSON.stringify(payload)}`,
    );
    try {
      const [events, total] = await this.findEventsWithoutCityId(
        payload.limit ?? 100, // Use default
        payload.offset ?? 0, // Use default
      );
      // Note: The event objects might contain more data than needed (e.g., Venue relation)
      // Consider mapping to a leaner DTO if performance becomes an issue.
      return { events, total };
    } catch (error) {
      this.logger.error(
        `RPC Error in ${EVENT_GET_WITHOUT_CITY_ID_PATTERN}: ${error.message}`,
        error.stack,
      );
      throw new RpcException(
        error.message || "Failed to fetch events without cityId",
      );
    }
  }

  @MessagePattern(EVENT_UPDATE_CITY_ID_PATTERN)
  async handleUpdateEventCityId(
    @Payload() payload: UpdateEventCityIdRequestDto,
  ): Promise<UpdateEventCityIdResponseDto> {
    this.logger.debug(
      `RPC Handler: Received ${EVENT_UPDATE_CITY_ID_PATTERN} for event ${payload.eventId}`,
    );
    try {
      const success = await this.updateEventCityId(
        payload.eventId,
        payload.cityId,
      );
      return { success };
    } catch (error) {
      this.logger.error(
        `RPC Error in ${EVENT_UPDATE_CITY_ID_PATTERN} for event ${payload.eventId}: ${error.message}`,
        error.stack,
      );
      throw new RpcException(
        error.message || `Failed to update cityId for event ${payload.eventId}`,
      );
    }
  }

  /**
   * Service method to find events without cityId.
   * @param limit - Batch size.
   * @param offset - Skip count.
   * @returns Events and total count.
   */
  async findEventsWithoutCityId(
    limit: number,
    offset: number,
  ): Promise<[Event[], number]> {
    this.logger.debug(
      `Fetching events without cityId, limit: ${limit}, offset: ${offset}`,
    );
    try {
      return await this.eventRepository.findWithoutCityId(limit, offset);
    } catch (error) {
      this.logger.error(
        `Error fetching events without cityId: ${error.message}`,
        error.stack,
      );
      // Let the RPC handler manage throwing RpcException
      throw error;
    }
  }

  /**
   * Service method to update cityId for an event.
   * @param eventId - ID of the event.
   * @param cityId - ID of the city.
   * @returns Boolean indicating success.
   */
  async updateEventCityId(eventId: string, cityId: string): Promise<boolean> {
    this.logger.debug(`Updating cityId for event ${eventId} to ${cityId}`);
    try {
      const result = await this.eventRepository.updateCityId(eventId, cityId);
      if (result.affected === 0) {
        this.logger.warn(`Event ${eventId} not found or cityId not updated.`);
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(
        `Error updating cityId for event ${eventId}: ${error.message}`,
        error.stack,
      );
      // Let the RPC handler manage throwing RpcException
      throw error;
    }
  }

  // --- End Backfill RPC Handlers/Service Methods ---
}
