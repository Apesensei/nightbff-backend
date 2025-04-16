import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThanOrEqual, MoreThanOrEqual } from "typeorm";
import { VenueHour, DayOfWeek } from "../entities/venue-hour.entity";

@Injectable()
export class VenueHourRepository {
  constructor(
    @InjectRepository(VenueHour)
    private readonly hourRepository: Repository<VenueHour>,
  ) {}

  async findById(id: string): Promise<VenueHour> {
    const hour = await this.hourRepository.findOne({
      where: { id },
      relations: ["venue"],
    });

    if (!hour) {
      throw new NotFoundException(`Venue hour with ID ${id} not found`);
    }

    return hour;
  }

  async findByVenueId(venueId: string): Promise<VenueHour[]> {
    return this.hourRepository.find({
      where: { venueId },
      order: {
        dayOfWeek: "ASC",
      },
    });
  }

  async create(hourData: Partial<VenueHour>): Promise<VenueHour> {
    const hour = this.hourRepository.create(hourData);
    return this.hourRepository.save(hour);
  }

  async createBulk(
    venueId: string,
    hoursData: Partial<VenueHour>[],
  ): Promise<VenueHour[]> {
    const hours = hoursData.map((hourData) =>
      this.hourRepository.create({
        ...hourData,
        venueId,
      }),
    );

    return this.hourRepository.save(hours);
  }

  async update(id: string, hourData: Partial<VenueHour>): Promise<VenueHour> {
    const hour = await this.findById(id);

    Object.assign(hour, hourData);

    return this.hourRepository.save(hour);
  }

  async updateByVenueId(
    venueId: string,
    hoursData: Partial<VenueHour>[],
  ): Promise<void> {
    // Delete existing hours for the venue
    await this.hourRepository.delete({ venueId });

    // Create new hours
    await this.createBulk(venueId, hoursData);
  }

  async delete(id: string): Promise<void> {
    const hour = await this.findById(id);
    await this.hourRepository.remove(hour);
  }

  async deleteByVenueId(venueId: string): Promise<void> {
    await this.hourRepository.delete({ venueId });
  }

  async isOpenNow(venueId: string): Promise<boolean> {
    const now = new Date();
    const dayNum = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Convert JavaScript day number to our DayOfWeek enum
    const dayOfWeekMap: Record<number, DayOfWeek> = {
      0: DayOfWeek.SUNDAY,
      1: DayOfWeek.MONDAY,
      2: DayOfWeek.TUESDAY,
      3: DayOfWeek.WEDNESDAY,
      4: DayOfWeek.THURSDAY,
      5: DayOfWeek.FRIDAY,
      6: DayOfWeek.SATURDAY,
    };

    const dayOfWeek = dayOfWeekMap[dayNum];

    // Format time as HH:MM:SS for comparison with time column
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const currentTime = `${hours}:${minutes}:00`;

    const openHour = await this.hourRepository.findOne({
      where: {
        venueId,
        dayOfWeek,
        openTime: LessThanOrEqual(currentTime),
        closeTime: MoreThanOrEqual(currentTime),
        isClosed: false,
      },
    });

    // Also check for venues open 24 hours
    if (!openHour) {
      const open24Hours = await this.hourRepository.findOne({
        where: {
          venueId,
          dayOfWeek,
          isOpen24Hours: true,
          isClosed: false,
        },
      });

      return !!open24Hours;
    }

    return true;
  }
}
