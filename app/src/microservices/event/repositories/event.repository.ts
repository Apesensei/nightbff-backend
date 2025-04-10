import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
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

    return queryBuilder.getManyAndCount();
  }

  async findOne(id: string): Promise<Event | null> {
    return this.eventRepository.findOne({
      where: { id },
      relations: ["attendees"],
    });
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    await this.eventRepository.update(id, updateEventDto);
    const updatedEvent = await this.findOne(id);
    if (!updatedEvent) {
      throw new Error(`Event with ID ${id} not found after update`);
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

    // Add a subquery to determine if the user is attending if userId provided
    if (userId) {
      queryBuilder.addSelect((subQuery) => {
        return subQuery
          .select("COUNT(ua.id)")
          .from("event_attendee", "ua")
          .where("ua.eventId = event.id")
          .andWhere("ua.userId = :userId", { userId });
      }, "isAttending");
    }

    return queryBuilder.getManyAndCount();
  }
}
