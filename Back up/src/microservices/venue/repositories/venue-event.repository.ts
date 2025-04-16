import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { VenueEvent, EventStatus } from "../entities/venue-event.entity";

@Injectable()
export class VenueEventRepository {
  constructor(
    @InjectRepository(VenueEvent)
    private readonly eventRepository: Repository<VenueEvent>,
  ) {}

  async findById(id: string): Promise<VenueEvent> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ["venue"],
    });

    if (!event) {
      throw new NotFoundException(`Venue event with ID ${id} not found`);
    }

    return event;
  }

  async findByVenueId(venueId: string): Promise<VenueEvent[]> {
    return this.eventRepository.find({
      where: { venueId },
      order: {
        startTime: "ASC",
      },
    });
  }

  async findUpcoming(limit: number = 10): Promise<VenueEvent[]> {
    const now = new Date();

    return this.eventRepository.find({
      where: {
        startTime: Between(
          now,
          new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        ), // Next 7 days
        status: EventStatus.SCHEDULED,
      },
      relations: ["venue"],
      take: limit,
      order: {
        startTime: "ASC",
      },
    });
  }

  async findFeatured(limit: number = 5): Promise<VenueEvent[]> {
    const now = new Date();

    return this.eventRepository.find({
      where: {
        isFeatured: true,
        startTime: Between(
          now,
          new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        ), // Next 30 days
        status: EventStatus.SCHEDULED,
      },
      relations: ["venue"],
      take: limit,
      order: {
        startTime: "ASC",
      },
    });
  }

  async create(eventData: Partial<VenueEvent>): Promise<VenueEvent> {
    const event = this.eventRepository.create(eventData);
    return this.eventRepository.save(event);
  }

  async update(
    id: string,
    eventData: Partial<VenueEvent>,
  ): Promise<VenueEvent> {
    const event = await this.findById(id);

    Object.assign(event, eventData);

    return this.eventRepository.save(event);
  }

  async delete(id: string): Promise<void> {
    const event = await this.findById(id);
    await this.eventRepository.remove(event);
  }

  async countByVenueId(venueId: string): Promise<number> {
    return this.eventRepository.count({
      where: { venueId },
    });
  }

  async updateStatus(id: string, status: EventStatus): Promise<VenueEvent> {
    const event = await this.findById(id);

    event.status = status;

    return this.eventRepository.save(event);
  }
}
