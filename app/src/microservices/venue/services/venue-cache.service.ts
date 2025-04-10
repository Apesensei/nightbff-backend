import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

@Injectable()
export class VenueCacheService {
  private readonly redis: Redis;
  private readonly logger = new Logger(VenueCacheService.name);
  private readonly defaultTTL = 3600; // 1 hour default TTL
  private readonly versionKey = "venue:cache:version";
  private readonly adminEditKey = "venue:admin:edits";

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.redis = new Redis({
      host: this.configService.get("REDIS_HOST"),
      port: this.configService.get("REDIS_PORT"),
      password: this.configService.get("REDIS_PASSWORD"),
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on("error", (error: Error) => {
      this.logger.error(
        `Redis connection error: ${error.message}`,
        error.stack,
      );
    });

    // Initialize cache version if it doesn't exist
    this.initializeCacheVersion();
  }

  /**
   * Initialize cache version if it doesn't exist
   */
  private async initializeCacheVersion(): Promise<void> {
    try {
      const exists = await this.redis.exists(this.versionKey);
      if (exists === 0) {
        await this.redis.set(this.versionKey, "1");
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
      const version = await this.redis.get(this.versionKey);
      return version || "1";
    } catch (error) {
      this.logger.warn(`Failed to get cache version: ${error.message}`);
      return "1";
    }
  }

  /**
   * Increment cache version to invalidate all cache entries
   */
  async incrementCacheVersion(): Promise<void> {
    try {
      await this.redis.incr(this.versionKey);
      this.logger.log("Incremented cache version");
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
      const editKey = `${this.adminEditKey}:${venueId}`;

      // Store edited fields as a hash
      const pipeline = this.redis.pipeline();
      fields.forEach((field) => {
        pipeline.hset(editKey, field, Date.now().toString());
      });

      // Set expiration for the edit tracking (7 days)
      pipeline.expire(editKey, 7 * 24 * 60 * 60);

      await pipeline.exec();
    } catch (error) {
      this.logger.warn(`Failed to track admin edit: ${error.message}`);
    }
  }

  /**
   * Check if a venue has admin edits
   */
  async hasAdminEdits(venueId: string): Promise<boolean> {
    try {
      const editKey = `${this.adminEditKey}:${venueId}`;
      const exists = await this.redis.exists(editKey);
      return exists === 1;
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
      const editKey = `${this.adminEditKey}:${venueId}`;
      return await this.redis.hgetall(editKey);
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
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.warn(`Failed to get cached data: ${error.message}`);
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
    ttl: number = this.defaultTTL,
  ): Promise<void> {
    try {
      const key = await this.generateKey(type, params);
      await this.redis.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      this.logger.warn(`Failed to cache data: ${error.message}`);
    }
  }

  /**
   * Invalidate cache for specific type and params
   */
  async invalidate(type: string, params: Record<string, any>): Promise<void> {
    try {
      const key = await this.generateKey(type, params);
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn(`Failed to invalidate cache: ${error.message}`);
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
      // Get all venue-related keys
      const version = await this.getCacheVersion();
      const pattern = `venue:*:${version}:*venueId:${venueId}*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        // If many fields were updated or certain critical fields, delete all affected keys
        if (
          updatedFields.length > 5 ||
          updatedFields.includes("name") ||
          updatedFields.includes("location") ||
          updatedFields.includes("adminOverrides")
        ) {
          this.logger.log(
            `Invalidating ${keys.length} cache entries for venue ${venueId}`,
          );
          await this.redis.del(...keys);
        } else {
          // For minor updates, track the edit but keep cache valid
          // This lets us display "admin edited" indicators without invalidating the whole cache
          await this.trackAdminEdit(venueId, updatedFields);
          this.logger.log(
            `Tracked admin edits for venue ${venueId} without cache invalidation`,
          );
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to selectively invalidate cache: ${error.message}`,
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
