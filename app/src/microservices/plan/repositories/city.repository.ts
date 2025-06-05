import { Injectable, Inject, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, UpdateResult, FindManyOptions } from "typeorm";
import { City } from "../entities/city.entity";
import { ClientProxy } from "@nestjs/microservices";
import { v4 as uuidv4 } from "uuid"; // For generating event IDs

// Define Point structure if not using a library
interface Point {
  type: "Point";
  coordinates: number[]; // [longitude, latitude]
}

@Injectable()
export class CityRepository {
  private readonly logger = new Logger(CityRepository.name);

  constructor(
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
    @Inject("PLAN_EVENTS_SERVICE")
    private readonly eventClient: ClientProxy,
  ) {}

  private normalizeInput(input: string): string {
    return input.trim().toLowerCase();
  }

  async findByNameAndCountry(
    name: string,
    countryCode: string,
  ): Promise<City | null> {
    const normalizedName = this.normalizeInput(name);
    const normalizedCountryCode = this.normalizeInput(countryCode);
    return this.cityRepository.findOne({
      where: {
        name: normalizedName, // Assuming name is stored normalized, or use DB functions
        countryCode: normalizedCountryCode,
      },
    });
  }

  async findOrCreateByNameAndCountry(
    name: string,
    countryCode: string,
    location?: Point,
  ): Promise<City> {
    const normalizedName = this.normalizeInput(name);
    const normalizedCountryCode = this.normalizeInput(countryCode);

    let city = await this.cityRepository.findOne({
      where: {
        name: normalizedName,
        countryCode: normalizedCountryCode,
      },
    });

    if (!city) {
      this.logger.log(`City not found, creating: ${name}, ${countryCode}`);
      try {
        const newCityData: Partial<City> = {
          name: normalizedName,
          countryCode: normalizedCountryCode,
          // Convert Point object to WKT string for storage if needed
          // location: location ? `POINT(${location.coordinates[0]} ${location.coordinates[1]})` : undefined,
          location: location as any, // Assuming TypeORM handles Point object directly with PostGIS
        };
        const newCityEntity = this.cityRepository.create(newCityData);
        city = await this.cityRepository.save(newCityEntity);
        this.logger.log(
          `Successfully created city: ${city.name} (ID: ${city.id})`,
        );

        // Emit event only AFTER successful save
        try {
          const eventId = uuidv4();
          this.eventClient.emit("city.created", {
            cityId: city.id,
            name: city.name,
            countryCode: city.countryCode,
            location: city.location,
            eventId: eventId,
          });
          this.logger.log(
            `Emitted city.created event (ID: ${eventId}) for city ${city.id}`,
          );
        } catch (emitError) {
          this.logger.error(
            `Failed to emit city.created event for city ${city.id}: ${emitError.message}`,
            emitError.stack,
          );
          // Do not fail the operation if event emission fails, just log it.
        }
      } catch (error) {
        // Handle potential race condition or other save errors
        if (error.code === "23505") {
          // Unique constraint violation
          this.logger.warn(
            `Race condition likely: City ${name}, ${countryCode} already exists. Refetching.`,
          );
          // Attempt to refetch the city that likely caused the constraint violation
          city = await this.cityRepository.findOne({
            where: { name: normalizedName, countryCode: normalizedCountryCode },
          });
          if (!city) {
            // This case is unlikely but possible; indicates a deeper issue
            this.logger.error(
              `Failed to refetch city after unique constraint error for ${name}, ${countryCode}.`,
            );
            throw new Error(
              `Failed to find or create city: ${name}, ${countryCode}`,
            );
          }
        } else {
          this.logger.error(
            `Failed to create city ${name}, ${countryCode}: ${error.message}`,
            error.stack,
          );
          throw error; // Re-throw other errors
        }
      }
    }
    // Optionally add a property to the returned object if needed downstream, but usually not necessary
    // (city as any).wasCreated = wasCreated;
    return city;
  }

  async findCityByLocation(location: Point): Promise<City | null> {
    // Example using ST_DWithin - requires location to be stored as geometry
    const radiusMeters = 5000; // Example radius: 5km
    return (
      this.cityRepository
        .createQueryBuilder("city")
        .where(
          `ST_DWithin(
          city.location::geography,
          ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
          :radius
        )`,
          {
            lon: location.coordinates[0],
            lat: location.coordinates[1],
            radius: radiusMeters,
          },
        )
        // Order by distance to find the closest city within the radius
        .orderBy(
          `ST_Distance(
          city.location::geography,
          ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
        )`,
          "ASC",
        )
        .getOne()
    ); // Get the closest one
  }

  async incrementPlanCount(
    cityId: string,
    amount: number,
  ): Promise<UpdateResult> {
    return this.cityRepository.increment({ id: cityId }, "planCount", amount);
  }

  async updateTrendingScore(
    cityId: string,
    score: number,
  ): Promise<UpdateResult> {
    return this.cityRepository.update({ id: cityId }, { trendingScore: score });
  }

  async findTrendingCities(limit: number = 5): Promise<City[]> {
    return this.cityRepository.find({
      order: { trendingScore: "DESC" },
      take: limit,
    });
  }

  async updateImageUrl(
    cityId: string,
    imageUrl: string,
  ): Promise<UpdateResult> {
    return this.cityRepository.update({ id: cityId }, { imageUrl: imageUrl });
  }

  // Basic CRUD methods (optional, TypeORM repository has them)
  async findOneById(id: string): Promise<City | null> {
    return this.cityRepository.findOneBy({ id });
  }

  // Add findAll method
  async findAll(options?: FindManyOptions<City>): Promise<City[]> {
    return this.cityRepository.find(options);
  }
}
