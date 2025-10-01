import { Injectable, Inject, NotFoundException, Logger } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "@nestjs/cache-manager";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EventRepository } from "../repositories/event.repository";
import { PlanAnalyticsService } from "./plan-analytics.service";
import { EventAttendee } from "../entities/event-attendee.entity";

@Injectable()
export class PlanTrendingService {
  private readonly logger = new Logger(PlanTrendingService.name);

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly planAnalyticsService: PlanAnalyticsService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectRepository(EventAttendee)
    private readonly attendeeRepository: Repository<EventAttendee>,
  ) {}

  /**
   * Update trending score for a plan in real-time
   */
  async updatePlanTrendingScore(planId: string): Promise<number> {
    // Check cache first
    const cachedScore = await this.cacheManager.get<number>(
      `plan_trending_score:${planId}`,
    );
    if (cachedScore !== undefined && cachedScore !== null) {
      return cachedScore;
    }

    // Get plan details
    const plan = await this.eventRepository.findOne(planId);
    if (!plan) {
      throw new NotFoundException(`Plan with ID ${planId} not found`);
    }

    // Get join count (number of attendees)
    const joinCount = await this.attendeeRepository.count({
      where: { eventId: planId },
    });

    // Get view count from plan entity
    const viewCount = plan.viewCount;

    // Calculate age in hours
    const ageHours = (Date.now() - plan.createdAt.getTime()) / (1000 * 60 * 60);

    // Calculate trending score
    const score = this.planAnalyticsService.calculateTrendingScore(
      joinCount,
      viewCount,
      ageHours,
    );

    // Update in database
    await this.eventRepository.updateTrendingScore(planId, score);

    // Store in cache for 1 hour
    await this.cacheManager.set(`plan_trending_score:${planId}`, score, 3600);

    return score;
  }

  /**
   * Nightly job to refresh all trending scores
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT) // Run at midnight every night
  async refreshAllTrendingScores(): Promise<void> {
    try {
      // Get all active plans (future events)
      const [plans] = await this.eventRepository.findAll({
        startTimeFrom: new Date(),
      });

      // Update trending scores in batches
      const batchSize = 100;
      for (let i = 0; i < plans.length; i += batchSize) {
        const batch = plans.slice(i, i + batchSize);
        await Promise.all(
          batch.map((plan) => this.updatePlanTrendingScore(plan.id)),
        );
      }

      console.log(`Updated trending scores for ${plans.length} plans`);
    } catch (error) {
      console.error("Failed to refresh trending scores:", error);
    }
  }
}
