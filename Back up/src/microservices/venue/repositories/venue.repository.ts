import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Repository,
  In,
  Not,
  IsNull,
  MoreThan,
  FindOptionsWhere,
} from "typeorm";
import { Venue } from "../entities/venue.entity";
import { VenueSortBy } from "../dto/venue-search.dto";

// Define the options interface within the repository file
export interface VenueSearchOptions {
  query?: string;
  latitude?: number;
  longitude?: number;
  radiusMiles?: number;
  venueTypeIds?: string[];
  sortBy?: VenueSortBy;
  order?: "ASC" | "DESC";
  openNow?: boolean;
  priceLevel?: number;
  limit?: number; // For standard pagination
  offset?: number; // For standard pagination
  venueIds?: string[]; // For filtering by specific IDs (disables geo-filter & repo pagination)
}

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
      relations: ["venueTypes", "venuePhotos"],
    });
  }

  async findByGooglePlaceId(googlePlaceId: string): Promise<Venue | null> {
    return this.venueRepository.findOne({
      where: { googlePlaceId },
    });
  }

  /**
   * Search venues based on provided options.
   * Handles standard geographic/keyword search OR filtering by specific venue IDs.
   * Pagination is applied only for standard searches (not venue ID filtering).
   */
  async search(options: VenueSearchOptions): Promise<[Venue[], number]> {
    const { limit = 10, offset = 0 } = options; // Default pagination for standard search
    let isGeoSearch = false;

    try {
      const queryBuilder = this.venueRepository
        .createQueryBuilder("venue")
        // Selectively join necessary relations
        .leftJoinAndSelect("venue.venueTypes", "venueType")
        .leftJoinAndSelect("venue.venueHours", "venueHour") // Needed for openNow filter
        .leftJoinAndSelect(
          "venue.venuePhotos",
          "venuePhoto",
          "venuePhoto.isPrimary = true", // Select only primary photos initially
        );

      // --- Conditional Filters ---
      if (options.venueIds && options.venueIds.length > 0) {
        // 1. Filter by specific venue IDs (Interest Search path)
        queryBuilder.andWhere("venue.id IN (:...venueIds)", {
          venueIds: options.venueIds,
        });
        // Skip geo-filtering and standard pagination
      } else if (
        options.latitude !== undefined &&
        options.longitude !== undefined
      ) {
        // 2. Apply Geographic Filters (Standard Search path)
        isGeoSearch = true;
        const radiusMiles = options.radiusMiles ?? 10;
        const latitude = options.latitude;
        const longitude = options.longitude;

        // Approx bounding box
        const latDelta = radiusMiles / 69;
        const lngDelta = radiusMiles / 55;
        queryBuilder
          .andWhere("venue.latitude BETWEEN :minLat AND :maxLat", {
            minLat: latitude - latDelta,
            maxLat: latitude + latDelta,
          })
          .andWhere("venue.longitude BETWEEN :minLng AND :maxLng", {
            minLng: longitude - lngDelta,
            maxLng: longitude + lngDelta,
          });

        // Add precise distance calculation
        queryBuilder
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
      }
      // If neither venueIds nor lat/lng provided, it becomes a general search

      // --- Apply Other Standard Filters ---
      if (options.venueTypeIds && options.venueTypeIds.length > 0) {
        queryBuilder.andWhere("venueType.id IN (:...venueTypeIds)", {
          venueTypeIds: options.venueTypeIds,
        });
      }

      if (options.query) {
        queryBuilder.andWhere(
          "(LOWER(venue.name) LIKE :query OR LOWER(venue.description) LIKE :query OR LOWER(venue.address) LIKE :query)",
          { query: `%${options.query.toLowerCase()}%` },
        );
      }

      if (options.openNow) {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const currentTime = now.getHours() * 60 + now.getMinutes();

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

      if (options.priceLevel !== undefined) {
        queryBuilder.andWhere("venue.priceLevel = :priceLevel", {
          priceLevel: options.priceLevel,
        });
      }

      // --- Standard Sorting Logic ---
      const sortBy =
        options.sortBy ??
        (isGeoSearch ? VenueSortBy.DISTANCE : VenueSortBy.POPULARITY); // Default sort depends on search type
      const order = options.order ?? "ASC";

      switch (sortBy) {
        case VenueSortBy.DISTANCE:
          if (isGeoSearch) {
            queryBuilder.orderBy("distance", order);
          } else {
            // Fallback if distance sort requested without geo context
            queryBuilder.orderBy("venue.popularity", "DESC");
          }
          break;
        case VenueSortBy.RATING:
          queryBuilder.orderBy(
            "venue.rating",
            order === "ASC" ? "ASC" : "DESC",
          );
          break;
        case VenueSortBy.POPULARITY:
          queryBuilder.orderBy(
            "venue.popularity",
            order === "ASC" ? "ASC" : "DESC",
          );
          break;
        case VenueSortBy.PRICE:
          queryBuilder.orderBy(
            "venue.priceLevel",
            order === "ASC" ? "ASC" : "DESC",
          ); // Assuming ASC for price
          break;
        default:
          if (isGeoSearch) {
            queryBuilder.orderBy("distance", "ASC");
          } else {
            queryBuilder.orderBy("venue.popularity", "DESC");
          }
      }

      // --- Conditional Pagination ---
      if (!(options.venueIds && options.venueIds.length > 0)) {
        // Apply pagination ONLY if NOT filtering by specific venue IDs
        queryBuilder.take(limit).skip(offset);
      } // Else: Fetch all matching venues as the service will handle pagination

      // Execute query and return results with count
      return await queryBuilder.getManyAndCount();
    } catch (error) {
      const logger = new Logger(VenueRepository.name); // Add logger instance if needed
      logger.error(`Failed to search venues: ${error.message}`, error.stack);
      // Re-throw or handle appropriately
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
