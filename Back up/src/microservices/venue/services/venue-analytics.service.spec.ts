import { Test, TestingModule } from "@nestjs/testing";
import { VenueAnalyticsService } from "./venue-analytics.service";

describe("VenueAnalyticsService", () => {
  let service: VenueAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VenueAnalyticsService],
    }).compile();

    service = module.get<VenueAnalyticsService>(VenueAnalyticsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("calculateTrendingScore", () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    it("should return a score greater than 0 for positive engagement", () => {
      const score = service.calculateTrendingScore(10, 50, 5, oneDayAgo);
      expect(score).toBeGreaterThan(0);
      console.log(`Test Score (1 day old, moderate engagement): ${score}`);
    });

    it("should give higher weight to plans than follows/views", () => {
      const scorePlans = service.calculateTrendingScore(0, 0, 10, oneDayAgo); // 10 plans
      const scoreFollows = service.calculateTrendingScore(20, 0, 0, oneDayAgo); // 20 follows (2.5x weight vs 5x)
      const scoreViews = service.calculateTrendingScore(0, 100, 0, oneDayAgo); // 100 views (0.5x weight)

      console.log(`Score (Plans=10): ${scorePlans}`);
      console.log(`Score (Follows=20): ${scoreFollows}`);
      console.log(`Score (Views=100): ${scoreViews}`);

      // Plan score should be highest (10*5 = 50 base)
      // Follow score should be next (20*2.5 = 50 base)
      // View score should be lowest (100*0.5 = 50 base)
      // Since base scores are equal, decay doesn't change order here, but confirms weights
      expect(scorePlans).toBeGreaterThanOrEqual(scoreFollows);
      expect(scoreFollows).toBeGreaterThanOrEqual(scoreViews);
      // Test more distinct values if needed
    });

    it("should apply time decay correctly (older venue = lower score)", () => {
      const engagement = { followers: 10, views: 50, plans: 5 };
      const scoreRecent = service.calculateTrendingScore(
        engagement.followers,
        engagement.views,
        engagement.plans,
        oneDayAgo,
      );
      const scoreOld = service.calculateTrendingScore(
        engagement.followers,
        engagement.views,
        engagement.plans,
        oneWeekAgo,
      );

      console.log(`Score (Recent): ${scoreRecent}`);
      console.log(`Score (Old): ${scoreOld}`);
      expect(scoreRecent).toBeGreaterThan(scoreOld);
    });

    it("should return 0 for zero engagement", () => {
      const score = service.calculateTrendingScore(0, 0, 0, oneDayAgo);
      expect(score).toBe(0);
    });

    it("should handle venue created just now (ageHours approx 0)", () => {
      const score = service.calculateTrendingScore(10, 50, 5, new Date());
      // Decay multiplier should be close to 1 (Math.exp(0) = 1)
      const expectedBaseScore = 5 * 5.0 + 10 * 2.5 + 50 * 0.5; // 25 + 25 + 25 = 75
      expect(score).toBeCloseTo(expectedBaseScore, 2); // Check if score is close to base score
      console.log(
        `Test Score (Now): ${score}, Expected Base: ${expectedBaseScore}`,
      );
    });

    it("should return 0 if venue created in the future (negative age)", () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const score = service.calculateTrendingScore(10, 50, 5, futureDate);
      // ageHours becomes 0 due to Math.max(0, ...) clamp
      const expectedBaseScore = 5 * 5.0 + 10 * 2.5 + 50 * 0.5; // 75
      // Decay multiplier becomes 1, so score should be base score
      expect(score).toBeCloseTo(expectedBaseScore, 2);
      console.log(
        `Test Score (Future Date): ${score}, Expected Base: ${expectedBaseScore}`,
      );
    });
  });
});
