import { Injectable, Inject, Logger } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "@nestjs/cache-manager";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EventRepository } from "../repositories/event.repository";

@Injectable()
export class PlanAnalyticsService {
  private readonly logger = new Logger(PlanAnalyticsService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly eventRepository: EventRepository,
  ) {}

  /**
   * Track when users join a plan
   */
  trackPlanJoin(planId: string, userId: string): void {
    this.eventEmitter.emit("plan.join", {
      planId,
      userId,
      timestamp: new Date(),
    });

    // Safely invalidate cache for this plan's trending score
    this.safeCacheDelete(`plan_trending_score:${planId}`);
  }

  /**
   * Track when users view a plan
   */
  trackPlanView(planId: string, userId?: string): void {
    this.eventEmitter.emit("plan.view", {
      planId,
      userId,
      timestamp: new Date(),
    });
  }

  /**
   * Safely delete cache key - handles cache stores that don't support del()
   */
  private async safeCacheDelete(key: string): Promise<void> {
    try {
      // Check if the cache manager has a del method
      if (typeof this.cacheManager.del === "function") {
        await this.cacheManager.del(key);
      } else {
        // If del() is not available, log a warning
        this.logger.warn(
          `Cache store does not support del() method for key: ${key}`,
        );
      }
    } catch (error) {
      // Log error but don't crash the service
      this.logger.error(`Failed to delete cache key ${key}:`, error);
    }
  }

  /**
   * Calculate trending score for a plan
   */
  calculateTrendingScore(
    joins: number,
    views: number,
    ageHours: number,
  ): number {
    // Apply time decay formula - fresher plans get higher scores
    const recencyMultiplier = Math.exp(-0.05 * ageHours); // Decay exponentially

    // Calculate engagement score with weights as specified in requirements
    const joinWeight = 3.0; // Heaviest weight
    const viewWeight = 1.5; // Medium weight

    // Compute the weighted score
    return (joins * joinWeight + views * viewWeight) * recencyMultiplier;
  }
}
