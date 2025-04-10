import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { getRepositoryToken } from "@nestjs/typeorm";
import { PlanTrendingService } from "../../services/plan-trending.service";
import { PlanAnalyticsService } from "../../services/plan-analytics.service";
import { EventRepository } from "../../repositories/event.repository";
import { EventAttendee } from "../../entities/event-attendee.entity";
import { Event } from "../../entities/event.entity";

describe("PlanTrendingService", () => {
  let service: PlanTrendingService;
  let planAnalyticsService: { calculateTrendingScore: jest.Mock };
  let eventRepository: {
    findOne: jest.Mock;
    updateTrendingScore: jest.Mock;
    findAll: jest.Mock;
  };
  let attendeeRepository: { count: jest.Mock };
  let cacheManager: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    // Create mocks
    planAnalyticsService = {
      calculateTrendingScore: jest.fn(),
    };

    eventRepository = {
      findOne: jest.fn(),
      updateTrendingScore: jest.fn(),
      findAll: jest.fn(),
    };

    attendeeRepository = {
      count: jest.fn(),
    };

    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanTrendingService,
        {
          provide: PlanAnalyticsService,
          useValue: planAnalyticsService,
        },
        {
          provide: EventRepository,
          useValue: eventRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
        {
          provide: getRepositoryToken(EventAttendee),
          useValue: attendeeRepository,
        },
      ],
    }).compile();

    service = module.get<PlanTrendingService>(PlanTrendingService);

    // Setup default mock returns
    cacheManager.get.mockResolvedValue(undefined);
    planAnalyticsService.calculateTrendingScore.mockReturnValue(42);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("updatePlanTrendingScore", () => {
    it("should return cached score if available", async () => {
      // Arrange
      const planId = "plan123";
      const cachedScore = 99;
      cacheManager.get.mockResolvedValue(cachedScore);

      // Act
      const result = await service.updatePlanTrendingScore(planId);

      // Assert
      expect(result).toBe(cachedScore);
      expect(eventRepository.findOne).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException if plan not found", async () => {
      // Arrange
      const planId = "nonexistent-plan";
      eventRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updatePlanTrendingScore(planId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should calculate and update trending score for a plan", async () => {
      // Arrange
      const planId = "plan123";
      const joinCount = 10;
      const viewCount = 20;
      const createdAt = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const expectedScore = 42;

      // Mock returns
      eventRepository.findOne.mockResolvedValue({
        id: planId,
        viewCount,
        createdAt,
      });
      attendeeRepository.count.mockResolvedValue(joinCount);

      // Act
      const result = await service.updatePlanTrendingScore(planId);

      // Assert
      expect(eventRepository.findOne).toHaveBeenCalledWith(planId);
      expect(attendeeRepository.count).toHaveBeenCalledWith({
        where: { eventId: planId },
      });

      // Check age calculation is approximately correct (24 hours ± 0.1)
      expect(planAnalyticsService.calculateTrendingScore).toHaveBeenCalledWith(
        joinCount,
        viewCount,
        expect.closeTo(24, 0.1),
      );

      expect(eventRepository.updateTrendingScore).toHaveBeenCalledWith(
        planId,
        expectedScore,
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        `plan_trending_score:${planId}`,
        expectedScore,
        3600,
      );
      expect(result).toBe(expectedScore);
    });
  });

  describe("refreshAllTrendingScores", () => {
    it("should update trending scores for all active plans in batches", async () => {
      // Arrange
      const now = new Date();
      const mockPlans = [{ id: "plan1" }, { id: "plan2" }, { id: "plan3" }];
      eventRepository.findAll.mockResolvedValue([mockPlans, mockPlans.length]);

      // Setup spy on updatePlanTrendingScore
      jest
        .spyOn(service, "updatePlanTrendingScore")
        .mockImplementation(async () => 42);

      // Act
      await service.refreshAllTrendingScores();

      // Assert
      expect(eventRepository.findAll).toHaveBeenCalledWith({
        startTimeFrom: expect.any(Date),
      });

      // Verify each plan had its score updated
      mockPlans.forEach((plan) => {
        expect(service.updatePlanTrendingScore).toHaveBeenCalledWith(plan.id);
      });
    });

    it("should handle errors during refresh", async () => {
      // Arrange
      const mockError = new Error("Test error");
      eventRepository.findAll.mockRejectedValue(mockError);

      // Mock console.error to prevent actual log
      jest.spyOn(console, "error").mockImplementation(() => {});

      // Act
      await service.refreshAllTrendingScores();

      // Assert
      expect(console.error).toHaveBeenCalledWith(
        "Failed to refresh trending scores:",
        mockError,
      );
    });
  });
});
