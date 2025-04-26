import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
// Use import type for Cache
import type { Cache } from "cache-manager";
import { VenueRepository } from "../repositories/venue.repository";
import { VenueAnalyticsService } from "./venue-analytics.service";
// TODO: Import FollowRepository and EventRepository/Client if needed for direct counts

@Injectable()
export class VenueTrendingService {
  private readonly logger = new Logger(VenueTrendingService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly venueRepository: VenueRepository,
    private readonly venueAnalyticsService: VenueAnalyticsService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    // TODO: Inject FollowRepository/EventRepository if needed for direct counts
  ) {}

  /**
   * Updates the trending score for a specific venue.
   * Fetches necessary counts, calculates score, updates DB, and caches.
   * To be called asynchronously when relevant actions occur (view, follow, plan association).
   */
  async updateVenueTrendingScore(venueId: string): Promise<number | null> {
    this.logger.debug(
      `Attempting to update trending score for venue ${venueId}`,
    );
    try {
      // 1. Fetch the venue with necessary counts for calculation
      // Ensure findById includes these relations or fetches the necessary columns
      const venue = await this.venueRepository.findById(venueId); // Assuming findById gets counts

      if (!venue) {
        this.logger.warn(`Venue ${venueId} not found for score update.`);
        return null;
      }

      // --- TODO: If counts aren't reliably on the Venue entity from findById, fetch them separately ---
      // const followerCount = await this.followRepository.count({ where: { followedVenueId: venueId }}); // Placeholder
      // const associatedPlanCount = await this.eventRepository.count({ where: { venueId: venueId }}); // Placeholder
      // Ensure these fetches are efficient! Use venue.followerCount etc. if available and accurate.
      // --- End TODO ---

      // 2. Calculate the score
      const score = this.venueAnalyticsService.calculateTrendingScore(
        venue.followerCount, // Use counts directly from the entity
        venue.viewCount,
        venue.associatedPlanCount,
        venue.createdAt,
      );
      this.logger.debug(`Calculated score for venue ${venueId}: ${score}`);

      // 3. Update score in the database
      await this.venueRepository.updateTrendingScore(venueId, score);

      // 4. Cache the calculated score (e.g., for 30 mins)
      const cacheKey = `venue_trending_score:${venueId}`;
      const cacheTTL = 1800; // 30 minutes in seconds
      await this.cacheManager.set(cacheKey, score, cacheTTL);
      this.logger.debug(
        `Cached score for venue ${venueId} with key ${cacheKey} and TTL ${cacheTTL}s`,
      );

      return score;
    } catch (error) {
      this.logger.error(
        `Failed to update trending score for venue ${venueId}: ${error.message}`,
        error.stack,
      );
      // Optional: Invalidate cache entry on error?
      // await this.cacheManager.del(`venue_trending_score:${venueId}`);
      return null;
    }
  }

  /**
   * Scheduled job to refresh trending scores for all venues periodically.
   */
  @Cron(CronExpression.EVERY_HOUR) // Adjust frequency as needed (e.g., EVERY_4_HOURS)
  async refreshAllTrendingScores(): Promise<void> {
    this.logger.log(
      `Starting scheduled refresh of all venue trending scores at ${new Date().toISOString()}...`,
    );
    try {
      // 1. Fetch all relevant venue IDs (e.g., only active ones)
      const venueIds = await this.venueRepository.findAllVenueIds(true); // Pass true for active only
      this.logger.log(`Found ${venueIds.length} active venues to refresh.`);

      if (venueIds.length === 0) {
        this.logger.log("No active venues found to refresh. Exiting job.");
        return;
      }

      // 2. Update scores in batches
      const batchSize = 100; // Process 100 venues at a time (adjust as needed)
      let updatedCount = 0;
      let failedCount = 0;

      for (let i = 0; i < venueIds.length; i += batchSize) {
        const batch = venueIds.slice(i, i + batchSize);
        const batchNumber = i / batchSize + 1;
        const totalBatches = Math.ceil(venueIds.length / batchSize);
        this.logger.log(
          `Processing batch ${batchNumber}/${totalBatches} (size ${batch.length})...`,
        );

        // 3. Call updateVenueTrendingScore for each ID, handle results
        const results = await Promise.allSettled(
          batch.map((venueId) => this.updateVenueTrendingScore(venueId)),
        );

        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            if (result.value !== null) {
              // Successfully calculated and updated score
              updatedCount++;
            } else {
              // updateVenueTrendingScore returned null (e.g., venue not found during update)
              this.logger.warn(
                `Score update returned null for venue ID: ${batch[index]} in batch ${batchNumber}`,
              );
              failedCount++;
            }
          } else {
            // Promise was rejected (error occurred within updateVenueTrendingScore)
            this.logger.error(
              `Score update failed for venue ID: ${batch[index]} in batch ${batchNumber}. Reason: ${result.reason}`,
            );
            failedCount++;
          }
        });
        this.logger.log(
          `Finished processing batch ${batchNumber}/${totalBatches}. Updated: ${updatedCount}, Failed: ${failedCount}`,
        );
      }

      this.logger.log(
        `Scheduled refresh of venue trending scores finished. ` +
          `Total processed: ${venueIds.length}, ` +
          `Successfully updated: ${updatedCount}, ` +
          `Failed/Skipped: ${failedCount}`,
      );

      // 4. Invalidate general trending results cache (adjust key pattern if needed)
      const cachePattern = "trending_venues:*"; // Example pattern
      try {
        // Check if store supports keys() for pattern matching
        if (
          typeof this.cacheManager.store.keys === "function" &&
          typeof this.cacheManager.store.del === "function"
        ) {
          const keys = await this.cacheManager.store.keys(cachePattern);
          if (keys && keys.length > 0) {
            this.logger.log(
              `Found ${keys.length} cache entries matching pattern: ${cachePattern}. Attempting deletion...`,
            );
            // Delete keys individually for broader compatibility
            let deletedCount = 0;
            for (const key of keys) {
              try {
                await this.cacheManager.store.del(key);
                deletedCount++;
              } catch (delError) {
                this.logger.warn(
                  `Failed to delete cache key ${key}: ${delError.message}`,
                );
              }
            }
            this.logger.log(
              `Finished attempting cache invalidation. Keys deleted: ${deletedCount}/${keys.length}`,
            );
          } else {
            this.logger.log(
              `No cache keys found matching pattern: ${cachePattern}`,
            );
          }
        } else {
          this.logger.warn(
            `Cache store does not support keys() or del() for pattern invalidation: ${cachePattern}`,
          );
        }
      } catch (cacheError) {
        this.logger.error(
          `Failed to invalidate trending venues cache: ${cacheError.message}`,
          cacheError.stack,
        );
      }
    } catch (error) {
      this.logger.error(
        `Scheduled refresh of venue trending scores failed unexpectedly: ${error.message}`,
        error.stack,
      );
    }
  }
}
