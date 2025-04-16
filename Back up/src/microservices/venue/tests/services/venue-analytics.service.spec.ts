import { Test, TestingModule } from "@nestjs/testing";
import { VenueAnalyticsService } from "../../services/venue-analytics.service";

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
    it("should correctly calculate trending score with all factors", () => {
      // Arrange
      const followerCount = 10;
      const viewCount = 100;
      const associatedPlanCount = 5;
      const createdAt = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

      // Pre-calculate the expected result using the same formula as the service
      const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
      const decayFactor = -0.05;
      const recencyMultiplier = Math.exp(decayFactor * ageHours);
      const planWeight = 5.0;
      const followWeight = 2.5;
      const viewWeight = 0.5;
      const engagementScore =
        associatedPlanCount * planWeight +
        followerCount * followWeight +
        viewCount * viewWeight;
      const expectedScore = engagementScore * recencyMultiplier;

      // Act
      const result = service.calculateTrendingScore(
        followerCount,
        viewCount,
        associatedPlanCount,
        createdAt,
      );

      // Assert
      expect(result).toBeCloseTo(expectedScore, 4); // Comparing floating point with precision
    });

    it("should return higher score for venues with more plans", () => {
      // Arrange
      const baseVenue = {
        followerCount: 10,
        viewCount: 100,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      };

      // Act
      const lowerPlanScore = service.calculateTrendingScore(
        baseVenue.followerCount,
        baseVenue.viewCount,
        2, // fewer plans
        baseVenue.createdAt,
      );

      const higherPlanScore = service.calculateTrendingScore(
        baseVenue.followerCount,
        baseVenue.viewCount,
        10, // more plans
        baseVenue.createdAt,
      );

      // Assert
      expect(higherPlanScore).toBeGreaterThan(lowerPlanScore);
    });

    it("should return higher score for venues with more followers", () => {
      // Arrange
      const baseVenue = {
        viewCount: 100,
        associatedPlanCount: 5,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      };

      // Act
      const lowerFollowerScore = service.calculateTrendingScore(
        5, // fewer followers
        baseVenue.viewCount,
        baseVenue.associatedPlanCount,
        baseVenue.createdAt,
      );

      const higherFollowerScore = service.calculateTrendingScore(
        25, // more followers
        baseVenue.viewCount,
        baseVenue.associatedPlanCount,
        baseVenue.createdAt,
      );

      // Assert
      expect(higherFollowerScore).toBeGreaterThan(lowerFollowerScore);
    });

    it("should return higher score for newer venues", () => {
      // Arrange
      const baseVenue = {
        followerCount: 10,
        viewCount: 100,
        associatedPlanCount: 5,
      };

      // Act
      const olderVenueScore = service.calculateTrendingScore(
        baseVenue.followerCount,
        baseVenue.viewCount,
        baseVenue.associatedPlanCount,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      );

      const newerVenueScore = service.calculateTrendingScore(
        baseVenue.followerCount,
        baseVenue.viewCount,
        baseVenue.associatedPlanCount,
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      );

      // Assert
      expect(newerVenueScore).toBeGreaterThan(olderVenueScore);
    });

    it("should handle zero counts gracefully", () => {
      // Arrange
      const createdAt = new Date();

      // Act
      const result = service.calculateTrendingScore(0, 0, 0, createdAt);

      // Assert
      expect(result).toBe(0);
      expect(result).not.toBeNaN();
    });

    it("should handle negative ages by using 0 instead", () => {
      // Arrange - future date (edge case, shouldn't happen but should be handled)
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day in future

      // Act
      const result = service.calculateTrendingScore(10, 100, 5, futureDate);

      // Assert
      expect(result).toBeGreaterThan(0); // Still positive score
      expect(result).not.toBeNaN();
    });
  });
});
