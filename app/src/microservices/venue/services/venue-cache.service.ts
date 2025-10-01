import { Injectable, Logger } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
// Use import type for Cache
import type { Cache } from "@nestjs/cache-manager";

@Injectable()
export class VenueCacheService {
  private readonly logger = new Logger(VenueCacheService.name);
  private readonly defaultTTL = 3600; // 1 hour default TTL (seconds)
  private readonly versionKey = "venue:cache:version";
  private readonly adminEditKeyPrefix = "venue:admin:edits"; // Changed to prefix

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {
    this.logger.log("[VenueCacheService] Constructor called.");
    this.logger.verbose(
      "[VenueCacheService] Inspecting injected CACHE_MANAGER instance properties:",
    );
    this.logger.verbose(
      `[VenueCacheService]   typeof this.cacheManager.get: ${typeof this.cacheManager.get}`,
    );
    this.logger.verbose(
      `[VenueCacheService]   typeof this.cacheManager.set: ${typeof this.cacheManager.set}`,
    );
    this.logger.verbose(
      `[VenueCacheService]   typeof this.cacheManager.del: ${typeof this.cacheManager.del}`,
    );
    if ((this.cacheManager as any).store) {
      this.logger.verbose(
        "[VenueCacheService]   (this.cacheManager as any).store exists.",
      );
      this.logger.verbose(
        `[VenueCacheService]   typeof (this.cacheManager as any).store: ${typeof (this.cacheManager as any).store}`,
      );
      this.logger.verbose(
        `[VenueCacheService]   (this.cacheManager as any).store.constructor.name: ${(this.cacheManager as any).store?.constructor?.name}`,
      );
      this.logger.verbose(
        `[VenueCacheService]   typeof (this.cacheManager as any).store.get: ${typeof (this.cacheManager as any).store?.get}`,
      );
    } else {
      this.logger.verbose(
        "[VenueCacheService]   (this.cacheManager as any).store does NOT exist.",
      );
    }

    // Initialize cache version if it doesn't exist
    this.initializeCacheVersion();
  }

  /**
   * Initialize cache version if it doesn't exist
   */
  private async initializeCacheVersion(): Promise<void> {
    try {
      const currentVersion = await this.cacheManager.get<string>(
        this.versionKey,
      );
      if (!currentVersion) {
        // Set with a very long TTL (effectively indefinite for a version key)
        // Assuming cacheManager.set TTL is in milliseconds
        await this.cacheManager.set(this.versionKey, "1", 0); // 0 for indefinite for some stores, or use a very large number
        this.logger.log("Initialized cache version to 1");
      }
    } catch (error) {
      this.logger.warn(`Failed to initialize cache version: ${error.message}`);
    }
  }

  /**
   * Get current cache version
   */
  async getCacheVersion(): Promise<string> {
    try {
      const version = await this.cacheManager.get<string>(this.versionKey);
      return version || "1"; // Default to "1" if not found or error
    } catch (error) {
      this.logger.warn(`Failed to get cache version: ${error.message}`);
      return "1"; // Default to "1" on error
    }
  }

  /**
   * Increment cache version to invalidate all cache entries
   */
  async incrementCacheVersion(): Promise<void> {
    try {
      let currentVersion = await this.cacheManager.get<string>(this.versionKey);
      let newVersion = 1;
      if (currentVersion && !isNaN(parseInt(currentVersion, 10))) {
        newVersion = parseInt(currentVersion, 10) + 1;
      }
      // Set with a very long TTL
      await this.cacheManager.set(this.versionKey, newVersion.toString(), 0);
      this.logger.log(`Incremented cache version to ${newVersion}`);
    } catch (error) {
      this.logger.warn(`Failed to increment cache version: ${error.message}`);
    }
  }

  /**
   * Cache key generation helper with versioning
   */
  private async generateKey(
    type: string,
    params: Record<string, any>,
  ): Promise<string> {
    const version = await this.getCacheVersion();
    const sortedParams = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join(":");
    return `venue:${type}:${version}:${sortedParams}`;
  }

  /**
   * Track admin edits for a venue
   */
  async trackAdminEdit(venueId: string, fields: string[]): Promise<void> {
    try {
      const editKey = `${this.adminEditKeyPrefix}:${venueId}`;
      let adminEdits =
        (await this.cacheManager.get<Record<string, string>>(editKey)) || {};

      const now = Date.now().toString();
      fields.forEach((field) => {
        adminEdits[field] = now;
      });

      // Set expiration for the edit tracking (7 days in milliseconds)
      const ttlMs = 7 * 24 * 60 * 60 * 1000;
      await this.cacheManager.set(editKey, adminEdits, ttlMs);
    } catch (error) {
      this.logger.warn(`Failed to track admin edit: ${error.message}`);
    }
  }

