import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
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
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly planAnalyticsService: PlanAnalyticsService,
    private readonly planTrendingService: PlanTrendingService,
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
    userId?: string,
  ): Promise<{ events: EventResponseDto[]; total: number }> {
    // Handle visibility filtering based on user
    if (userId) {
      // For authenticated users, show public, friends (if friends), and private (if own)
      // This is simplified and would need to be extended with friend relationship checking
      options.visibility = [EventVisibility.PUBLIC];
    } else {
      // For unauthenticated users, show only public events
      options.visibility = [EventVisibility.PUBLIC];
    }

    const [events, total] = await this.eventRepository.findAll(options);

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

    // Track this view for analytics (batch tracking)
    if (plans.length > 0 && userId) {
      this.planAnalyticsService.trackPlanView("trending_section", userId);
    }

    return {
      items,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      hasMore: total > offset + limit,
    };
  }

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
}
