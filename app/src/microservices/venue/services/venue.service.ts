import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  Inject,
} from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { ConfigService } from "@nestjs/config";
import { differenceInHours } from "date-fns";
import * as ngeohash from "ngeohash";
import {
  VenueRepository,
  VenueSearchOptions,
} from "../repositories/venue.repository";
import { VenueEventRepository } from "../repositories/venue-event.repository";
import { VenueReviewRepository } from "../repositories/venue-review.repository";
import { VenuePhotoRepository } from "../repositories/venue-photo.repository";
import { VenueTrendingService } from "./venue-trending.service";
import { Venue } from "../entities/venue.entity";
import { VenueEvent } from "../entities/venue-event.entity";
import { VenueReview } from "../entities/venue-review.entity";
import { VenuePhoto, PhotoSource } from "../entities/venue-photo.entity";
import { User, UserRole } from "../../auth/entities/user.entity";
import { AdminVenueUpdateDto } from "../dto/admin-venue-update.dto";
import { AdminVenueResponseDto } from "../dto/admin-venue-response.dto";
import {
  AdminPhotoOrderDto,
  AdminBulkApprovePhotosDto,
} from "../dto/admin-photo-management.dto";
import { VenueCacheService } from "./venue-cache.service";
import { VenueResponseDto } from "../dto/venue-response.dto";
import { PaginatedVenueResponseDto } from "../dto/paginated-venue-response.dto";
import { TrendingVenuesRequestDto } from "../dto/trending-venues-request.dto";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "@nestjs/cache-manager";
import { DiscoverVenuesResponseDto } from "../dto/discover-venues-response.dto";
import { FollowRepository } from "@/microservices/user/repositories/follow.repository";
import { EventRepository } from "../../event/repositories/event.repository";
import { EventService } from "@/microservices/event/event.service";
import { InterestService } from "@/microservices/interest/services/interest.service";
import { VenueSearchDto } from "../dto/venue-search.dto";
import { Event } from "../../event/entities/event.entity";
import { VenueScanProducerService } from "./venue-scan-producer.service";
import { ScannedAreaRepository } from "../repositories/scanned-area.repository";

@Injectable()
export class VenueService {
  private readonly logger = new Logger(VenueService.name);

