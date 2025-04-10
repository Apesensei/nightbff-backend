import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

interface RateLimit {
  points: number;
  duration: number;
}

type OperationType = "places.nearby" | "places.details" | "geocode";

@Injectable()
export class RateLimiterService {
  private readonly redis: Redis;
  private readonly logger = new Logger(RateLimiterService.name);

  // Default limits for Google Places API
  private readonly defaultLimits: Record<OperationType, RateLimit> = {
    "places.nearby": { points: 100, duration: 60 }, // 100 requests per minute
    "places.details": { points: 100, duration: 60 }, // 100 requests per minute
    geocode: { points: 50, duration: 60 }, // 50 requests per minute
  };

  constructor(private readonly configService: ConfigService) {
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
  }

  /**
   * Check if operation is allowed and consume points
   */
  async checkAndConsume(
    operation: OperationType,
    points: number = 1,
  ): Promise<boolean> {
    try {
      const limit = this.defaultLimits[operation] || {
        points: 100,
        duration: 60,
      };
      const key = `ratelimit:${operation}`;

      // Get current points and TTL
      const [currentPoints, ttl] = await Promise.all([
        this.redis.get(key),
        this.redis.ttl(key),
      ]);

      // If key doesn't exist, create it
      if (!currentPoints) {
        await this.redis.setex(key, limit.duration, limit.points - points);
        return true;
      }

      // Check if enough points are available
      const remainingPoints = parseInt(currentPoints, 10);
      if (remainingPoints < points) {
        this.logger.warn(`Rate limit exceeded for operation: ${operation}`);
        return false;
      }

      // Consume points
      await this.redis.decrby(key, points);
      return true;
    } catch (error) {
      this.logger.error(`Rate limiter error: ${error.message}`, error.stack);
      return true; // Fail open if rate limiter is unavailable
    }
  }

  /**
   * Get remaining points for an operation
   */
  async getRemainingPoints(operation: OperationType): Promise<number> {
    try {
      const key = `ratelimit:${operation}`;
      const points = await this.redis.get(key);
      return points
        ? parseInt(points, 10)
        : this.defaultLimits[operation]?.points || 0;
    } catch (error) {
      this.logger.error(
        `Failed to get remaining points: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Reset rate limit for an operation
   */
  async reset(operation: OperationType): Promise<void> {
    try {
      const limit = this.defaultLimits[operation];
      if (limit) {
        const key = `ratelimit:${operation}`;
        await this.redis.setex(key, limit.duration, limit.points);
      }
    } catch (error) {
      this.logger.error(
        `Failed to reset rate limit: ${error.message}`,
        error.stack,
      );
    }
  }
}
