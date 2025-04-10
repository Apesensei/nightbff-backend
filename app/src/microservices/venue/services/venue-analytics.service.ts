import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class VenueAnalyticsService {
  private readonly logger = new Logger(VenueAnalyticsService.name);

  constructor() {} // e.g., private readonly eventRepository: EventRepository, // Placeholder // e.g., private readonly followRepository: FollowRepository, // Placeholder // Inject repositories or services needed to get counts if not on Venue entity directly

  /**
   * Calculate trending score for a venue based on follows, views, and associated plans.
   * Weights: Plans (highest), Follows (medium), Views (lowest).
   * Incorporates time decay.
   */
  calculateTrendingScore(
    followerCount: number,
    viewCount: number,
    associatedPlanCount: number,
    venueCreatedAt: Date,
  ): number {
    // Prevent division by zero or negative age if clock skewed
    const ageHours = Math.max(
      0,
      (Date.now() - venueCreatedAt.getTime()) / (1000 * 60 * 60),
    );

    // Apply time decay formula - adjust factor (-0.05) if needed
    // Smaller negative factor = slower decay. Larger negative factor = faster decay.
    const decayFactor = -0.05;
    const recencyMultiplier = Math.exp(decayFactor * ageHours); // Exponential decay

    // Define weights (adjust as needed based on product requirements)
    const planWeight = 5.0; // Highest weight
    const followWeight = 2.5; // Medium weight
    const viewWeight = 0.5; // Lowest weight

    // Calculate the weighted engagement score
    const engagementScore =
      associatedPlanCount * planWeight +
      followerCount * followWeight +
      viewCount * viewWeight;

    // Apply recency multiplier
    const finalScore = engagementScore * recencyMultiplier;

    // Add clamping or normalization if scores become too large/small
    // Ensure score is not negative due to potential floating point issues or extreme decay
    const clampedScore = Math.max(0, finalScore);

    this.logger.debug(
      `Calculated score for venue: ` +
        `Plans=${associatedPlanCount}(w:${planWeight}), ` +
        `Follows=${followerCount}(w:${followWeight}), ` +
        `Views=${viewCount}(w:${viewWeight}), ` +
        `AgeHrs=${ageHours.toFixed(2)}, ` +
        `DecayMult=${recencyMultiplier.toFixed(4)}, ` +
        `RawScore=${finalScore.toFixed(4)}, ` +
        `FinalScore=${clampedScore.toFixed(4)}`,
    );

    return clampedScore;
  }
}
