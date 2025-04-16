import { Injectable, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class PlanAnalyticsService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
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

    // Invalidate cache for this plan's trending score
    this.cacheManager.del(`plan_trending_score:${planId}`);
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
