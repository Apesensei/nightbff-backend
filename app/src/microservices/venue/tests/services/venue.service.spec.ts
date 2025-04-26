import { Test, TestingModule } from "@nestjs/testing";
import { VenueService } from "../../services/venue.service";
import {
  VenueRepository,
  VenueSearchOptions,
} from "../../repositories/venue.repository";
import { EventRepository } from "../../../event/repositories/event.repository";
import { InterestService } from "../../../interest/services/interest.service";
import { Logger } from "@nestjs/common";
import { Venue } from "../../entities/venue.entity";
import { Event } from "../../../event/entities/event.entity";
import { VenueSearchDto, VenueSortBy } from "../../dto/venue-search.dto";
import { VenueResponseDto } from "../../dto/venue-response.dto";
import { VenueEventRepository } from "../../repositories/venue-event.repository";
import { VenueReviewRepository } from "../../repositories/venue-review.repository";
import { VenuePhotoRepository } from "../../repositories/venue-photo.repository";
import { VenueCacheService } from "../../services/venue-cache.service";
import { VenueTrendingService } from "../../services/venue-trending.service";
import { FollowRepository } from "../../../user/repositories/follow.repository";
import { CacheModule } from "@nestjs/cache-manager";
import { EventService } from "../../../event/event.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PlanAnalyticsService } from "../../../event/services/plan-analytics.service";
import { PlanTrendingService } from "../../../event/services/plan-trending.service";
import { VenueStatus } from "../../entities/venue.entity";
import { ConfigService } from "@nestjs/config";
import { ScannedAreaRepository } from "../../repositories/scanned-area.repository";
import { VenueScanProducerService } from "../../services/venue-scan-producer.service";

// Mock implementations (replace with actual mock utilities if available)
const createMockVenueRepository = (): Partial<
  Record<keyof VenueRepository, jest.Mock>
> => ({
  search: jest.fn(),
  findById: jest.fn(), // Add other methods if VenueService calls them indirectly
});

const createMockInterestService = (): Partial<
  Record<keyof InterestService, jest.Mock>
> => ({
  getUserInterests: jest.fn(),
  getEventIdsByInterest: jest.fn(),
});

const createMockEventRepository = (): Partial<
  Record<keyof EventRepository, jest.Mock>
> => ({
  findByIdsWithDetails: jest.fn(),
});

// Add new mock factory functions
const createMockVenueEventRepository = (): Partial<
  Record<keyof VenueEventRepository, jest.Mock>
> => ({
  findByVenueId: jest.fn(),
  create: jest.fn(),
  // Add other methods if needed
});

const createMockVenueReviewRepository = (): Partial<
  Record<keyof VenueReviewRepository, jest.Mock>
> => ({
  findByVenueId: jest.fn(),
  findByUserId: jest.fn(),
  create: jest.fn(),
  calculateAverageRating: jest.fn(),
  countByVenueId: jest.fn(),
  // Add other methods if needed
});

const createMockVenuePhotoRepository = (): Partial<
  Record<keyof VenuePhotoRepository, jest.Mock>
> => ({
  findByVenueId: jest.fn(),
  create: jest.fn(),
  // Add other methods if needed
});

const createMockVenueCacheService = (): Partial<
  Record<keyof VenueCacheService, jest.Mock>
> => ({
  get: jest.fn(),
  set: jest.fn(),
  invalidate: jest.fn(),
  invalidateSelective: jest.fn(),
  clearAll: jest.fn(),
  trackAdminEdit: jest.fn(),
  getCacheVersion: jest.fn(),
});

const createMockVenueTrendingService = (): Partial<
  Record<keyof VenueTrendingService, jest.Mock>
> => ({
  updateVenueTrendingScore: jest.fn(),
  refreshAllTrendingScores: jest.fn(),
});

const createMockFollowRepository = (): Partial<
  Record<keyof FollowRepository, jest.Mock>
> => ({
  createFollow: jest.fn(),
  deleteFollow: jest.fn(),
  findFollow: jest.fn(),
  countFollowers: jest.fn(),
  findFollowedVenues: jest.fn(),
});

