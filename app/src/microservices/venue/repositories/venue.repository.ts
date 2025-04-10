import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Repository,
  In,
  Between,
  Not,
  IsNull,
  MoreThan,
  FindOptionsWhere,
} from "typeorm";
import { Venue } from "../entities/venue.entity";
import { VenueType } from "../entities/venue-type.entity";
import { VenueSortBy } from "../dto/venue-search.dto";

@Injectable()
export class VenueRepository {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
  ) {}

  async findById(id: string): Promise<Venue> {
    const venue = await this.venueRepository.findOne({
      where: { id },
      relations: ["venueTypes", "venueHours", "venuePhotos"],
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    return venue;
  }

  async findByIds(ids: string[]): Promise<Venue[]> {
    return this.venueRepository.find({
      where: {
        id: In(ids),
      },
      relations: ["venueTypes"],
    });
  }

  async findByGooglePlaceId(googlePlaceId: string): Promise<Venue | null> {
    return this.venueRepository.findOne({
      where: { googlePlaceId },
    });
  }

  async search(
    latitude: number,
    longitude: number,
    radiusMiles: number = 10,
    query?: string,
    venueTypeIds?: string[],
    sortBy?: VenueSortBy,
    openNow?: boolean,
    priceLevel?: number,
    limit: number = 20,
    offset: number = 0,
  ): Promise<[Venue[], number]> {
    try {
      // Convert miles to degrees (approximate)
      // 1 degree of latitude = ~69 miles, 1 degree of longitude = ~55 miles (at middle latitudes)
      const latDelta = radiusMiles / 69;
      const lngDelta = radiusMiles / 55;

      const queryBuilder = this.venueRepository
        .createQueryBuilder("venue")
        .leftJoinAndSelect("venue.venueTypes", "venueType")
        .leftJoinAndSelect("venue.venueHours", "venueHour")
        .leftJoinAndSelect(
          "venue.venuePhotos",
          "venuePhoto",
          "venuePhoto.isPrimary = true",
        )
        .where("venue.latitude BETWEEN :minLat AND :maxLat", {
          minLat: latitude - latDelta,
          maxLat: latitude + latDelta,
        })
        .andWhere("venue.longitude BETWEEN :minLng AND :maxLng", {
          minLng: longitude - lngDelta,
          maxLng: longitude + lngDelta,
        })
        // Add Haversine formula to calculate exact distance
        .addSelect(
          `(
          6371 * acos(
            cos(radians(:latitude)) * 
            cos(radians(venue.latitude)) * 
            cos(radians(venue.longitude) - radians(:longitude)) + 
            sin(radians(:latitude)) * 
            sin(radians(venue.latitude))
          )
        )`,
          "distance",
        )
        .setParameter("latitude", latitude)
        .setParameter("longitude", longitude);

      // Filter by venue types if provided
      if (venueTypeIds && venueTypeIds.length > 0) {
        queryBuilder.andWhere("venueType.id IN (:...venueTypeIds)", {
          venueTypeIds,
        });
      }

      // Filter by search query if provided
      if (query) {
        queryBuilder.andWhere(
          "(LOWER(venue.name) LIKE :query OR LOWER(venue.description) LIKE :query OR LOWER(venue.address) LIKE :query)",
          { query: `%${query.toLowerCase()}%` },
        );
      }

      // Filter by open now if provided
      if (openNow) {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

        queryBuilder.andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select("1")
            .from("venue_hour", "vh")
            .where("vh.venueId = venue.id")
            .andWhere("vh.dayOfWeek = :dayOfWeek", { dayOfWeek })
            .andWhere("vh.openingTime <= :currentTime", { currentTime })
            .andWhere("vh.closingTime >= :currentTime", { currentTime })
            .getQuery();
          return "EXISTS " + subQuery;
        });
      }

      // Filter by price level if provided
      if (priceLevel !== undefined) {
        queryBuilder.andWhere("venue.priceLevel = :priceLevel", { priceLevel });
      }

      // Apply sorting
      switch (sortBy) {
        case "distance":
          queryBuilder.orderBy("distance", "ASC");
          break;
        case "rating":
          queryBuilder.orderBy("venue.rating", "DESC");
          break;
        case "popularity":
          queryBuilder.orderBy("venue.popularity", "DESC");
          break;
        case "price":
          queryBuilder.orderBy("venue.priceLevel", "ASC");
          break;
        default:
          queryBuilder.orderBy("distance", "ASC");
      }

      // Apply pagination
      queryBuilder.limit(limit).offset(offset);

      // Execute query and return results with count
      return await queryBuilder.getManyAndCount();
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to search venues: ${error.message}`,
      );
    }
  }

  /**
   * Update a venue with admin overrides
   * This tracks which fields have been modified by admins
   */
  async updateWithAdminOverrides(
    id: string,
    updateData: Partial<Venue>,
    adminUserId: string,
  ): Promise<Venue> {
    const venue = await this.findById(id);

    // Create or update adminOverrides object
    const adminOverrides = venue.adminOverrides || {};

    // For each field in updateData, add it to adminOverrides
    Object.keys(updateData).forEach((key) => {
      if (
        key !== "adminOverrides" &&
        key !== "lastModifiedBy" &&
        key !== "lastModifiedAt"
      ) {
        // Use type assertion to avoid TypeScript's index signature restriction
        adminOverrides[key] = (updateData as Record<string, any>)[key];
      }
    });

    // Add tracking information
    const updatedVenueData = {
      ...updateData,
      adminOverrides,
      lastModifiedBy: adminUserId,
      lastModifiedAt: new Date(),
    };

    // Update venue
    Object.assign(venue, updatedVenueData);
    return this.venueRepository.save(venue);
  }

  /**
   * Refresh Google data while preserving admin overrides
   */
  async refreshGoogleData(
    id: string,
    googleData: Partial<Venue>,
  ): Promise<Venue> {
    const venue = await this.findById(id);
    const adminOverrides = venue.adminOverrides || {};

    // Apply Google data first
    Object.assign(venue, googleData);

    // Then re-apply admin overrides
    Object.keys(adminOverrides).forEach((key) => {
      // Use type assertion to avoid TypeScript's index signature restriction
      (venue as Record<string, any>)[key] = adminOverrides[key];
    });

    return this.venueRepository.save(venue);
  }

  /**
   * Find venues with admin overrides
   */
  async findVenuesWithAdminOverrides(
    limit: number = 20,
    offset: number = 0,
  ): Promise<[Venue[], number]> {
    return this.venueRepository.findAndCount({
      where: {
        adminOverrides: Not(IsNull()),
      },
      take: limit,
      skip: offset,
      order: {
        lastModifiedAt: "DESC",
      },
    });
  }

  async create(venueData: Partial<Venue>): Promise<Venue> {
    const venue = this.venueRepository.create(venueData);
    return this.venueRepository.save(venue);
  }

  async update(id: string, venueData: Partial<Venue>): Promise<Venue> {
    const venue = await this.findById(id);

    Object.assign(venue, venueData);

    return this.venueRepository.save(venue);
  }

  async delete(id: string): Promise<void> {
    const venue = await this.findById(id);
    await this.venueRepository.remove(venue);
  }

  async findFeatured(limit: number = 10): Promise<Venue[]> {
    return this.venueRepository.find({
      where: { isFeatured: true },
      relations: ["venueTypes", "venuePhotos"],
      take: limit,
      order: {
        rating: "DESC",
      },
    });
  }

  async findPopular(limit: number = 10): Promise<Venue[]> {
    return this.venueRepository.find({
      relations: ["venueTypes", "venuePhotos"],
      take: limit,
      order: {
        popularity: "DESC",
      },
    });
  }

  async findHighestRated(limit: number = 10): Promise<Venue[]> {
    return this.venueRepository.find({
      where: { rating: Not(IsNull()) },
      relations: ["venueTypes", "venuePhotos"],
      take: limit,
      order: {
        rating: "DESC",
      },
    });
  }

  // --- Start: Added for Trending ---
  async incrementViewCount(id: string): Promise<void> {
    try {
      await this.venueRepository.increment({ id }, "viewCount", 1);
    } catch (error) {
      // Log the error but don't throw, as view tracking is non-critical
      console.error(
        `Failed to increment view count for venue ${id}: ${error.message}`,
      );
    }
  }

  async incrementFollowerCount(id: string): Promise<void> {
    try {
      await this.venueRepository.increment({ id }, "followerCount", 1);
    } catch (error) {
      console.error(
        `Failed to increment follower count for venue ${id}: ${error.message}`,
      );
    }
  }

  async decrementFollowerCount(id: string): Promise<void> {
    try {
      // Ensure count doesn't go below zero using a WHERE clause in the decrement operation
      await this.venueRepository.decrement(
        { id, followerCount: MoreThan(0) },
        "followerCount",
        1,
      );
    } catch (error) {
      console.error(
        `Failed to decrement follower count for venue ${id}: ${error.message}`,
      );
    }
  }

  async incrementAssociatedPlanCount(id: string): Promise<void> {
    try {
      await this.venueRepository.increment({ id }, "associatedPlanCount", 1);
    } catch (error) {
      console.error(
        `Failed to increment associated plan count for venue ${id}: ${error.message}`,
      );
    }
  }

  async decrementAssociatedPlanCount(id: string): Promise<void> {
    try {
      await this.venueRepository.decrement(
        { id, associatedPlanCount: MoreThan(0) },
        "associatedPlanCount",
        1,
      );
    } catch (error) {
      console.error(
        `Failed to decrement associated plan count for venue ${id}: ${error.message}`,
      );
    }
  }
  // --- End: Added for Trending ---

  // --- Start: Added for VenueTrendingService ---
  async updateTrendingScore(id: string, score: number): Promise<void> {
    try {
      await this.venueRepository.update(id, { trendingScore: score });
    } catch (error) {
      console.error(
        `Failed to update trending score for venue ${id}: ${error.message}`,
      );
      // Consider re-throwing or more specific error handling if needed
    }
  }

  async findAllVenueIds(onlyActive: boolean = true): Promise<string[]> {
    try {
      const whereCondition: FindOptionsWhere<Venue> = {};
      if (onlyActive) {
        whereCondition.isActive = true;
      }
      // Efficiently fetch only IDs
      const venues = await this.venueRepository.find({
        select: ["id"],
        where: whereCondition,
      });
      return venues.map((v) => v.id);
    } catch (error) {
      console.error(`Failed to find all venue IDs: ${error.message}`);
      return []; // Return empty array on error
    }
  }

  async getTrendingVenues(
    options: {
      limit?: number;
      offset?: number /* TODO: add filters if needed */;
    } = {},
  ): Promise<[Venue[], number]> {
    const { limit = 10, offset = 0 } = options;

    try {
      return await this.venueRepository.findAndCount({
        relations: ["venuePhotos"],
        where: {
          isActive: true,
        },
        order: {
          trendingScore: "DESC",
          updatedAt: "DESC",
        },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      console.error(`Failed to get trending venues: ${error.message}`);
      throw new InternalServerErrorException(
        "Could not retrieve trending venues.",
      );
    }
  }
  // --- End: Added for VenueTrendingService ---

  /**
   * Search venues by text query (name, description) with pagination.
   * Prioritizes name matches over description matches for relevance.
   */
  async textSearch(
    query?: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<[Venue[], number]> {
    try {
      const queryBuilder = this.venueRepository
        .createQueryBuilder("venue")
        .leftJoinAndSelect("venue.venueTypes", "venueType")
        .leftJoinAndSelect(
          "venue.venuePhotos",
          "venuePhoto",
          "venuePhoto.isPrimary = true",
        );

      // Apply text search if query is provided
      if (query && query.trim()) {
        queryBuilder.where(
          "(LOWER(venue.name) LIKE :query OR LOWER(venue.description) LIKE :query)",
          { query: `%${query.toLowerCase()}%` },
        );

        // Add relevance sorting for text search results
        queryBuilder
          .addSelect(
            `CASE
            WHEN LOWER(venue.name) = LOWER(:exactQuery) THEN 1
            WHEN LOWER(venue.name) LIKE LOWER(:startQuery) THEN 2
            WHEN LOWER(venue.name) LIKE LOWER(:containsQuery) THEN 3
            WHEN LOWER(venue.description) LIKE LOWER(:containsQuery) THEN 4
            ELSE 5
          END`,
            "relevance",
          )
          .setParameter("exactQuery", query.toLowerCase())
          .setParameter("startQuery", `${query.toLowerCase()}%`)
          .setParameter("containsQuery", `%${query.toLowerCase()}%`)
          .orderBy("relevance", "ASC");
      } else {
        // Default sort by trending score and popularity if no query
        queryBuilder
          .orderBy("venue.trendingScore", "DESC")
          .addOrderBy("venue.popularity", "DESC");
      }

      // Apply pagination
      queryBuilder.take(limit).skip(offset);

      // Execute and return results with count
      return await queryBuilder.getManyAndCount();
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to search venues: ${error.message}`,
      );
    }
  }
}
