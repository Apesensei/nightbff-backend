import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { VenueRepository } from "../repositories/venue.repository";
import { VenueEventRepository } from "../repositories/venue-event.repository";
import { VenueReviewRepository } from "../repositories/venue-review.repository";
import { VenuePhotoRepository } from "../repositories/venue-photo.repository";
import { VenueTrendingService } from "./venue-trending.service";
import { Venue } from "../entities/venue.entity";
import { VenueEvent, EventStatus } from "../entities/venue-event.entity";
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
import { Cache } from "cache-manager";
import { DiscoverVenuesResponseDto } from "../dto/discover-venues-response.dto";
import { FollowRepository } from "@/microservices/user/repositories/follow.repository";
import { EventRepository } from "@/microservices/event/repositories/event.repository";
import { VenueTextSearchDto } from "../dto/venue-text-search.dto";

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

    const venue = await this.venueRepository.findById(id);

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
    const venue = await this.venueRepository.findById(venueId);

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

    // Using standard repository method since paginated method doesn't exist with limit and offset
    return this.venueReviewRepository.findByVenueId(venueId);
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
    const venue = await this.venueRepository.findById(venueId);

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
  private hasVenueAccess(user: User, venue: Venue): boolean {
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

    // --- TODO: Optimize fetching follower status ---
    // Fetch follower status for the current user if logged in
    let followingVenueIds: Set<string> = new Set();
    if (userId && venues.length > 0) {
      // This requires the FollowRepository. Ideally, optimize this query.
      // Example (replace with actual repository call):
      /*
      const follows = await this.followRepository.find({
        where: { userId, followedVenueId: In(venues.map(v => v.id)) },
        select: ['followedVenueId'],
      });
      followingVenueIds = new Set(follows.map(f => f.followedVenueId));
      */
      this.logger.warn(
        "Follower status check skipped: FollowRepository not yet implemented.",
      );
    }
    // --- End TODO ---

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

    const dto: VenueResponseDto = {
      id: venue.id,
      name: venue.name,
      description: venue.description,
      address: venue.address,
      latitude: venue.latitude,
      longitude: venue.longitude,
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

      // --- TODO: Optimize fetching follower status ---
      let followingVenueIds: Set<string> = new Set();
      if (userId && venues.length > 0) {
        this.logger.warn(
          "Follower status check skipped for recently viewed: FollowRepository not yet implemented.",
        );
      }
      // --- End TODO ---

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
        // Increment venue view count as well
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

  /**
   * Search venues by text query
   */
  async searchVenues(
    searchDto: VenueTextSearchDto,
    userId?: string,
  ): Promise<PaginatedVenueResponseDto> {
    this.logger.debug(
      `Searching venues with query: "${searchDto.query}", limit: ${searchDto.limit}, offset: ${searchDto.offset}`,
    );

    const { query, limit = 10, offset = 0 } = searchDto;

    // Generate cache key based on search parameters
    const cacheKey = `venue_search:${query || "all"}:${limit}:${offset}`;

    // Try to get from cache first
    const cachedResult =
      await this.cacheManager.get<PaginatedVenueResponseDto>(cacheKey);
    if (cachedResult) {
      this.logger.debug("Returning cached search results");
      return cachedResult;
    }

    // Track user search if query is meaningful and user is logged in
    if (userId && query && query.trim() !== "") {
      this.addToRecentSearches(userId, query.trim()).catch((err) => {
        this.logger.error(`Failed to add to recent searches: ${err.message}`);
      });
    }

    // Perform the search
    const [venues, total] = await this.venueRepository.textSearch(
      query,
      limit,
      offset,
    );

    // Transform to DTOs with user-specific data
    const items = await Promise.all(
      venues.map((venue) => this.transformToVenueResponseDto(venue, userId)),
    );

    // Create paginated response
    const result: PaginatedVenueResponseDto = {
      items,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      hasMore: total > offset + limit,
    };

    // Cache the result (30 seconds TTL)
    await this.cacheManager.set(cacheKey, result, 30);

    return result;
  }

  /**
   * Track recent venue searches for a user
   */
  private async addToRecentSearches(
    userId: string,
    query: string,
  ): Promise<void> {
    if (!userId || !query || query.trim() === "") return;

    const key = `user:${userId}:recent_venue_searches`;

    try {
      // Access Redis client in a type-safe way
      // Note: This assumes Redis is being used - if different cache is used, this needs adjustment
      const redisClient = (this.cacheManager.store as any).getClient?.();
      if (!redisClient) {
        this.logger.warn("Redis client not available for recent searches");
        return;
      }

      await redisClient.lrem(key, 0, query);
      await redisClient.lpush(key, query);
      await redisClient.ltrim(key, 0, 9); // Keep 10 most recent

      // Set expiry (30 days)
      await redisClient.expire(key, 60 * 60 * 24 * 30);
    } catch (error) {
      this.logger.error(
        `Failed to add search to recent searches: ${error.message}`,
      );
    }
  }

  /**
   * Get recent venue searches for a user
   */
  async getRecentSearches(
    userId: string,
    limit: number = 5,
  ): Promise<string[]> {
    if (!userId) return [];

    const key = `user:${userId}:recent_venue_searches`;

    try {
      // Access Redis client in a type-safe way
      const redisClient = (this.cacheManager.store as any).getClient?.();
      if (!redisClient) {
        this.logger.warn("Redis client not available for recent searches");
        return [];
      }

      return await redisClient.lrange(key, 0, limit - 1);
    } catch (error) {
      this.logger.error(`Failed to get recent searches: ${error.message}`);
      return [];
    }
  }
}
