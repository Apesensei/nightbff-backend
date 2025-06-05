import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, IsNull, UpdateResult } from "typeorm";
import { Event } from "../entities/event.entity";
import { EventAttendee } from "../entities/event-attendee.entity";
import { EventAttendeeStatus } from "../enums/event-attendee-status.enum";
import { CreateEventDto } from "../dto/create-event.dto";
import { UpdateEventDto } from "../dto/update-event.dto";
import { JoinEventDto } from "../dto/join-event.dto";

export interface FindEventsOptions {
  creatorId?: string;
  venueId?: string;
  title?: string;
  startTimeFrom?: Date;
  startTimeTo?: Date;
  visibility?: string[];
  attendeeId?: string;
  limit?: number;
  offset?: number;
  cursor?: string;
  orderBy?: "startTime" | "createdAt" | "distance";
  order?: "ASC" | "DESC";
  location?: {
    latitude: number;
    longitude: number;
    radiusInKm: number;
  };
  interestId?: string;
  eventIds?: string[];
}

@Injectable()
export class EventRepository {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(EventAttendee)
    private readonly attendeeRepository: Repository<EventAttendee>,
  ) {}

  async create(
    createEventDto: CreateEventDto,
    creatorId: string,
  ): Promise<Event> {
    const event = this.eventRepository.create({
      ...createEventDto,
      creatorId,
    });

    await this.eventRepository.save(event);

    // Add creator as a going attendee automatically
    const attendee = this.attendeeRepository.create({
      eventId: event.id,
      userId: creatorId,
      status: EventAttendeeStatus.GOING,
    });

    await this.attendeeRepository.save(attendee);

    const savedEvent = await this.findOne(event.id);
    if (!savedEvent) {
      throw new Error("Failed to retrieve created event");
    }
    return savedEvent;
  }

  async findAll(options: FindEventsOptions = {}): Promise<[Event[], number]> {
    const {
      creatorId,
      venueId,
      title,
      startTimeFrom,
      startTimeTo,
      visibility,
      attendeeId,
      limit = 10,
      offset = 0,
      cursor,
      orderBy = "startTime",
      order = "DESC",
    } = options;

    const queryBuilder = this.eventRepository.createQueryBuilder("event");

    // Apply basic filters
    if (creatorId) {
      queryBuilder.andWhere("event.creatorId = :creatorId", { creatorId });
    }

    if (venueId) {
      queryBuilder.andWhere("event.venueId = :venueId", { venueId });
    }

    if (title) {
      queryBuilder.andWhere("event.title ILIKE :title", {
        title: `%${title}%`,
      });
    }

    if (startTimeFrom) {
      queryBuilder.andWhere("event.startTime >= :startTimeFrom", {
        startTimeFrom,
      });
    }

    if (startTimeTo) {
      queryBuilder.andWhere("event.startTime <= :startTimeTo", { startTimeTo });
    }

    if (visibility && visibility.length > 0) {
      queryBuilder.andWhere("event.visibility IN (:...visibility)", {
        visibility,
      });
    }

    // Add the interest-based filter if eventIds are provided
    if (options.eventIds && options.eventIds.length > 0) {
      queryBuilder.andWhere("event.id IN (:...eventIds)", {
        eventIds: options.eventIds,
      });
    }

    // Handle cursor-based pagination
    if (cursor) {
      const cursorEvent = await this.eventRepository.findOne({
        where: { id: cursor },
      });
      if (cursorEvent) {
        const columnName = `event.${orderBy === "distance" ? "startTime" : orderBy}`;
        const cursorValue =
          cursorEvent[orderBy === "distance" ? "startTime" : orderBy];
        const operator = order === "DESC" ? "<" : ">";

        queryBuilder.andWhere(`${columnName} ${operator} :cursorValue`, {
          cursorValue,
        });
      }
    }

    // Handle events a specific user is attending
    if (attendeeId) {
      queryBuilder.innerJoin(
        "event.attendees",
        "attendee",
        "attendee.userId = :attendeeId",
        { attendeeId },
      );
    }

    // Handle location-based filtering if provided
    if (options.location) {
      const { latitude, longitude, radiusInKm } = options.location;

      // Add venue relation when using location filtering
      queryBuilder.innerJoin("event.venue", "venue");

      // Using PostGIS for geospatial queries
      queryBuilder.andWhere(
        `
        ST_DWithin(
          geography(ST_SetSRID(ST_MakePoint(venue.longitude, venue.latitude), 4326)),
          geography(ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)),
          :distance
        )
      `,
        {
          latitude,
          longitude,
          distance: radiusInKm * 1000, // Convert km to meters
        },
      );

      // Add distance calculation as a simple string
      queryBuilder.addSelect(
        `ST_Distance(
          geography(ST_SetSRID(ST_MakePoint(venue.longitude, venue.latitude), 4326)),
          geography(ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326))
        )`,
        "distance",
      );

      // Set params separately
      queryBuilder.setParameter("latitude", latitude);
      queryBuilder.setParameter("longitude", longitude);

      // Optional: Order by distance
      if (orderBy === "distance") {
        queryBuilder.orderBy("distance", order);
      } else {
        queryBuilder.orderBy(`event.${orderBy}`, order);
      }
    } else {
      // Regular ordering if not by distance
      queryBuilder.orderBy(
        `event.${orderBy === "distance" ? "startTime" : orderBy}`,
        order,
      );
    }

    // Add limit and offset for pagination
    queryBuilder.take(limit);
    queryBuilder.skip(offset);

    // Load relations
    queryBuilder.leftJoinAndSelect("event.attendees", "eventAttendees");

    // Execute query
    const [events, total] = await queryBuilder.getManyAndCount();

    // Add distance to each event if location was used
    if (options.location) {
      events.forEach((event) => {
        // Type assertion might be needed if distance is added via addSelect
        // event.distance = (event as any).distance;
      });
    }

    return [events, total];
  }

  async findOne(id: string): Promise<Event | null> {
    // Find one and include relevant relations
    return this.eventRepository.findOne({
      where: { id },
      relations: ["attendees"],
    });
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    await this.eventRepository.update(id, updateEventDto);
    const updatedEvent = await this.findOne(id);
    if (!updatedEvent) {
      throw new Error("Failed to retrieve updated event");
    }
    return updatedEvent;
  }

  async remove(id: string): Promise<void> {
    await this.eventRepository.delete(id);
  }

  async getAttendees(
    eventId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<[EventAttendee[], number]> {
    const { limit = 10, offset = 0 } = options;

    return this.attendeeRepository.findAndCount({
      where: { eventId },
      take: limit,
      skip: offset,
      order: { joinedAt: "DESC" },
    });
  }

  async joinEvent(
    eventId: string,
    userId: string,
    joinEventDto: JoinEventDto,
  ): Promise<EventAttendee> {
    // Check if already an attendee
    let attendee = await this.attendeeRepository.findOne({
      where: { eventId, userId },
    });

    if (attendee) {
      // Update existing attendance
      attendee.status = joinEventDto.status;
      return this.attendeeRepository.save(attendee);
    } else {
      // Create new attendance
      attendee = this.attendeeRepository.create({
        eventId,
        userId,
        status: joinEventDto.status,
      });
      return this.attendeeRepository.save(attendee);
    }
  }

  async leaveEvent(eventId: string, userId: string): Promise<void> {
    await this.attendeeRepository.delete({ eventId, userId });
  }

  async isAttendee(eventId: string, userId: string): Promise<boolean> {
    const count = await this.attendeeRepository.count({
      where: { eventId, userId },
    });
    return count > 0;
  }

  async getAttendeeCount(eventId: string): Promise<number> {
    return this.attendeeRepository.count({
      where: { eventId },
    });
  }

  async getEventsAttendedByUser(
    userId: string,
    options: FindEventsOptions = {},
  ): Promise<[Event[], number]> {
    return this.findAll({
      ...options,
      attendeeId: userId,
    });
  }

  /**
   * Increment the view count for an event
   */
  async incrementViewCount(id: string): Promise<void> {
    await this.eventRepository.increment({ id }, "viewCount", 1);
  }

  /**
   * Update the trending score for an event
   */
  async updateTrendingScore(id: string, score: number): Promise<void> {
    await this.eventRepository.update(id, { trendingScore: score });
  }

  /**
   * Get trending plans with optional filters
   */
  async getTrendingPlans(
    options: {
      limit?: number;
      offset?: number;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
      location?: {
        latitude: number;
        longitude: number;
        radiusInKm: number;
      };
    } = {},
  ): Promise<[Event[], number]> {
    const {
      limit = 10,
      offset = 0,
      userId,
      startDate,
      endDate,
      location,
    } = options;

    const queryBuilder = this.eventRepository
      .createQueryBuilder("event")
      .leftJoinAndSelect("event.attendees", "attendee")
      .where("event.startTime > :now", { now: new Date() })
      .orderBy("event.trendingScore", "DESC")
      .take(limit)
      .skip(offset);

    // Add date range filtering if provided
    if (startDate) {
      queryBuilder.andWhere("event.startTime >= :startDate", { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere("event.startTime <= :endDate", { endDate });
    }

    // Add location-based filtering if provided
    if (location) {
      const { latitude, longitude, radiusInKm } = location;

      // Add venue join when using location filtering
      queryBuilder.innerJoin("event.venue", "venue");

      // Using PostGIS for geospatial queries if your database supports it
      queryBuilder.andWhere(
        `
        ST_DWithin(
          geography(ST_SetSRID(ST_MakePoint(venue.longitude, venue.latitude), 4326)),
          geography(ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)),
          :distance
        )
      `,
        {
          latitude,
          longitude,
          distance: radiusInKm * 1000, // Convert km to meters
        },
      );
    }

    // Note: Removed the problematic subquery for isAttending to fix UUID parsing errors
    // This functionality can be added back with a separate query if needed

    return queryBuilder.getManyAndCount();
  }

  /**
   * Fetches specific fields for multiple events by their IDs.
   * Required for venue filtering by interest (service-layer sorting).
   */
  async findByIdsWithDetails(
    eventIds: string[],
    fields: (keyof Event)[] = ["id", "venueId", "trendingScore"],
  ): Promise<Event[]> {
    if (!eventIds || eventIds.length === 0) {
      return [];
    }
    const selectFields: (keyof Event)[] = Array.from(
      new Set(["id", ...fields]),
    );

    return this.eventRepository.find({
      where: { id: In(eventIds) },
      select: selectFields,
    });
  }

  /**
   * Finds distinct venue IDs associated with a given list of event IDs.
   */
  async findVenueIdsByEventIds(eventIds: string[]): Promise<string[]> {
    if (!eventIds || eventIds.length === 0) {
      return [];
    }
    const results = await this.eventRepository
      .createQueryBuilder("event")
      .select("DISTINCT event.venueId", "venueId")
      .where("event.id IN (:...eventIds)", { eventIds })
      .andWhere("event.venueId IS NOT NULL")
      .getRawMany<{ venueId: string }>();
    return results.map((result) => result.venueId);
  }

  // --- Backfill Methods ---

  /**
   * Finds events that do not have a cityId, with pagination.
   * @param limit - Number of records per batch
   * @param offset - Number of records to skip
   * @returns Tuple containing an array of events and the total count matching the criteria.
   */
  async findWithoutCityId(
    limit: number,
    offset: number,
  ): Promise<[Event[], number]> {
    return this.eventRepository.findAndCount({
      where: {
        cityId: IsNull(),
      },
      select: ["id", "venueId"], // Only select necessary fields for backfill (event needs venueId)
      order: { createdAt: "ASC" }, // Process older events first
      take: limit,
      skip: offset,
      relations: ["venue"], // Need venue to get location for reverse geocode
    });
  }

  /**
   * Updates the cityId for a specific event.
   * @param eventId - The ID of the event to update.
   * @param cityId - The ID of the city to associate.
   * @returns TypeORM UpdateResult.
   */
  async updateCityId(eventId: string, cityId: string): Promise<UpdateResult> {
    return this.eventRepository.update({ id: eventId }, { cityId: cityId });
  }

  // --- End Backfill Methods ---
}
