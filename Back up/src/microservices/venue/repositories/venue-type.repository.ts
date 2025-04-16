import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { VenueType } from "../entities/venue-type.entity";

@Injectable()
export class VenueTypeRepository {
  constructor(
    @InjectRepository(VenueType)
    private readonly venueTypeRepository: Repository<VenueType>,
  ) {}

  async findAll(): Promise<VenueType[]> {
    return this.venueTypeRepository.find({
      order: {
        name: "ASC",
      },
    });
  }

  async findById(id: string): Promise<VenueType> {
    const venueType = await this.venueTypeRepository.findOne({
      where: { id },
    });

    if (!venueType) {
      throw new NotFoundException(`Venue type with ID ${id} not found`);
    }

    return venueType;
  }

  async findByIds(ids: string[]): Promise<VenueType[]> {
    return this.venueTypeRepository.find({
      where: {
        id: In(ids),
      },
    });
  }

  async findByNames(names: string[]): Promise<VenueType[]> {
    if (!names || names.length === 0) {
      return [];
    }
    return this.venueTypeRepository.find({
      where: {
        name: In(names),
      },
    });
  }

  async create(venueTypeData: Partial<VenueType>): Promise<VenueType> {
    const venueType = this.venueTypeRepository.create(venueTypeData);
    return this.venueTypeRepository.save(venueType);
  }

  async update(
    id: string,
    venueTypeData: Partial<VenueType>,
  ): Promise<VenueType> {
    const venueType = await this.findById(id);

    Object.assign(venueType, venueTypeData);

    return this.venueTypeRepository.save(venueType);
  }

  async delete(id: string): Promise<void> {
    const venueType = await this.findById(id);
    await this.venueTypeRepository.remove(venueType);
  }
}