const createMockEventService = (): Partial<
  Record<keyof EventService, jest.Mock>
> => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  getVenueIdsForEvents: jest.fn(),
});

// Added mock factories for EventService dependencies
const createMockEventEmitter = (): Partial<
  Record<keyof EventEmitter2, jest.Mock>
> => ({
  emit: jest.fn(),
});

const createMockPlanAnalyticsService = (): Partial<
  Record<keyof PlanAnalyticsService, jest.Mock>
> => ({
  calculateTrendingScore: jest.fn(),
  trackPlanJoin: jest.fn(),
  trackPlanView: jest.fn(),
});

const createMockPlanTrendingService = (): Partial<
  Record<keyof PlanTrendingService, jest.Mock>
> => ({
  updatePlanTrendingScore: jest.fn(),
  refreshAllTrendingScores: jest.fn(),
});

const createMockConfigService = (): Partial<
  Record<keyof ConfigService, jest.Mock>
> => ({
  get: jest.fn(),
});

const createMockScannedAreaRepository = (): Partial<
  Record<keyof ScannedAreaRepository, jest.Mock>
> => ({
  findLastScanned: jest.fn(),
  upsertLastScanned: jest.fn(),
});

const createMockVenueScanProducerService = (): Partial<
  Record<keyof VenueScanProducerService, jest.Mock>
> => ({
  enqueueScanIfStale: jest.fn().mockResolvedValue(undefined),
});

