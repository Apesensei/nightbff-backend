import { Test, TestingModule } from "@nestjs/testing";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";
import { VenueTrendingService } from "../../services/venue-trending.service";
import { VenueRepository } from "../../repositories/venue.repository";
import { VenueAnalyticsService } from "../../services/venue-analytics.service";
import { Venue } from "../../entities/venue.entity";

describe("VenueTrendingService", () => {
  let service: VenueTrendingService;
  let configService: { get: jest.Mock };
  let venueRepository: {
    findById: jest.Mock;
    updateTrendingScore: jest.Mock;
    findAllVenueIds: jest.Mock;
  };
  let venueAnalyticsService: {
    calculateTrendingScore: jest.Mock;
  };
  let cacheManager: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    stores: Array<{
      keys: jest.Mock;
      del: jest.Mock;
    }>;
  };

  beforeEach(async () => {
    // Create mocks
    configService = {
      get: jest.fn(),
    };

    venueRepository = {
      findById: jest.fn(),
      updateTrendingScore: jest.fn(),
      findAllVenueIds: jest.fn(),
    };

    venueAnalyticsService = {
      calculateTrendingScore: jest.fn(),
    };

    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      stores: [
        {
          keys: jest.fn(),
          del: jest.fn(),
        },
      ],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenueTrendingService,
        {
          provide: VenueRepository,
          useValue: venueRepository,
        },
        {
          provide: VenueAnalyticsService,
          useValue: venueAnalyticsService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<VenueTrendingService>(VenueTrendingService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("updateVenueTrendingScore", () => {
    it("should update trending score for a venue", async () => {
      // Arrange
      const venueId = "venue-123";
      const mockVenue = {
        id: venueId,
        name: "Test Venue",
        followerCount: 10,
        viewCount: 100,
        associatedPlanCount: 5,
        createdAt: new Date("2023-01-01"),
      } as Venue;
      const calculatedScore = 42.5;

      venueRepository.findById.mockResolvedValue(mockVenue);
      venueAnalyticsService.calculateTrendingScore.mockReturnValue(
        calculatedScore,
      );
      venueRepository.updateTrendingScore.mockResolvedValue(undefined);
      cacheManager.set.mockResolvedValue(undefined);

      // Act
      const result = await service.updateVenueTrendingScore(venueId);

      // Assert
      expect(result).toEqual(calculatedScore);
      expect(venueRepository.findById).toHaveBeenCalledWith(venueId);
      expect(venueAnalyticsService.calculateTrendingScore).toHaveBeenCalledWith(
        mockVenue.followerCount,
        mockVenue.viewCount,
        mockVenue.associatedPlanCount,
        mockVenue.createdAt,
      );
      expect(venueRepository.updateTrendingScore).toHaveBeenCalledWith(
        venueId,
        calculatedScore,
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        `venue_trending_score:${venueId}`,
        calculatedScore,
        expect.any(Number),
      );
    });

    it("should return null when venue not found", async () => {
      // Arrange
      const venueId = "non-existent-venue";
      venueRepository.findById.mockResolvedValue(null);

      // Act
      const result = await service.updateVenueTrendingScore(venueId);

      // Assert
      expect(result).toBeNull();
      expect(venueRepository.findById).toHaveBeenCalledWith(venueId);
      expect(
        venueAnalyticsService.calculateTrendingScore,
      ).not.toHaveBeenCalled();
      expect(venueRepository.updateTrendingScore).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it("should handle errors and return null", async () => {
      // Arrange
      const venueId = "venue-123";
      venueRepository.findById.mockRejectedValue(new Error("DB Error"));

      // Act
      const result = await service.updateVenueTrendingScore(venueId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("refreshAllTrendingScores", () => {
    it("should process all venues in batches", async () => {
      // Arrange
      const venueIds = ["venue-1", "venue-2", "venue-3"];
      venueRepository.findAllVenueIds.mockResolvedValue(venueIds);

      // Mock successful update for each venue
      venueIds.forEach((id) => {
        const mockVenue = {
          id,
          followerCount: 10,
          viewCount: 100,
          associatedPlanCount: 5,
          createdAt: new Date("2023-01-01"),
        } as Venue;

        // Create a separate jest.fn for each venue to track separate calls
        const updateScoreMock = jest.spyOn(service, "updateVenueTrendingScore");
        updateScoreMock.mockResolvedValue(42.5);

        venueRepository.findById.mockResolvedValue(mockVenue);
      });

      cacheManager.stores[0].keys.mockResolvedValue(["trending_venues:default"]);
      cacheManager.del.mockResolvedValue(undefined);

      // Act
      await service.refreshAllTrendingScores();

      // Assert
      expect(venueRepository.findAllVenueIds).toHaveBeenCalledWith(true);
      expect(service.updateVenueTrendingScore).toHaveBeenCalledTimes(
        venueIds.length,
      );
      venueIds.forEach((id) => {
        expect(service.updateVenueTrendingScore).toHaveBeenCalledWith(id);
      });
      expect(cacheManager.stores[0].keys).toHaveBeenCalledWith("trending_venues:*");
      expect(cacheManager.del).toHaveBeenCalledWith(
        "trending_venues:default",
      );
    });

    it("should handle empty venue list", async () => {
      // Arrange
      venueRepository.findAllVenueIds.mockResolvedValue([]);
      // Create a spy on the method *before* calling the function under test
      const updateSpy = jest.spyOn(service, "updateVenueTrendingScore");

      // Act
      await service.refreshAllTrendingScores();

      // Assert
      expect(venueRepository.findAllVenueIds).toHaveBeenCalledWith(true);
      // Assert on the spy
      expect(updateSpy).not.toHaveBeenCalled();

      // Restore the original implementation (good practice)
      updateSpy.mockRestore();
    });

    it("should handle venue update failures", async () => {
      // Arrange
      const venueIds = ["venue-1", "venue-2"];
      venueRepository.findAllVenueIds.mockResolvedValue(venueIds);

      // Mock first venue update success, second venue update failure
      const updateScoreMock = jest.spyOn(service, "updateVenueTrendingScore");
      updateScoreMock.mockResolvedValueOnce(42.5); // First call succeeds
      updateScoreMock.mockResolvedValueOnce(null); // Second call fails (returns null)

      cacheManager.stores[0].keys.mockResolvedValue([]);

      // Act
      await service.refreshAllTrendingScores();

      // Assert
      expect(venueRepository.findAllVenueIds).toHaveBeenCalledWith(true);
      expect(service.updateVenueTrendingScore).toHaveBeenCalledTimes(
        venueIds.length,
      );
      expect(service.updateVenueTrendingScore).toHaveBeenCalledWith("venue-1");
      expect(service.updateVenueTrendingScore).toHaveBeenCalledWith("venue-2");
    });
  });
});