  constructor(
    private readonly venueRepository: VenueRepository,
    private readonly venueEventRepository: VenueEventRepository,
    private readonly venueReviewRepository: VenueReviewRepository,
    private readonly venuePhotoRepository: VenuePhotoRepository,
    private readonly cacheService: VenueCacheService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly venueTrendingService: VenueTrendingService,
    private readonly followRepository: FollowRepository,
    private readonly eventRepository: EventRepository,
    private readonly eventService: EventService,
    private readonly interestService: InterestService,
    private readonly venueScanProducerService: VenueScanProducerService,
    private readonly scannedAreaRepository: ScannedAreaRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Find a venue by ID.
   * Tracks view count and triggers score update if userId is provided.
   */
  async findById(id: string, userId?: string): Promise<Venue> {
    const venue = await this.venueRepository.findById(id);

    if (userId) {
      // Increment view count asynchronously
      this.venueRepository
        .incrementViewCount(id)
        .catch((err) =>
          this.logger.error(
            `Failed async view count increment for venue ${id}: ${err.message}`,
          ),
        );

      // Trigger score update asynchronously
      this.venueTrendingService
        .updateVenueTrendingScore(id)
        .catch((err) =>
          this.logger.error(
            `Failed async score update after view for venue ${id}: ${err.message}`,
          ),
        );

      // --- Add Recently Viewed Logic ---
      this.addVenueToRecentlyViewed(userId, id).catch((err) =>
        this.logger.error(
          `Failed async add to recently viewed for user ${userId}, venue ${id}: ${err.message}`,
        ),
      );
      // --- End Recently Viewed ---
    }
    return venue;
  }

  /**
   * Create a new venue
   * @Phase1: Any authenticated user can create venues
   * @Phase3: Will be restricted to VENUE_OWNER and ADMIN roles
   */
  async createVenue(user: User, venueData: Partial<Venue>): Promise<Venue> {
    if (!user) {
      throw new ForbiddenException("Authentication required");
    }

    // TODO Phase 3: Restore role check for VENUE_OWNER and ADMIN
    // if (!this.hasRequiredRole(user, [UserRole.ADMIN, UserRole.VENUE_OWNER])) {
    //   throw new ForbiddenException('You do not have permission to create venues');
    // }

    // Track the creating user for auditing purposes
    this.logger.log(`Venue created by user: ${user.id}`);

    return this.venueRepository.create(venueData);
  }

  /**
   * Update a venue
   * @Phase1: Any authenticated user can update venues
   * @Phase3: Will be restricted to VENUE_OWNER and ADMIN roles
   */
  async updateVenue(
    user: User,
    id: string,
    venueData: Partial<Venue>,
  ): Promise<Venue> {
    if (!user) {
      throw new ForbiddenException("Authentication required");
    }

    // TODO Phase 3: Restore role check for VENUE_OWNER and ADMIN
    // if (!this.hasRequiredRole(user, [UserRole.ADMIN, UserRole.VENUE_OWNER])) {
    //   throw new ForbiddenException('You do not have permission to update venues');
    // }

    await this.venueRepository.findById(id);

    // Track the updating user for auditing purposes
    this.logger.log(`Venue ${id} updated by user: ${user.id}`);

    return this.venueRepository.update(id, venueData);
  }

  /**
   * Get events for a venue
   */
  async getVenueEvents(
    venueId: string,
    options?: {
      upcoming?: boolean;
      status?: string;
      limit?: number;
    },
  ): Promise<VenueEvent[]> {
    const { upcoming, status, limit = 10 } = options || {};

    if (upcoming) {
      // Using standard repository method since custom method doesn't exist
      const now = new Date();
      const events = await this.venueEventRepository.findByVenueId(venueId);
      return events.filter((event) => event.startTime > now).slice(0, limit);
    }

    if (status) {
      // Filter events by status manually since method doesn't exist
      const events = await this.venueEventRepository.findByVenueId(venueId);
      return events.filter((event) => event.status === status).slice(0, limit);
    }

    return this.venueEventRepository.findByVenueId(venueId);
  }

  /**
   * Add an event to a venue
   * @Phase1: Any authenticated user can add events to venues
   * @Phase3: Will be restricted to VENUE_OWNER and ADMIN roles
   */
  async addVenueEvent(
    user: User,
    venueId: string,
    eventData: Partial<VenueEvent>,
  ): Promise<VenueEvent> {
    // Check if venue exists
    await this.venueRepository.findById(venueId);

    if (!user) {
      throw new ForbiddenException("Authentication required");
    }

    // TODO Phase 3: Restore role check for VENUE_OWNER and ADMIN
    // if (!this.hasRequiredRole(user, [UserRole.ADMIN, UserRole.VENUE_OWNER])) {
    //   throw new ForbiddenException('You do not have permission to add events to this venue');
    // }

    // Set the venue ID
    eventData.venueId = venueId;

    // Track the creating user for auditing purposes
    this.logger.log(`Event created for venue ${venueId} by user: ${user.id}`);

    return this.venueEventRepository.create(eventData);
  }

  /**
   * Get reviews for a venue
   */
  async getVenueReviews(
    venueId: string,
    limit = 20,
    offset = 0,
  ): Promise<VenueReview[]> {
    // Check if venue exists
    await this.venueRepository.findById(venueId);

    // Use the updated repository method with pagination
    return this.venueReviewRepository.findByVenueId(venueId, limit, offset);
  }

  /**
   * Add a review to a venue
   */
  async addVenueReview(
    user: User,
    venueId: string,
    reviewData: Partial<VenueReview>,
  ): Promise<VenueReview> {
    // Check if venue exists
    await this.venueRepository.findById(venueId);

    // Check if user already reviewed this venue
    const existingReviews = await this.venueReviewRepository.findByUserId(
      user.id,
    );
    const alreadyReviewed = existingReviews.some(
      (review) => review.venueId === venueId,
    );

    if (alreadyReviewed) {
      throw new ForbiddenException("You have already reviewed this venue");
    }

    // Set default values
    reviewData.venueId = venueId;
    reviewData.userId = user.id;
    reviewData.isPublished = true;

    const review = await this.venueReviewRepository.create(reviewData);

    // Update venue rating
    await this.updateVenueRating(venueId);

    return review;
  }

  /**
   * Get photos for a venue
   */
  async getVenuePhotos(venueId: string): Promise<VenuePhoto[]> {
    // Check if venue exists
    await this.venueRepository.findById(venueId);

    return this.venuePhotoRepository.findByVenueId(venueId);
  }

  /**
   * Admin: Update venue with admin overrides
   * This method tracks which fields were modified by admins
   */
  async adminUpdateVenue(
    admin: User,
    id: string,
    updateDto: AdminVenueUpdateDto,
  ): Promise<AdminVenueResponseDto> {
    if (!this.hasRequiredRole(admin, [UserRole.ADMIN])) {
      throw new ForbiddenException(
        "You do not have permission to perform admin operations",
      );
    }

    // Ensure venue exists
    await this.venueRepository.findById(id);

    // Track modified fields for selective cache invalidation
    const modifiedFields = Object.keys(updateDto);

    // Log the admin update
    this.logger.log(`Admin venue update for venue ${id} by admin: ${admin.id}`);

    // Update with admin overrides
    const updatedVenue = await this.venueRepository.updateWithAdminOverrides(
      id,
      updateDto,
      admin.id,
    );

    // Invalidate cache for this venue with information about which fields were updated
    await this.cacheService.invalidateSelective(id, modifiedFields);

    return new AdminVenueResponseDto(updatedVenue);
  }

  /**
   * Admin: Refresh Google data for a venue while preserving admin overrides
   */
  async refreshVenueGoogleData(
    admin: User,
    id: string,
  ): Promise<AdminVenueResponseDto> {
    if (!this.hasRequiredRole(admin, [UserRole.ADMIN])) {
      throw new ForbiddenException(
        "You do not have permission to perform admin operations",
      );
    }

    const venue = await this.venueRepository.findById(id);

    if (!venue.googlePlaceId) {
      throw new NotFoundException(
        "Venue does not have a Google Place ID to refresh data from",
      );
    }

    // TODO: Implement the actual Google data fetch
    // This would involve calling the GoogleMapsService to get fresh data
    // For now, we'll just return the current venue

    this.logger.log(`Admin refreshed Google data for venue ${id}`);

    // Since this is a major data refresh, invalidate all cache entries for this venue
    await this.cacheService.invalidateSelective(id, ["googleData"]);

    return new AdminVenueResponseDto(venue);
  }

  /**
   * Admin: Get venues with admin overrides
   * Uses caching for improved performance on this potentially expensive query
   */
  async getVenuesWithAdminOverrides(
    admin: User,
    limit = 20,
    offset = 0,
  ): Promise<[AdminVenueResponseDto[], number]> {
    if (!this.hasRequiredRole(admin, [UserRole.ADMIN])) {
      throw new ForbiddenException(
        "You do not have permission to perform admin operations",
      );
    }

    // Try to get from cache first
    const cacheKey = `admin_venues_with_overrides_${limit}_${offset}`;
    const cached = await this.cacheService.get<
      [AdminVenueResponseDto[], number]
    >("admin_list", { key: cacheKey });

    if (cached) {
      this.logger.log(
        `Retrieved admin venues with overrides from cache (limit: ${limit}, offset: ${offset})`,
      );
      return cached;
    }

    // If not in cache, get from database
    const [venues, count] =
      await this.venueRepository.findVenuesWithAdminOverrides(limit, offset);
    const result: [AdminVenueResponseDto[], number] = [
      venues.map((venue) => new AdminVenueResponseDto(venue)),
      count,
    ];

    // Cache the result with a shorter TTL since admin data changes more frequently
    await this.cacheService.set("admin_list", { key: cacheKey }, result, 300); // 5 minutes TTL

    return result;
  }

  /**
   * Admin: Get all photos for a venue (including unapproved)
   */
  async adminGetVenuePhotos(
    admin: User,
    venueId: string,
    source?: PhotoSource,
  ): Promise<VenuePhoto[]> {
    if (!this.hasRequiredRole(admin, [UserRole.ADMIN])) {
      throw new ForbiddenException(
        "You do not have permission to perform admin operations",
      );
    }

    // Check if venue exists
    await this.venueRepository.findById(venueId);

    // For admin views, we use a shorter cache duration
    const cacheKey = `admin_photos_${venueId}_${source || "all"}`;
    const cached = await this.cacheService.get<VenuePhoto[]>("admin_photos", {
      key: cacheKey,
    });

    if (cached) {
      return cached;
    }

    let photos: VenuePhoto[];
    if (source) {
      photos = await this.venuePhotoRepository.findBySource(venueId, source);
    } else {
      photos = await this.venuePhotoRepository.findAllByVenueId(venueId);
    }

    // Cache admin photo results for a short time
    await this.cacheService.set("admin_photos", { key: cacheKey }, photos, 60); // 1 minute TTL

    return photos;
  }

  /**
   * Admin: Upload a photo for a venue
   */
  async adminAddVenuePhoto(
    admin: User,
    venueId: string,
    photoData: Partial<VenuePhoto>,
  ): Promise<VenuePhoto> {
    if (!this.hasRequiredRole(admin, [UserRole.ADMIN])) {
      throw new ForbiddenException(
        "You do not have permission to perform admin operations",
      );
    }

    // Check if venue exists
    await this.venueRepository.findById(venueId);

    // Set admin-specific values
    photoData.venueId = venueId;
    photoData.userId = admin.id;
    photoData.isApproved = true;
    photoData.source = "admin";

    return this.venuePhotoRepository.create(photoData);
  }

  /**
   * Admin: Bulk approve photos
   */
  async adminBulkApprovePhotos(
    admin: User,
    dto: AdminBulkApprovePhotosDto,
  ): Promise<boolean> {
    if (!this.hasRequiredRole(admin, [UserRole.ADMIN])) {
      throw new ForbiddenException(
        "You do not have permission to perform admin operations",
      );
    }

    await this.venuePhotoRepository.bulkApprove(dto.photoIds);

    // Since photos were approved, we need to invalidate photo caches
    // First, get the venue IDs corresponding to these photos
    const photoPromises = dto.photoIds.map((photoId) =>
      this.venuePhotoRepository.findById(photoId),
    );

    try {
      const photos = await Promise.all(photoPromises);
      const venueIds = [...new Set(photos.map((photo) => photo.venueId))];

      // Invalidate cache for each affected venue
      for (const venueId of venueIds) {
        await this.cacheService.invalidateSelective(venueId, ["photos"]);
      }

      return true;
    } catch (error) {
      this.logger.error(`Error in bulk approving photos: ${error.message}`);
      return false;
    }
  }

  /**
   * Admin: Update photo order
   */
  async adminUpdatePhotoOrder(
    admin: User,
    dto: AdminPhotoOrderDto,
  ): Promise<boolean> {
    if (!this.hasRequiredRole(admin, [UserRole.ADMIN])) {
      throw new ForbiddenException(
        "You do not have permission to perform admin operations",
      );
    }

    await this.venuePhotoRepository.bulkUpdateOrder(dto.orderConfig);

    // Since photo order was updated, we need to invalidate photo caches
    // First, get the venue IDs corresponding to these photos
    const photoIds = dto.orderConfig.map((config) => config.photoId);
    const photoPromises = photoIds.map((photoId) =>
      this.venuePhotoRepository.findById(photoId),
    );

    try {
      const photos = await Promise.all(photoPromises);
      const venueIds = [...new Set(photos.map((photo) => photo.venueId))];

      // Invalidate cache for each affected venue
      for (const venueId of venueIds) {
        await this.cacheService.invalidateSelective(venueId, [
          "photos",
          "photoOrder",
        ]);
      }

      return true;
    } catch (error) {
      this.logger.error(`Error in updating photo order: ${error.message}`);
      return false;
    }
  }

  /**
   * Add a photo to a venue
   */
  async addVenuePhoto(
    user: User,
    venueId: string,
    photoData: Partial<VenuePhoto>,
  ): Promise<VenuePhoto> {
    // Check if venue exists
    await this.venueRepository.findById(venueId);

    // Set default values
    photoData.venueId = venueId;
    photoData.userId = user.id;
    photoData.isPrimary = false;
    photoData.isApproved = this.hasRequiredRole(user, [
      UserRole.ADMIN,
      UserRole.VENUE_OWNER,
    ]); // Auto-approve for admins and venue owners
    photoData.source = "user";

    return this.venuePhotoRepository.create(photoData);
  }

  /**
   * Update venue rating based on reviews
   */
  private async updateVenueRating(venueId: string): Promise<void> {
    try {
      const average =
        await this.venueReviewRepository.calculateAverageRating(venueId);
      const count = await this.venueReviewRepository.countByVenueId(venueId);

      await this.venueRepository.update(venueId, {
        rating: average,
        reviewCount: count,
      });
    } catch (error) {
      this.logger.error(
        `Failed to update venue rating: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Check if user has access to a venue (owner or admin)
   */
  private hasVenueAccess(_user: User, _venue: Venue): boolean {
    console.log(_user, _venue);
    // Venue entity doesn't have owner field yet
    // TODO: Implement when owner field is added
    return false;
  }

  private hasRequiredRole(user: User, requiredRoles: UserRole[]): boolean {
    if (!user || !user.roles) return false;

    // Check if the user has any of the required roles
    return requiredRoles.some((role) => user.roles.includes(role));
  }

  /**
   * Get Trending Venues
   */
  async getTrendingVenues(
    options: TrendingVenuesRequestDto,
    userId?: string, // Optional user context for isFollowing status
  ): Promise<PaginatedVenueResponseDto> {
    this.logger.debug(
      `Getting trending venues with options: ${JSON.stringify(options)}, userId: ${userId}`,
    );
    const { limit = 10, offset = 0 } = options;

    // Fetch from repository
    const [venues, total] = await this.venueRepository.getTrendingVenues({
      limit,
      offset,
      // Pass other filters from options if implemented
    });

    // --- isFollowing status is handled in transformToVenueResponseDto ---

    // Transform venues to response DTOs, now async
    const items = await Promise.all(
      venues.map(
        (venue) => this.transformToVenueResponseDto(venue, userId), // Pass only venue and userId
      ),
    );

    const page = Math.floor(offset / limit) + 1;
    const hasMore = total > offset + limit;

    this.logger.debug(
      `Returning ${items.length} trending venues, total: ${total}, page: ${page}, hasMore: ${hasMore}`,
    );

    return {
      items,
      total,
      page,
      limit,
      hasMore,
    };
  }

  // --- Start: DTO Transformation Helper ---
  // Making public to be callable from Controller
  public async transformToVenueResponseDto(
    venue: Venue,
    userId?: string,
  ): Promise<VenueResponseDto> {
    const primaryPhoto =
      venue.venuePhotos?.find((p) => p.isPrimary) || venue.venuePhotos?.[0];

    let isFollowing = false;
    if (userId) {
      // Check follow status directly using FollowRepository
      const follow = await this.followRepository.findFollow(userId, venue.id);
      isFollowing = !!follow;
    }

    // TODO: Parse coordinates from venue.location (WKT string) if needed in DTO
    // Example (requires a WKT parser or regex):
    // let latitude = null, longitude = null;
    // if (venue.location) {
    //   const match = venue.location.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    //   if (match) {
    //     longitude = parseFloat(match[1]);
    //     latitude = parseFloat(match[2]);
    //   }
    // }

    const dto: VenueResponseDto = {
      id: venue.id,
      name: venue.name,
      description: venue.description,
      address: venue.address,
      // latitude: venue.latitude, // Removed old property access
      // longitude: venue.longitude, // Removed old property access
      latitude: 0, // Placeholder - Parse from venue.location if needed
      longitude: 0, // Placeholder - Parse from venue.location if needed
      primaryPhotoUrl:
        primaryPhoto?.mediumUrl || primaryPhoto?.photoUrl || null,
      rating: venue.rating,
      followerCount: venue.followerCount,
      isFollowing: isFollowing,
    };

    return dto;
  }
  // --- End: DTO Transformation Helper ---

  // --- Recently Viewed Methods (using standard cache methods) ---
  private async addVenueToRecentlyViewed(
    userId: string,
    venueId: string,
  ): Promise<void> {
    const key = `user:${userId}:recently_viewed_venues_array`; // Use a different key for array storage
    const maxItems = 10;
    this.logger.debug(
      `Adding venue ${venueId} to recently viewed (array) for user ${userId}`,
    );

    try {
      // 1. Get current list from cache
      let currentList: string[] =
        (await this.cacheManager.get<string[]>(key)) || [];

      // 2. Remove existing venueId if present
      currentList = currentList.filter((id) => id !== venueId);

      // 3. Add new venueId to the beginning
      currentList.unshift(venueId);

      // 4. Trim the list
      const updatedList = currentList.slice(0, maxItems);

      // 5. Set the updated list back into cache (no TTL needed? Or maybe long TTL?)
      await this.cacheManager.set(key, updatedList);
      this.logger.debug(
        `Successfully updated recently viewed array for user ${userId}. List size: ${updatedList.length}`,
      );
    } catch (error) {
      this.logger.error(
        `Error updating recently viewed array for user ${userId}: ${error.message}`,
        error.stack,
      );
    }
  }

  async getRecentlyViewedVenues(
    userId: string,
    limit: number = 5,
  ): Promise<VenueResponseDto[]> {
    const key = `user:${userId}:recently_viewed_venues_array`;
    const actualLimit = Math.max(1, Math.min(limit, 10));
    this.logger.debug(
      `Getting recently viewed venues (array) for user ${userId}, limit: ${actualLimit}`,
    );

    let venueIds: string[] = [];
    try {
      venueIds = (await this.cacheManager.get<string[]>(key)) || [];
    } catch (error) {
      this.logger.error(
        `Error fetching recently viewed array for user ${userId}: ${error.message}`,
        error.stack,
      );
      return [];
    }

    if (!venueIds || venueIds.length === 0) {
      this.logger.debug(
        `No recently viewed venues found in cache (array) for user ${userId}`,
      );
      return [];
    }

    // Take only the requested limit from the front of the array
    const limitedVenueIds = venueIds.slice(0, actualLimit);
    this.logger.debug(
      `Found ${limitedVenueIds.length} venue IDs in recently viewed cache (array): ${limitedVenueIds.join(", ")}`,
    );

    try {
      const venues = await this.venueRepository.findByIds(limitedVenueIds);

      // --- isFollowing status is handled in transformToVenueResponseDto ---

      // Maintain order from cache array and transform (now async)
      const orderedVenues = limitedVenueIds
        .map((id) => venues.find((v) => v.id === id))
        .filter((v): v is Venue => !!v);

      this.logger.debug(
        `Returning ${orderedVenues.length} recently viewed venue details (array)`,
      );
      // Use Promise.all to handle async transformation
      return Promise.all(
        orderedVenues.map(
          (venue) => this.transformToVenueResponseDto(venue, userId), // Pass only venue and userId
        ),
      );
    } catch (repoError) {
      this.logger.error(
        `Error fetching venue details for recently viewed IDs (array): ${repoError.message}`,
        repoError.stack,
      );
      return [];
    }
  }
  // --- End Recently Viewed Methods ---

  // --- Start: Discover Venues Data ---
  async getDiscoverVenuesData(
    userId?: string,
  ): Promise<DiscoverVenuesResponseDto> {
    this.logger.debug(`Getting discover venues data for userId: ${userId}`);

    // Define options for trending venues (e.g., first page)
    const trendingOptions: TrendingVenuesRequestDto = { limit: 10, offset: 0 };

    try {
      // Fetch data concurrently
      const [recentlyViewedResult, trendingVenuesResult] =
        await Promise.allSettled([
          userId
            ? this.getRecentlyViewedVenues(userId, 5)
            : Promise.resolve([]),
          this.getTrendingVenues(trendingOptions, userId),
        ]);

      // Process results
      const recentlyViewed =
        recentlyViewedResult.status === "fulfilled"
          ? recentlyViewedResult.value
          : [];
      const trendingVenues: PaginatedVenueResponseDto =
        trendingVenuesResult.status === "fulfilled"
          ? trendingVenuesResult.value
          : {
              items: [],
              total: 0,
              page: 1,
              limit: trendingOptions.limit ?? 10,
              hasMore: false,
            };

      // Log errors if any fetch failed
      if (recentlyViewedResult.status === "rejected") {
        this.logger.error(
          `Failed to fetch recently viewed for discover page: ${recentlyViewedResult.reason}`,
        );
      }
      if (trendingVenuesResult.status === "rejected") {
        this.logger.error(
          `Failed to fetch trending venues for discover page: ${trendingVenuesResult.reason}`,
        );
      }

      this.logger.debug(
        `Successfully fetched data for discover page. Recently Viewed: ${recentlyViewed.length}, Trending Items: ${trendingVenues.items.length}`,
      );

      return {
        recentlyViewed,
        trendingVenues,
      };
    } catch (error) {
      this.logger.error(
        `Unexpected error fetching discover venues data: ${error.message}`,
        error.stack,
      );
      // Return a default/empty response structure on major error
      return {
        recentlyViewed: [],
        trendingVenues: {
          items: [],
          total: 0,
          page: 1,
          limit: trendingOptions.limit ?? 10, // Now accessible
          hasMore: false,
        },
      };
    }
  }
  // --- End: Discover Venues Data ---

  // --- Add Follow/Unfollow Logic ---
  async followVenue(userId: string, venueId: string): Promise<void> {
    this.logger.debug(`User ${userId} attempting to follow venue ${venueId}`);
    // 1. Check if venue exists (findById throws if not found)
    await this.findById(venueId);

    // 2. Check if already following
    const existingFollow = await this.followRepository.findFollow(
      userId,
      venueId,
    );
    if (existingFollow) {
      this.logger.warn(
        `User ${userId} already following venue ${venueId}. Skipping.`,
      );
      // Optionally throw BadRequestException('User already following this venue')
      return;
    }

    // 3. Create Follow record
    await this.followRepository.createFollow(userId, venueId);
    this.logger.log(`User ${userId} successfully followed venue ${venueId}`);

    // 4. Increment followerCount on Venue asynchronously
    this.venueRepository
      .incrementFollowerCount(venueId)
      .catch((err) =>
        this.logger.error(
          `Failed async follower count increment for venue ${venueId} after follow: ${err.message}`,
        ),
      );

    // 5. Trigger score update asynchronously
    this.venueTrendingService
      .updateVenueTrendingScore(venueId)
      .catch((err) =>
        this.logger.error(
          `Failed async score update for venue ${venueId} after follow: ${err.message}`,
        ),
      );

    // 6. Invalidate relevant caches (e.g., user's following list, venue details if they include follower count/status)
    await this.cacheService.invalidateUserFollowing(userId);
    await this.cacheService.invalidateSelective(venueId, [
      "followerCount",
      "isFollowing",
    ]);

    // TODO: Emit event 'venue.followed' if needed for other listeners
    // this.eventEmitter.emit('venue.followed', { userId, venueId });
  }

  async unfollowVenue(userId: string, venueId: string): Promise<void> {
    this.logger.debug(`User ${userId} attempting to unfollow venue ${venueId}`);
    // 1. Delete Follow record
    const deleteResult = await this.followRepository.deleteFollow(
      userId,
      venueId,
    );

    // 2. Decrement followerCount only if a record was actually deleted
    if (deleteResult.affected && deleteResult.affected > 0) {
      this.logger.log(
        `User ${userId} successfully unfollowed venue ${venueId}`,
      );
      // Decrement followerCount asynchronously
      this.venueRepository
        .decrementFollowerCount(venueId)
        .catch((err) =>
          this.logger.error(
            `Failed async follower count decrement for venue ${venueId} after unfollow: ${err.message}`,
          ),
        );

      // Trigger score update asynchronously
      this.venueTrendingService
        .updateVenueTrendingScore(venueId)
        .catch((err) =>
          this.logger.error(
            `Failed async score update for venue ${venueId} after unfollow: ${err.message}`,
          ),
        );

      // Invalidate relevant caches
      await this.cacheService.invalidateUserFollowing(userId);
      await this.cacheService.invalidateSelective(venueId, [
        "followerCount",
        "isFollowing",
      ]);

      // TODO: Emit event 'venue.unfollowed' if needed
      // this.eventEmitter.emit('venue.unfollowed', { userId, venueId });
    } else {
      this.logger.warn(
        `User ${userId} attempted to unfollow venue ${venueId}, but was not following.`,
      );
      // Optionally throw NotFoundException('Follow relationship not found')
    }
  }
  // --- End Follow/Unfollow Logic ---

  // --- Plan Association Event Listeners ---
  @OnEvent("plan.join")
  async handlePlanJoined(payload: {
    planId: string;
    userId: string;
  }): Promise<void> {
    try {
      this.logger.log(
        `User ${payload.userId} joined plan ${payload.planId}, checking for venue association`,
      );
      const plan = await this.eventRepository.findOne(payload.planId);
      if (plan && plan.venueId) {
        // Update trending score asynchronously
        this.venueTrendingService
          .updateVenueTrendingScore(plan.venueId)
          .catch((error) => {
            this.logger.error(
              `Failed to update trending score for venue ${plan.venueId}`,
              error.stack,
            );
          });
      }
    } catch (error) {
      this.logger.error(
        `Error handling plan.join event for ${payload.planId}`,
        error.stack,
      );
    }
  }

  @OnEvent("plan.view")
  async handlePlanViewed(payload: { planId: string }): Promise<void> {
    try {
      this.logger.log(
        `Plan ${payload.planId} viewed, checking for venue association`,
      );
      const plan = await this.eventRepository.findOne(payload.planId);
      if (plan && plan.venueId) {
        // Increment venue view count well
        await this.venueRepository.incrementViewCount(plan.venueId);
        // Update trending score asynchronously
        this.venueTrendingService
          .updateVenueTrendingScore(plan.venueId)
          .catch((error) => {
            this.logger.error(
              `Failed to update trending score for venue ${plan.venueId}`,
              error.stack,
            );
          });
      }
    } catch (error) {
      this.logger.error(
        `Error handling plan.view event for ${payload.planId}`,
        error.stack,
      );
    }
  }

  /**
   * Handle plan associated with venue events
   * @param payload The event payload containing planId and venueId
   */
  @OnEvent("plan.associated_with_venue")
  async handlePlanAssociatedWithVenue(payload: {
    planId: string;
    venueId: string;
  }): Promise<void> {
    try {
      this.logger.log(
        `Plan ${payload.planId} associated with venue ${payload.venueId}`,
      );
      // Increment associated plan count
      await this.venueRepository.incrementAssociatedPlanCount(payload.venueId);
      // Update trending score asynchronously
      this.venueTrendingService
        .updateVenueTrendingScore(payload.venueId)
        .catch((error) => {
          this.logger.error(
            `Failed to update trending score for venue ${payload.venueId}`,
            error.stack,
          );
        });
    } catch (error) {
      this.logger.error(
        `Error handling plan.associated_with_venue event for plan ${payload.planId} and venue ${payload.venueId}`,
        error.stack,
      );
    }
  }

  /**
   * Handle plan disassociated from venue events
   * @param payload The event payload containing planId and venueId
   */
  @OnEvent("plan.disassociated_from_venue")
  async handlePlanDisassociatedFromVenue(payload: {
    planId: string;
    venueId: string;
  }): Promise<void> {
    try {
      this.logger.log(
        `Plan ${payload.planId} disassociated from venue ${payload.venueId}`,
      );
      // Decrement associated plan count
      await this.venueRepository.decrementAssociatedPlanCount(payload.venueId);
      // Update trending score asynchronously
      this.venueTrendingService
        .updateVenueTrendingScore(payload.venueId)
        .catch((error) => {
          this.logger.error(
            `Failed to update trending score for venue ${payload.venueId}`,
            error.stack,
          );
        });
    } catch (error) {
      this.logger.error(
        `Error handling plan.disassociated_from_venue event for plan ${payload.planId} and venue ${payload.venueId}`,
        error.stack,
      );
    }
  }
  // --- End Plan Association Event Listeners ---

  // --- RPC Handler for Scan Trigger ---
  @MessagePattern("venue.triggerScanIfStale")
  async handleTriggerScan(
    @Payload() data: { latitude: number; longitude: number },
  ): Promise<void> {
    this.logger.debug(
      `RPC received: venue.triggerScanIfStale for ${data.latitude}, ${data.longitude}`,
    );
    // Use the internal helper method
    await this.enqueueScanIfStale(data.latitude, data.longitude);
  }

  // --- Internal Logic for Enqueuing Scan ---
  // (Moved logic from previous `searchVenues` implementation)
  async enqueueScanIfStale(latitude: number, longitude: number): Promise<void> {
    try {
      const precision = this.configService.get<number>("GEOHASH_PRECISION", 7);
      const thresholdHours = this.configService.get<number>(
        "VENUE_SCAN_STALENESS_THRESHOLD_HOURS",
        72,
      );
      const geohashPrefix = ngeohash.encode(latitude, longitude, precision);

      this.logger.debug(
        `Checking staleness for geohash ${geohashPrefix} (Precision: ${precision}, Threshold: ${thresholdHours}h)`,
      );

      const lastScanRecord =
        await this.scannedAreaRepository.findLastScanned(geohashPrefix);
      let shouldScan = true;

      if (lastScanRecord) {
        const hoursSinceLastScan = differenceInHours(
          new Date(),
          lastScanRecord.lastScannedAt,
        );
        if (hoursSinceLastScan < thresholdHours) {
          shouldScan = false;
          this.logger.debug(
            `Geohash ${geohashPrefix} scanned recently (${hoursSinceLastScan}h ago). Skipping scan trigger.`,
          );
        }
      }

      if (shouldScan) {
        this.logger.log(
          `Geohash ${geohashPrefix} is stale or not scanned. Enqueuing scan job.`,
        );
        // Use fire-and-forget with error logging for the producer call
        this.venueScanProducerService
          .enqueueScan(geohashPrefix)
          .catch((error) => {
            this.logger.error(
              `Failed to enqueue scan job for geohash ${geohashPrefix}: ${error.message}`,
              error.stack,
            );
          });
      }
    } catch (e: any) {
      this.logger.error(
        `Error during enqueueScanIfStale check for ${latitude}, ${longitude}: ${e.message}`,
        e.stack,
      );
      // Do not re-throw, as this is often called in a fire-and-forget context
    }
  }
  // --- End Internal Logic ---

  /**
   * Search venues based on various criteria, including optional interest filtering.
   * Handles service-layer sorting by event popularity when filtering by interest.
   */
  async searchVenues(
    searchDto: VenueSearchDto,
    userId: string,
  ): Promise<PaginatedVenueResponseDto> {
    this.logger.debug(
      `Searching venues with DTO: ${JSON.stringify(searchDto)}, userId: ${userId}`,
    );
    const currentSearchDto = { ...searchDto }; // Clone DTO for modification
    let actualInterestId: string | undefined = currentSearchDto.interestId;

    // --- Start: Phase 3 "For You" Logic --- New Block ---
    if (currentSearchDto.interestId === "forYou") {
      this.logger.debug(
        `'forYou' interest filter requested for venue search, userId: ${userId}`,
      );
      // Guard should prevent userId being missing, but check for robustness
      if (!userId) {
        this.logger.error(
          `'forYou' requested for venue search but userId missing unexpectedly! Returning empty.`,
        );
        return {
          items: [],
          total: 0,
          page: 1,
          limit: currentSearchDto.limit ?? 10,
          hasMore: false,
        };
      }

      try {
        const userInterests =
          await this.interestService.getUserInterests(userId);
        if (userInterests && userInterests.length > 0) {
          // V1: Use the first interest
          actualInterestId = userInterests[0].id;
          this.logger.debug(
            `Resolved 'forYou' to interestId: ${actualInterestId} for venue search, user ${userId}`,
          );
        } else {
          this.logger.debug(
            `User ${userId} has no interests for 'forYou' venue search. Returning empty.`,
          );
          return {
            items: [],
            total: 0,
            page: 1,
            limit: currentSearchDto.limit ?? 10,
            hasMore: false,
          };
        }
      } catch (error) {
        this.logger.error(
          `Error fetching user interests for 'forYou' venue search (userId: ${userId}): ${error.message}`,
          error.stack,
        );
        return {
          items: [],
          total: 0,
          page: 1,
          limit: currentSearchDto.limit ?? 10,
          hasMore: false,
        };
      }
    }
    // --- End: Phase 3 "For You" Logic ---

    // 1. Prepare base options for the repository
    const repositoryOptions: VenueSearchOptions = {
      query: currentSearchDto.query,
      latitude: currentSearchDto.latitude,
      longitude: currentSearchDto.longitude,
      radiusMiles: currentSearchDto.radius,
      sortBy: currentSearchDto.sortBy,
      order: currentSearchDto.order,
      openNow: currentSearchDto.openNow,
      priceLevel: currentSearchDto.priceLevel,
      venueTypeIds: currentSearchDto.venueTypes,
      limit: undefined, // Limit/offset handled differently for interest search
      offset: undefined,
    };

    let isInterestSearch = false;
    let eventsForInterest: Event[] = [];
    let venueIdsForInterestSearch: string[] = [];

    // 2. Handle Interest Filtering Logic
    if (actualInterestId) {
      // ... (Fetch event IDs, venue IDs by interest) ...
      isInterestSearch = true;
      try {
        const eventIds =
          await this.interestService.getEventIdsByInterest(actualInterestId);
        if (eventIds.length === 0) {
          this.logger.debug(
            `No event IDs found for interest ${actualInterestId}. Returning empty.`,
          );
          return {
            items: [],
            total: 0,
            page: 1,
            limit: currentSearchDto.limit ?? 10,
            hasMore: false,
          };
        }
        eventsForInterest = await this.eventRepository.findByIdsWithDetails(
          eventIds,
          ["id", "venueId", "trendingScore"],
        );
        // Extract unique, non-null venue IDs from the events
        venueIdsForInterestSearch = [
          ...new Set(
            eventsForInterest
              .map((event) => event.venueId)
              .filter((id): id is string => id !== null && id !== undefined),
          ),
        ];
        if (venueIdsForInterestSearch.length === 0) {
          this.logger.debug(
            `No venues found associated with events for interest ${actualInterestId}. Returning empty.`,
          );
          return {
            items: [],
            total: 0,
            page: 1,
            limit: currentSearchDto.limit ?? 10,
            hasMore: false,
          };
        }
        repositoryOptions.venueIds = venueIdsForInterestSearch;
        // Remove geo/sort/pagination options from repo query for interest search
        delete repositoryOptions.latitude; /* ... etc ... */
      } catch (error) {
        // Log the error and degrade to non-interest search
        this.logger.error(
          `Error during interest filter processing for ${actualInterestId}: ${error.message}`,
          error.stack,
        );
        isInterestSearch = false;
      }
    }

    // --- Add this check instead ---
    if (!isInterestSearch) {
      // Not an interest search OR fallback after error - apply normal limit/offset
      repositoryOptions.limit = currentSearchDto.limit;
      repositoryOptions.offset = currentSearchDto.offset;
    }
    // --- End addition ---

    // 3. Call Repository with proper error handling
    let fetchedVenues: Venue[];
    let totalFromRepo: number;
    try {
      [fetchedVenues, totalFromRepo] =
        await this.venueRepository.search(repositoryOptions);
    } catch (error) {
      this.logger.error(
        `Failed to search venues in repository: ${error.message}`,
        error.stack,
      );
      // Return empty results instead of throwing
      return {
        items: [],
        total: 0,
        page:
          Math.floor(
            (currentSearchDto.offset ?? 0) / (currentSearchDto.limit ?? 10),
          ) + 1,
        limit: currentSearchDto.limit ?? 10,
        hasMore: false,
      };
    }

    // 4. Perform Service-Layer Sorting (if interest search)
    let finalVenues = fetchedVenues;
    let total = totalFromRepo;
    if (isInterestSearch && eventsForInterest.length > 0) {
      this.logger.log(
        "Performing service-layer sorting and pagination due to interest filter.",
      );

      // Calculate combined score for each venue based on associated events
      const venueScores = new Map<string, number>();
      for (const event of eventsForInterest) {
        if (event.venueId && event.trendingScore) {
          venueScores.set(
            event.venueId,
            (venueScores.get(event.venueId) || 0) + event.trendingScore,
          );
        }
      }

      // Sort fetched venues based on the calculated score (descending)
      finalVenues.sort((a, b) => {
        const scoreA = venueScores.get(a.id) || 0;
        const scoreB = venueScores.get(b.id) || 0;
        return scoreB - scoreA;
      });

      // Apply manual pagination
      total = finalVenues.length;
      const limit = currentSearchDto.limit ?? 10;
      const offset = currentSearchDto.offset ?? 0;
      finalVenues = finalVenues.slice(offset, offset + limit);
    }

    // 5. Transform and Return Results
    const items = await Promise.all(
      finalVenues.map((venue) =>
        this.transformToVenueResponseDto(venue, userId),
      ),
    );

    const limitForResult = currentSearchDto.limit ?? 10;
    const offsetForResult = currentSearchDto.offset ?? 0;

    return {
      items,
      total,
      page: Math.floor(offsetForResult / limitForResult) + 1,
      limit: limitForResult,
      hasMore: total > offsetForResult + limitForResult,
    };
  }

  // --- Backfill Service Methods ---

  /**
   * Service method to find venues without cityId.
   * @param limit - Batch size.
   * @param offset - Skip count.
   * @returns Venues and total count.
   */
  async findVenuesWithoutCityId(
    limit: number,
    offset: number,
  ): Promise<[Venue[], number]> {
    this.logger.debug(
      `Fetching venues without cityId, limit: ${limit}, offset: ${offset}`,
    );
    try {
      return await this.venueRepository.findWithoutCityId(limit, offset);
    } catch (error) {
      this.logger.error(
        `Error fetching venues without cityId: ${error.message}`,
        error.stack,
      );
      // Let the RPC handler manage throwing RpcException
      throw error;
    }
  }

  /**
   * Service method to update cityId for a venue.
   * @param venueId - ID of the venue.
   * @param cityId - ID of the city.
   * @returns Boolean indicating success.
   */
  async updateVenueCityId(venueId: string, cityId: string): Promise<boolean> {
    this.logger.debug(`Updating cityId for venue ${venueId} to ${cityId}`);
    try {
      const result = await this.venueRepository.updateCityId(venueId, cityId);
      if (result.affected === 0) {
        this.logger.warn(`Venue ${venueId} not found or cityId not updated.`);
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(
        `Error updating cityId for venue ${venueId}: ${error.message}`,
        error.stack,
      );
      // Let the RPC handler manage throwing RpcException
      throw error;
    }
  }

  // --- End Backfill Service Methods ---
}