  /**
   * Check if a venue has admin edits
   */
  async hasAdminEdits(venueId: string): Promise<boolean> {
    try {
      const editKey = `${this.adminEditKeyPrefix}:${venueId}`;
      const edits =
        await this.cacheManager.get<Record<string, string>>(editKey);
      return !!edits && Object.keys(edits).length > 0;
    } catch (error) {
      this.logger.warn(`Failed to check admin edits: ${error.message}`);
      return false;
    }
  }

  /**
   * Get fields that have been edited by admin
   */
  async getAdminEditedFields(venueId: string): Promise<Record<string, string>> {
    try {
      const editKey = `${this.adminEditKeyPrefix}:${venueId}`;
      return (
        (await this.cacheManager.get<Record<string, string>>(editKey)) || {}
      );
    } catch (error) {
      this.logger.warn(`Failed to get admin edited fields: ${error.message}`);
      return {};
    }
  }

  /**
   * Get cached data with versioning
   */
  async get<T>(type: string, params: Record<string, any>): Promise<T | null> {
    try {
      const key = await this.generateKey(type, params);
      const cached = await this.cacheManager.get<string>(key); // Assume data is stored as JSON string
      return cached ? (JSON.parse(cached) as T) : null;
    } catch (error) {
      this.logger.warn(
        `Failed to get cached data for key generation params ${type} - ${JSON.stringify(params)}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Set cache data with TTL and versioning
   */
  async set(
    type: string,
    params: Record<string, any>,
    data: any,
    ttlSeconds: number = this.defaultTTL, // Changed parameter name to clarify unit
  ): Promise<void> {
    try {
      const key = await this.generateKey(type, params);
      const ttlMs = ttlSeconds * 1000; // Convert seconds to milliseconds
      await this.cacheManager.set(key, JSON.stringify(data), ttlMs);
    } catch (error) {
      this.logger.warn(
        `Failed to cache data for key generation params ${type} - ${JSON.stringify(params)}: ${error.message}`,
      );
    }
  }

  /**
   * Invalidate cache for specific type and params
   */
  async invalidate(type: string, params: Record<string, any>): Promise<void> {
    try {
      const key = await this.generateKey(type, params);
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate cache for key generation params ${type} - ${JSON.stringify(params)}: ${error.message}`,
      );
    }
  }

  /**
   * Selectively invalidate venue-related caches based on venueId and updatedFields
   * This is more efficient than clearing all caches when only specific data changes
   */
  async invalidateSelective(
    venueId: string,
    updatedFields: string[] = [],
  ): Promise<void> {
    try {
      // If many fields were updated or certain critical fields, increment global version
      if (
        updatedFields.length > 5 ||
        updatedFields.includes("name") ||
        updatedFields.includes("location") ||
        updatedFields.includes("adminOverrides") // Assuming 'adminOverrides' is a critical field
      ) {
        this.logger.log(
          `Invalidating all caches due to significant update for venue ${venueId} (fields: ${updatedFields.join(", ")})`,
        );
        await this.clearAll(); // This increments the main cache version
      } else if (updatedFields.length > 0) {
        // For minor updates, just track the edit.
        // The cache entries remain valid but can be marked as "stale" or "admin edited" by the consumer if needed.
        await this.trackAdminEdit(venueId, updatedFields);
        this.logger.log(
          `Tracked admin edits for venue ${venueId} (fields: ${updatedFields.join(", ")}) without full cache invalidation.`,
        );
      }
      // If updatedFields is empty, do nothing.
    } catch (error) {
      this.logger.warn(
        `Failed to selectively invalidate cache for venue ${venueId}: ${error.message}`,
      );
    }
  }

  /**
   * Clear all venue-related caches by incrementing the version
   * This is more efficient than deleting all keys
   */
  async clearAll(): Promise<void> {
    try {
      await this.incrementCacheVersion();
      this.logger.log("Cleared all venue caches by incrementing version");
    } catch (error) {
      this.logger.warn(`Failed to clear all caches: ${error.message}`);
    }
  }

  /**
   * Invalidate cache entries related to a user's following list.
   * TODO: Implement actual cache key pattern matching/deletion if applicable.
   */
  async invalidateUserFollowing(userId: string): Promise<void> {
    this.logger.debug(
      `Attempting to invalidate following cache for user ${userId}`,
    );
    // Example: If user's followed venues are cached under a specific key
    // const key = `user:${userId}:following_venues`;
    // await this.cacheManager.del(key);
    // For now, just log the intent
    this.logger.log(
      `Placeholder: Invalidation needed for user ${userId} following cache.`,
    );
    // Consider more robust invalidation if using tags or patterns
  }
}