describe("VenueService", () => {
  let service: VenueService;
  let mockVenueRepository: ReturnType<typeof createMockVenueRepository>;
  let mockInterestService: ReturnType<typeof createMockInterestService>;
  let mockEventRepository: ReturnType<typeof createMockEventRepository>;
  let mockVenueEventRepository: ReturnType<
    typeof createMockVenueEventRepository
  >;
  let mockVenueReviewRepository: ReturnType<
    typeof createMockVenueReviewRepository
  >;
  let mockVenuePhotoRepository: ReturnType<
    typeof createMockVenuePhotoRepository
  >;
  let mockVenueCacheService: ReturnType<typeof createMockVenueCacheService>;
  let mockVenueTrendingService: ReturnType<
    typeof createMockVenueTrendingService
  >;
  let mockFollowRepository: ReturnType<typeof createMockFollowRepository>;
  let mockEventService: ReturnType<typeof createMockEventService>;
  let mockEventEmitter: ReturnType<typeof createMockEventEmitter>;
  let mockPlanAnalyticsService: ReturnType<
    typeof createMockPlanAnalyticsService
  >;
  let mockPlanTrendingService: ReturnType<typeof createMockPlanTrendingService>;
  let mockConfigService: ReturnType<typeof createMockConfigService>;
  let mockScannedAreaRepository: ReturnType<typeof createMockScannedAreaRepository>;
  let mockVenueScanProducerService: ReturnType<typeof createMockVenueScanProducerService>;
  let logger: Logger;
  let loggerDebugSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;

  // Reusable mock data (adjust as needed)
  const mockVenue: Venue = {
    id: "venue-1",
    name: "Test Venue",
    location: 'POINT(-74.006 40.7128)',
    address: "123 Test St",
    rating: 4.5,
    reviewCount: 100,
    popularity: 500,
    status: VenueStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    viewCount: 1000,
    followerCount: 50,
    associatedPlanCount: 5,
    trendingScore: 0.8,
    metadata: {},
    description: undefined,
    googlePlaceId: undefined,
    priceLevel: undefined,
    isFeatured: false,
    website: undefined,
    phone: undefined,
    isOpenNow: undefined,
    adminOverrides: undefined,
    lastModifiedBy: undefined,
    lastModifiedAt: new Date(),
    venueTypes: [],
    hours: [],
    events: [],
    reviews: [],
    venuePhotos: [],
    googleRating: undefined,
    googleRatingsTotal: undefined,
    lastRefreshed: undefined,
  } as Venue;

  const mockVenueDto: VenueResponseDto = {
    id: "venue-1",
    name: "Test Venue",
    latitude: 0,
    longitude: 0,
    description: undefined,
    address: "123 Test St",
    primaryPhotoUrl: null,
    rating: 4.5,
    followerCount: 50,
    isFollowing: false,
  } as VenueResponseDto;

  const mockUserId = "user-test-id";
  const mockInterestId = "interest-test-id";

  beforeEach(async () => {
    mockVenueRepository = createMockVenueRepository();
    mockInterestService = createMockInterestService();
    mockEventRepository = createMockEventRepository();
    mockVenueEventRepository = createMockVenueEventRepository();
    mockVenueReviewRepository = createMockVenueReviewRepository();
    mockVenuePhotoRepository = createMockVenuePhotoRepository();
    mockVenueCacheService = createMockVenueCacheService();
    mockVenueTrendingService = createMockVenueTrendingService();
    mockFollowRepository = createMockFollowRepository();
    mockEventService = createMockEventService();
    mockEventEmitter = createMockEventEmitter();
    mockPlanAnalyticsService = createMockPlanAnalyticsService();
    mockPlanTrendingService = createMockPlanTrendingService();
    mockConfigService = createMockConfigService();
    mockScannedAreaRepository = createMockScannedAreaRepository();
    mockVenueScanProducerService = createMockVenueScanProducerService();

    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.register()],
      providers: [
        VenueService,
        {
          provide: VenueRepository,
          useValue: mockVenueRepository,
        },
        {
          provide: InterestService,
          useValue: mockInterestService,
        },
        {
          provide: EventRepository,
          useValue: mockEventRepository,
        },
        {
          provide: VenueEventRepository,
          useValue: mockVenueEventRepository,
        },
        {
          provide: VenueReviewRepository,
          useValue: mockVenueReviewRepository,
        },
        {
          provide: VenuePhotoRepository,
          useValue: mockVenuePhotoRepository,
        },
        {
          provide: VenueCacheService,
          useValue: mockVenueCacheService,
        },
        {
          provide: VenueTrendingService,
          useValue: mockVenueTrendingService,
        },
        {
          provide: FollowRepository,
          useValue: mockFollowRepository,
        },
        {
          provide: EventService,
          useValue: mockEventService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: PlanAnalyticsService,
          useValue: mockPlanAnalyticsService,
        },
        {
          provide: PlanTrendingService,
          useValue: mockPlanTrendingService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: ScannedAreaRepository,
          useValue: mockScannedAreaRepository,
        },
        {
          provide: VenueScanProducerService,
          useValue: mockVenueScanProducerService,
        },
        Logger,
      ],
    }).compile();

    service = module.get<VenueService>(VenueService);

    // Spy on logger
    logger = (service as any).logger;
    loggerDebugSpy = jest.spyOn(logger, "debug").mockImplementation();
    loggerErrorSpy = jest.spyOn(logger, "error").mockImplementation();
    loggerWarnSpy = jest.spyOn(logger, "warn").mockImplementation();
    loggerLogSpy = jest.spyOn(logger, "log").mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    loggerDebugSpy.mockRestore();
    loggerErrorSpy.mockRestore();
    loggerWarnSpy.mockRestore();
    loggerLogSpy.mockRestore();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // --- Test cases for searchVenues will be added here ---
  describe("searchVenues", () => {
    it("(Base Case - No Interest ID) should call repository with standard options", async () => {
      // Arrange
      const searchDto: VenueSearchDto = {
        query: "test",
        latitude: 40.7,
        longitude: -74,
        radius: 5,
        limit: 10,
        offset: 0,
        sortBy: VenueSortBy.DISTANCE,
        order: "ASC",
      };
      const mockVenues = [mockVenue]; // Array of Venue entities
      const mockTotal = 1;
      const expectedRepoOptions: VenueSearchOptions = {
        query: searchDto.query,
        latitude: searchDto.latitude,
        longitude: searchDto.longitude,
        radiusMiles: searchDto.radius,
        limit: searchDto.limit,
        offset: searchDto.offset,
        sortBy: searchDto.sortBy,
        order: searchDto.order,
        openNow: searchDto.openNow,
        priceLevel: searchDto.priceLevel,
        venueTypeIds: searchDto.venueTypes,
      };

      mockVenueRepository.search!.mockResolvedValue([mockVenues, mockTotal]);
      // Mock the transformation - IMPORTANT: Ensure this mock accurately reflects
      // the result of service.transformToVenueResponseDto(mockVenue, mockUserId)
      jest
        .spyOn(service as any, "transformToVenueResponseDto")
        .mockResolvedValue(mockVenueDto);

      // Act
      const result = await service.searchVenues(searchDto, mockUserId);

      // Assert
      expect(mockInterestService.getUserInterests).not.toHaveBeenCalled();
      expect(mockInterestService.getEventIdsByInterest).not.toHaveBeenCalled();
      expect(mockEventRepository.findByIdsWithDetails).not.toHaveBeenCalled();

      expect(mockVenueRepository.search).toHaveBeenCalledTimes(1);
      // Check that the repository was called with the expected standard options
      // Explicitly check all expected keys are present and match
      expect(mockVenueRepository.search).toHaveBeenCalledWith(
        expect.objectContaining(expectedRepoOptions),
      );

      // Verify the structure of the paginated response
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(mockVenueDto);
      expect(result.total).toEqual(mockTotal);
      expect(result.page).toEqual(1); // offset 0 / limit 10 + 1
      expect(result.limit).toEqual(searchDto.limit);
      expect(result.hasMore).toEqual(false); // total 1 <= offset 0 + limit 10
    });

    it("(Regular Interest ID - Success Path) should filter, sort by event score, and paginate", async () => {
      // Arrange
      const searchDto: VenueSearchDto = {
        interestId: mockInterestId,
        limit: 5,
        offset: 0, // Get the first page
      };
      const mockEvent1: Partial<Event> = {
        id: "e1",
        venueId: "v1",
        trendingScore: 100,
      };
      const mockEvent2: Partial<Event> = {
        id: "e2",
        venueId: "v2",
        trendingScore: 50,
      };
      const mockEvent3: Partial<Event> = {
        id: "e3",
        venueId: "v1",
        trendingScore: 75,
      }; // Same venue, different score
      const mockEvent4: Partial<Event> = {
        id: "e4",
        venueId: "v3",
        trendingScore: 10,
      };
      const mockEventIdsFromInterest = ["e1", "e2", "e3", "e4"];
      const mockEventsFromRepo = [
        mockEvent1,
        mockEvent2,
        mockEvent3,
        mockEvent4,
      ];
      const mockVenue1: Venue = {
        ...mockVenue,
        id: "v1",
        name: "Venue 1",
      } as Venue;
      const mockVenue2: Venue = {
        ...mockVenue,
        id: "v2",
        name: "Venue 2",
      } as Venue;
      const mockVenue3: Venue = {
        ...mockVenue,
        id: "v3",
        name: "Venue 3",
      } as Venue;
      const mockFetchedVenuesFromRepo = [mockVenue1, mockVenue2, mockVenue3]; // Repo returns all matching venues
      const expectedVenueIdsToSearch = ["v1", "v2", "v3"];

      // Mock the dependency chain
      mockInterestService.getEventIdsByInterest!.mockResolvedValue(
        mockEventIdsFromInterest,
      );
      mockEventRepository.findByIdsWithDetails!.mockResolvedValue(
        mockEventsFromRepo,
      );
      // Venue repo is called with venueIds, NO pagination/sort
      mockVenueRepository.search!.mockResolvedValue([
        mockFetchedVenuesFromRepo,
        mockFetchedVenuesFromRepo.length, // Repo returns total *it* found
      ]);

      // Mock the transformation (assuming it maps venue directly)
      const mockVenueDto1 = {
        ...mockVenueDto,
        id: "v1",
        name: "Venue 1",
      } as VenueResponseDto;
      const mockVenueDto2 = {
        ...mockVenueDto,
        id: "v2",
        name: "Venue 2",
      } as VenueResponseDto;
      const mockVenueDto3 = {
        ...mockVenueDto,
        id: "v3",
        name: "Venue 3",
      } as VenueResponseDto;
      const transformSpy = jest
        .spyOn(service as any, "transformToVenueResponseDto")
        .mockImplementation(async (venue: Venue) => {
          if (venue.id === "v1") return mockVenueDto1;
          if (venue.id === "v2") return mockVenueDto2;
          if (venue.id === "v3") return mockVenueDto3;
          return mockVenueDto; // Fallback
        });

      // Act
      const result = await service.searchVenues(searchDto, mockUserId);

      // Assert
      // Verify mock calls
      expect(mockInterestService.getEventIdsByInterest).toHaveBeenCalledWith(
        mockInterestId,
      );
      expect(mockEventRepository.findByIdsWithDetails).toHaveBeenCalledWith(
        mockEventIdsFromInterest,
        ["id", "venueId", "trendingScore"], // Ensure correct fields requested
      );
      expect(mockVenueRepository.search).toHaveBeenCalledTimes(1);
      // Check only for venueIds, as service handles sort/pagination
      expect(mockVenueRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          venueIds: expectedVenueIdsToSearch, // Filtered by venue IDs
        }),
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Performing service-layer sorting"),
      );
      expect(transformSpy).toHaveBeenCalledTimes(
        mockFetchedVenuesFromRepo.length,
      ); // Transform called for each fetched venue

      // Verify sorting and pagination
      // Expected order based on score: v1 (100+75=175), v2 (50), v3 (10)
      expect(result.items).toHaveLength(3); // Manual pagination applied later, initial sort has all
      expect(result.items[0].id).toEqual("v1");
      expect(result.items[1].id).toEqual("v2");
      expect(result.items[2].id).toEqual("v3");

      // Verify final paginated response structure (manual slice applied in service)
      // Since limit=5, offset=0, and only 3 items, all should be returned
      expect(result.total).toEqual(3); // Total is length *after* service-layer sort, before slice
      expect(result.page).toEqual(1);
      expect(result.limit).toEqual(5);
      expect(result.hasMore).toEqual(false);

      transformSpy.mockRestore(); // Clean up spy
    });

    it("(Regular Interest ID - Interest -> No Events) should return empty if interestService returns no event IDs", async () => {
      // Arrange
      const searchDto: VenueSearchDto = {
        interestId: mockInterestId,
        limit: 10,
        offset: 0,
      };
      mockInterestService.getEventIdsByInterest!.mockResolvedValue([]); // No events for this interest

      // Act
      const result = await service.searchVenues(searchDto, mockUserId);

      // Assert
      expect(mockInterestService.getEventIdsByInterest).toHaveBeenCalledWith(
        mockInterestId,
      );
      // Downstream mocks should NOT be called
      expect(mockEventRepository.findByIdsWithDetails).not.toHaveBeenCalled();
      expect(mockVenueRepository.search).not.toHaveBeenCalled();
      // Verify empty paginated response
      expect(result.items).toEqual([]);
      expect(result.total).toEqual(0);
      expect(result.page).toEqual(1);
      expect(result.limit).toEqual(10);
      expect(result.hasMore).toEqual(false);
    });

    it("(Regular Interest ID - Interest+Events -> No Venues) should return empty if events have no associated venues", async () => {
      // Arrange
      const searchDto: VenueSearchDto = {
        interestId: mockInterestId,
        limit: 10,
        offset: 0,
      };
      const mockEventsWithNullVenue: Partial<Event>[] = [
        { id: "e1", venueId: undefined, trendingScore: 10 },
        { id: "e2", venueId: undefined, trendingScore: 5 },
      ];

      mockInterestService.getEventIdsByInterest!.mockResolvedValue([
        "e1",
        "e2",
      ]);
      mockEventRepository.findByIdsWithDetails!.mockResolvedValue(
        mockEventsWithNullVenue,
      );

      // Act
      const result = await service.searchVenues(searchDto, mockUserId);

      // Assert
      expect(mockInterestService.getEventIdsByInterest).toHaveBeenCalledWith(
        mockInterestId,
      );
      expect(mockEventRepository.findByIdsWithDetails).toHaveBeenCalledWith(
        ["e1", "e2"],
        ["id", "venueId", "trendingScore"],
      );
      // Venue repository should not be called as venueIds will be empty
      expect(mockVenueRepository.search).not.toHaveBeenCalled();
      // Verify empty paginated response
      expect(result.items).toEqual([]);
      expect(result.total).toEqual(0);
      expect(result.page).toEqual(1);
      expect(result.limit).toEqual(10);
      expect(result.hasMore).toEqual(false);
    });

    it("(Regular Interest ID - Graceful Degradation on Error) should revert to standard search if InterestService fails", async () => {
      // Arrange
      const searchDto: VenueSearchDto = {
        interestId: mockInterestId,
        query: "test fallback", // Include other params for standard search
        limit: 5,
        offset: 0,
      };
      const error = new Error("Interest Service Timeout");
      mockInterestService.getEventIdsByInterest!.mockRejectedValue(error);

      // Mock the repository call for the *fallback* standard search
      const mockFallbackVenues = [{ ...mockVenue, id: "v-fallback" } as Venue];
      const mockFallbackTotal = 1;
      mockVenueRepository.search!.mockResolvedValue([
        mockFallbackVenues,
        mockFallbackTotal,
      ]);
      // Mock transformation for the fallback result
      const mockFallbackDto = {
        ...mockVenueDto,
        id: "v-fallback",
      } as VenueResponseDto;
      const transformSpy = jest
        .spyOn(service as any, "transformToVenueResponseDto")
        .mockResolvedValue(mockFallbackDto);

      // Act
      const result = await service.searchVenues(searchDto, mockUserId);

      // Assert
      expect(mockInterestService.getEventIdsByInterest).toHaveBeenCalledWith(
        mockInterestId,
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Error during interest filter processing for ${mockInterestId}`,
        ),
        error.stack,
      );
      // Downstream event repo should not be called
      expect(mockEventRepository.findByIdsWithDetails).not.toHaveBeenCalled();
      // Venue repo SHOULD be called, but with standard options (reverted)
      expect(mockVenueRepository.search).toHaveBeenCalledTimes(1);
      expect(mockVenueRepository.search).toHaveBeenCalledWith(
        // Check for specific standard search parameters, exclude venueIds
        expect.objectContaining({
          query: searchDto.query,
          limit: searchDto.limit,
          offset: searchDto.offset,
        }),
      );
      // Verify the result matches the fallback standard search
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toEqual("v-fallback");
      expect(result.total).toEqual(mockFallbackTotal);
      expect(result.page).toEqual(1);
      expect(result.limit).toEqual(5);
      expect(result.hasMore).toEqual(false);

      transformSpy.mockRestore();
    });

    // --- 'For You' test cases ---

    it('("For You" - Success Path) should resolve interest, filter, sort, and paginate', async () => {
      // Arrange
      const searchDto: VenueSearchDto = {
        interestId: "forYou",
        limit: 5,
        offset: 0,
      };
      const resolvedInterestId = "interest-music";
      const mockUserInterestsData = [{ id: resolvedInterestId, name: "Music" }];
      const mockEventIdsFromInterest = ["e1", "e2", "e3"];
      const mockEvent1: Partial<Event> = {
        id: "e1",
        venueId: "v1",
        trendingScore: 150,
      };
      const mockEvent2: Partial<Event> = {
        id: "e2",
        venueId: "v2",
        trendingScore: 50,
      };
      const mockEvent3: Partial<Event> = {
        id: "e3",
        venueId: "v1",
        trendingScore: 25,
      }; // v1 total = 175
      const mockEventsFromRepo = [mockEvent1, mockEvent2, mockEvent3];
      const mockVenue1: Venue = {
        ...mockVenue,
        id: "v1",
        name: "Venue 1 For You",
      } as Venue;
      const mockVenue2: Venue = {
        ...mockVenue,
        id: "v2",
        name: "Venue 2 For You",
      } as Venue;
      const mockFetchedVenuesFromRepo = [mockVenue1, mockVenue2];
      const expectedVenueIdsToSearch = ["v1", "v2"];

      // Mock the dependency chain
      mockInterestService.getUserInterests!.mockResolvedValue(
        mockUserInterestsData,
      );
      mockInterestService.getEventIdsByInterest!.mockResolvedValue(
        mockEventIdsFromInterest,
      );
      mockEventRepository.findByIdsWithDetails!.mockResolvedValue(
        mockEventsFromRepo,
      );
      mockVenueRepository.search!.mockResolvedValue([
        mockFetchedVenuesFromRepo,
        mockFetchedVenuesFromRepo.length,
      ]);

      // Mock transformation
      const mockVenueDto1 = {
        ...mockVenueDto,
        id: "v1",
        name: "Venue 1 For You",
      } as VenueResponseDto;
      const mockVenueDto2 = {
        ...mockVenueDto,
        id: "v2",
        name: "Venue 2 For You",
      } as VenueResponseDto;
      const transformSpy = jest
        .spyOn(service as any, "transformToVenueResponseDto")
        .mockImplementation(async (venue: Venue) => {
          if (venue.id === "v1") return mockVenueDto1;
          if (venue.id === "v2") return mockVenueDto2;
          return mockVenueDto;
        });

      // Act
      const result = await service.searchVenues(searchDto, mockUserId);

      // Assert
      expect(mockInterestService.getUserInterests).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(mockInterestService.getEventIdsByInterest).toHaveBeenCalledWith(
        resolvedInterestId,
      );
      expect(mockEventRepository.findByIdsWithDetails).toHaveBeenCalledWith(
        mockEventIdsFromInterest,
        ["id", "venueId", "trendingScore"],
      );
      // Check only for venueIds, as service handles sort/pagination
      expect(mockVenueRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          venueIds: expectedVenueIdsToSearch,
        }),
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Performing service-layer sorting"),
      );

      // Verify sorting (v1=175, v2=50)
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toEqual("v1");
      expect(result.items[1].id).toEqual("v2");

      // Verify pagination (limit 5, offset 0, total 2)
      expect(result.total).toEqual(2);
      expect(result.page).toEqual(1);
      expect(result.limit).toEqual(5);
      expect(result.hasMore).toEqual(false);

      transformSpy.mockRestore();
    });

    it('("For You" - User has NO Interests) should return empty', async () => {
      // Arrange
      const searchDto: VenueSearchDto = {
        interestId: "forYou",
        limit: 10,
        offset: 0,
      };
      mockInterestService.getUserInterests!.mockResolvedValue([]); // User has no interests

      // Act
      const result = await service.searchVenues(searchDto, mockUserId);

      // Assert
      expect(mockInterestService.getUserInterests).toHaveBeenCalledWith(
        mockUserId,
      );
      // Downstream mocks should NOT be called
      expect(mockInterestService.getEventIdsByInterest).not.toHaveBeenCalled();
      expect(mockEventRepository.findByIdsWithDetails).not.toHaveBeenCalled();
      expect(mockVenueRepository.search).not.toHaveBeenCalled();
      // Verify empty paginated response
      expect(result.items).toEqual([]);
      expect(result.total).toEqual(0);
      expect(result.page).toEqual(1);
      expect(result.limit).toEqual(10);
      expect(result.hasMore).toEqual(false);
    });

    it('("For You" - Error Fetching Interests) should return empty and log error', async () => {
      // Arrange
      const searchDto: VenueSearchDto = {
        interestId: "forYou",
        limit: 10,
        offset: 0,
      };
      const error = new Error("Failed to fetch interests");
      mockInterestService.getUserInterests!.mockRejectedValue(error);

      // Act
      const result = await service.searchVenues(searchDto, mockUserId);

      // Assert
      expect(mockInterestService.getUserInterests).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Error fetching user interests for 'forYou' venue search (userId: ${mockUserId})`,
        ),
        error.stack,
      );
      // Downstream mocks should NOT be called
      expect(mockInterestService.getEventIdsByInterest).not.toHaveBeenCalled();
      expect(mockEventRepository.findByIdsWithDetails).not.toHaveBeenCalled();
      expect(mockVenueRepository.search).not.toHaveBeenCalled();
      // Verify empty paginated response
      expect(result.items).toEqual([]);
      expect(result.total).toEqual(0);
      expect(result.page).toEqual(1);
      expect(result.limit).toEqual(10);
      expect(result.hasMore).toEqual(false);
    });

    // --- End 'For You' test cases ---
  });
});
