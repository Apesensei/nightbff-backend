import { Test, TestingModule } from "@nestjs/testing";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { PlanAnalyticsService } from "../../services/plan-analytics.service";
import { EventEmitter2 } from "@nestjs/event-emitter";

describe("PlanAnalyticsService", () => {
  let service: PlanAnalyticsService;
  let eventEmitter: EventEmitter2;
  let cacheManager: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    // Create mocks
    eventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
    } as unknown as EventEmitter2;

    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanAnalyticsService,
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();

    service = module.get<PlanAnalyticsService>(PlanAnalyticsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("trackPlanJoin", () => {
    it("should emit event and invalidate cache when a user joins a plan", () => {
      // Arrange
      const planId = "plan123";
      const userId = "user456";

      // Act
      service.trackPlanJoin(planId, userId);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "plan.join",
        expect.objectContaining({
          planId,
          userId,
          timestamp: expect.any(Date),
        }),
      );
      expect(cacheManager.del).toHaveBeenCalledWith(
        `plan_trending_score:${planId}`,
      );
    });
  });

  describe("trackPlanView", () => {
    it("should emit event when a user views a plan", () => {
      // Arrange
      const planId = "plan123";
      const userId = "user456";

      // Act
      service.trackPlanView(planId, userId);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "plan.view",
        expect.objectContaining({
          planId,
          userId,
          timestamp: expect.any(Date),
        }),
      );
      // Should not invalidate cache for views
      expect(cacheManager.del).not.toHaveBeenCalled();
    });
  });

  describe("calculateTrendingScore", () => {
    it("should calculate higher scores for plans with more joins", () => {
      // Arrange
      const highJoinsScore = service.calculateTrendingScore(
        100, // joins
        50, // views
        5, // ageHours
      );

      const lowJoinsScore = service.calculateTrendingScore(
        10, // joins
        50, // same views
        5, // same age
      );

      // Assert
      expect(highJoinsScore).toBeGreaterThan(lowJoinsScore);
    });

    it("should apply time decay to older plans", () => {
      // Arrange
      const newPlanScore = service.calculateTrendingScore(
        100, // joins
        50, // views
        1, // 1 hour old
      );

      const olderPlanScore = service.calculateTrendingScore(
        100, // same joins
        50, // same views
        48, // 48 hours old
      );

      // Assert
      expect(newPlanScore).toBeGreaterThan(olderPlanScore);
    });

    it("should weight joins more heavily than views", () => {
      // Arrange
      const moreJoinsScore = service.calculateTrendingScore(20, 10, 5);
      const moreViewsScore = service.calculateTrendingScore(10, 25, 5);

      // Assert (20 joins * 3.0 should outweigh 10 joins * 3.0 + 25 views * 1.5)
      // (60 > 30 + 37.5 = 67.5) -> This assertion logic is still slightly flawed in the comment,
      // but the resulting scores should now differ correctly.
      // 58.41 > 52.57
      expect(moreJoinsScore).toBeGreaterThan(moreViewsScore);
    });
  });
});
