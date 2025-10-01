import { Injectable, Logger } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "@nestjs/cache-manager";
import { Cron, CronExpression } from "@nestjs/schedule";
import { OnEvent } from "@nestjs/event-emitter";

import { InterestRepository } from "../repositories/interest.repository";

@Injectable()
export class InterestAnalyticsService {
  private readonly logger = new Logger(InterestAnalyticsService.name);
  private readonly usageCountMap: Record<string, number> = {};
  private readonly USAGE_COUNT_KEY = "interest:usage:metrics";

  constructor(
    private readonly interestRepository: InterestRepository,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.logger.log("InterestAnalyticsService constructor called.");
    this.logger.verbose(
      "Inspecting injected CACHE_MANAGER instance properties:",
    );
    if (this.cacheManager && typeof this.cacheManager === "object") {
      this.logger.verbose(
        `  typeof this.cacheManager.get: ${typeof (this.cacheManager as any).get}`,
      );
      this.logger.verbose(
        `  typeof this.cacheManager.set: ${typeof (this.cacheManager as any).set}`,
      );
      this.logger.verbose(
        `  typeof this.cacheManager.del: ${typeof (this.cacheManager as any).del}`,
      );
      const internalStore = (this.cacheManager as any).store;
      if (internalStore) {
        this.logger.verbose(`  (this.cacheManager as any).store exists.`);
        this.logger.verbose(
          `  typeof (this.cacheManager as any).store: ${typeof internalStore}`,
        );
        if (typeof internalStore === "object" && internalStore.constructor) {
          this.logger.verbose(
            `  (this.cacheManager as any).store.constructor.name: ${internalStore.constructor.name}`,
          );
        }
        this.logger.verbose(
          `  typeof (this.cacheManager as any).store.get: ${typeof (internalStore as any).get}`,
        );
      } else {
        this.logger.warn(
          "  (this.cacheManager as any).store is null or undefined.",
        );
      }
    } else {
      this.logger.error(
        "CACHE_MANAGER is not an object or is null/undefined at injection point!",
      );
    }

    // Initialize analytics on startup
    this.initializeUsageCountMap();
  }

  /**
   * Initialize the usage count map from cache if available
   */
  private async initializeUsageCountMap(): Promise<void> {
    try {
      const cachedMap = await this.cacheManager.get<Record<string, number>>(
        this.USAGE_COUNT_KEY,
      );

      if (cachedMap) {
        Object.assign(this.usageCountMap, cachedMap);
        this.logger.log("Initialized interest usage metrics from cache");
      } else {
        this.logger.log("No cached interest usage metrics found");
      }
    } catch (error) {
      this.logger.error(
        `Error initializing usage count map: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Update metrics when user interests are updated
   */
  @OnEvent("user.interests.updated")
  async handleUserInterestsUpdated(payload: {
    userId: string;
    interestIds: string[];
  }): Promise<void> {
    try {
      if (!payload.interestIds.length) {
        return;
      }

      // Increment usage count for each interest
      for (const interestId of payload.interestIds) {
        this.incrementUsageCount(interestId);
      }

      // Update cache
      await this.updateCache();

      this.logger.debug(
        `Updated usage metrics for user interests update: ${payload.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling user interests update: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Update metrics when event interests are updated
   */
  @OnEvent("event.interests.updated")
  async handleEventInterestsUpdated(payload: {
    eventId: string;
    interestIds: string[];
  }): Promise<void> {
    try {
      if (!payload.interestIds.length) {
        return;
      }

      // Increment usage count for each interest
      for (const interestId of payload.interestIds) {
        this.incrementUsageCount(interestId);
      }

      // Update cache
      await this.updateCache();

      this.logger.debug(
        `Updated usage metrics for event interests update: ${payload.eventId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling event interests update: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Increment usage count for a specific interest
   */
  private incrementUsageCount(interestId: string): void {
    this.usageCountMap[interestId] = (this.usageCountMap[interestId] || 0) + 1;
  }

  /**
   * Update the cache with current usage metrics
   */
  private async updateCache(): Promise<void> {
    try {
      await this.cacheManager.set(
        this.USAGE_COUNT_KEY,
        this.usageCountMap,
        86400 * 1000,
      ); // 24 hours in milliseconds
    } catch (error) {
      this.logger.error(`Error updating cache: ${error.message}`, error.stack);
    }
  }

  /**
   * Run daily to update interest usage metrics in the database
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateInterestUsageMetrics(): Promise<void> {
    try {
      // Skip if no usage data
      if (Object.keys(this.usageCountMap).length === 0) {
        this.logger.debug("No interest usage data to update");
        return;
      }

      // Update interest records in database
      await this.interestRepository.updateUsageMetrics(this.usageCountMap);

      // Reset usage map after database update
      for (const key of Object.keys(this.usageCountMap)) {
        this.usageCountMap[key] = 0;
      }

      // Update cache with reset values
      await this.updateCache();

      this.logger.log("Interest usage metrics updated successfully");
    } catch (error) {
      this.logger.error(
        `Error updating interest usage metrics: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Calculate popular interests based on user selection frequency
   */
  async calculatePopularInterests(limit: number = 10): Promise<string[]> {
    // Sort interests by usage count and return top N
    return Object.entries(this.usageCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
  }
}
