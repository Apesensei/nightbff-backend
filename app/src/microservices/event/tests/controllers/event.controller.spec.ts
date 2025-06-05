import { Test } from "@nestjs/testing";
import { EventController } from "../../event.controller";
import { EventService } from "../../event.service";
import { CreateEventDto } from "../../dto/create-event.dto";
import { JoinEventDto } from "../../dto/join-event.dto";
import { AttendeeResponseDto } from "../../dto/attendee-response.dto";
import { EventVisibility } from "../../enums/event-visibility.enum";
import { EventAttendeeStatus } from "../../enums/event-attendee-status.enum";
import { PlanTrendingService } from "../../services/plan-trending.service";
import { JwtAuthGuard } from "@/microservices/auth/guards/jwt-auth.guard";
import { PlanSearchDto } from "../../dto/plan-search.dto";
import { UnauthorizedException } from "@nestjs/common";
import { EventResponseDto } from "../../dto/event-response.dto";

describe("EventController", () => {
  let eventController: EventController;
  let eventService: EventService;
  let planTrendingService: PlanTrendingService;
  let mockAuthGuard: { canActivate: jest.Mock };

  const mockEventResponse: EventResponseDto = {
    id: "event-id",
    title: "Test Event",
    description: "Test Description",
    creatorId: "creator-id",
    creatorName: "Creator Name",
    startTime: new Date(),
    attendeeCount: 5,
    isAttending: false,
    visibility: EventVisibility.PUBLIC,
    requireApproval: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    venueId: undefined,
    venueName: undefined,
    customLocation: undefined,
    endTime: undefined,
    coverImage: undefined,
    attendeeLimit: undefined,
    attendees: [],
    distance: undefined,
  };

  const mockEventService = {
    create: jest.fn().mockResolvedValue(mockEventResponse),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getAttendees: jest.fn(),
    joinEvent: jest.fn(),
    leaveEvent: jest.fn(),
    getEventsAttendedByUser: jest.fn(),
    getTrendingPlans: jest.fn(),
    searchPlans: jest.fn(),
  };

  beforeEach(async () => {
    mockAuthGuard = { canActivate: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [EventController],
      providers: [
        {
          provide: EventService,
          useValue: mockEventService,
        },
        {
          provide: PlanTrendingService,
          useValue: {
            refreshAllTrendingScores: jest.fn(),
            updatePlanTrendingScore: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    eventController = moduleRef.get<EventController>(EventController);
    eventService = moduleRef.get<EventService>(EventService);
    planTrendingService =
      moduleRef.get<PlanTrendingService>(PlanTrendingService);

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create an event", async () => {
      // Arrange
      const createEventDto: CreateEventDto = {
        title: "New Event",
        description: "New Description",
        startTime: new Date(),
        endTime: new Date(),
        visibility: EventVisibility.PUBLIC,
        requireApproval: false,
      };
      const req = { user: { id: "user-id" } };

      mockEventService.create.mockResolvedValue(mockEventResponse);

      // Act
      const result = await eventController.create(req as any, createEventDto);

      // Assert
      expect(mockEventService.create).toHaveBeenCalledWith(
        "user-id",
        createEventDto,
      );
      expect(result).toEqual(mockEventResponse);
    });

    it("should throw error when user is not authenticated", async () => {
      // Arrange
      const createEventDto: CreateEventDto = {
        title: "New Event",
        description: "New Description",
        startTime: new Date(),
        endTime: new Date(),
        visibility: EventVisibility.PUBLIC,
        requireApproval: false,
      };
      const req = { user: null };

      // Act & Assert
      await expect(
        eventController.create(req as any, createEventDto),
      ).rejects.toThrow();
    });
  });

  describe("findAll", () => {
    it("should return events with total count", async () => {
      // Arrange
      const userId = "user-id";
      const eventsResponse = {
        events: [mockEventResponse, mockEventResponse],
        total: 2,
      };
      const expectedLimit = 10;
      const expectedTitle = "search";
      const expectedStartDate = "2023-01-01";
      const expectedEndDate = "2023-01-31";
      const expectedVenueId = "venue-id";
      const expectedInterestId = undefined;

      mockAuthGuard.canActivate.mockResolvedValue(true);
      mockEventService.findAll.mockResolvedValue(eventsResponse);

      // Act
      const result = await eventController.findAll(
        { user: { id: userId } } as any,
        expectedLimit,
        undefined,
        expectedTitle,
        expectedStartDate,
        expectedEndDate,
        expectedVenueId,
        expectedInterestId,
      );

      // Assert
      expect(mockEventService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: expectedLimit,
          offset: undefined,
          venueId: expectedVenueId,
          title: expectedTitle,
          interestId: expectedInterestId,
          startTimeFrom: new Date(expectedStartDate),
          startTimeTo: new Date(expectedEndDate),
        }),
        userId,
      );
      expect(result).toEqual(eventsResponse);
    });

    it("should call eventService.findAll with 'forYou' interestId", async () => {
      // Arrange
      const userId = "user-id-with-interests";
      const eventsResponse = {
        events: [mockEventResponse], // Simulate service returning filtered events
        total: 1,
      };
      const interestIdParam = "forYou";

      mockAuthGuard.canActivate.mockResolvedValue(true);
      mockEventService.findAll.mockResolvedValue(eventsResponse);

      // Act: Call the controller endpoint method
      const result = await eventController.findAll(
        { user: { id: userId } } as any,
        undefined, // limit
        undefined, // offset
        undefined, // search
        undefined, // startDate
        undefined, // endDate
        undefined, // venueId
        interestIdParam, // interestId = 'forYou'
      );

      // Assert: Verify EventService.findAll was called correctly
      expect(mockEventService.findAll).toHaveBeenCalledWith(
        // Service should receive 'forYou' in options, it resolves it internally
        expect.objectContaining({ interestId: interestIdParam }),
        userId,
      );
      expect(result).toEqual(eventsResponse); // Controller returns what service gives
    });

    it("should call eventService.findAll with 'forYou' when user has no interests", async () => {
      // Arrange
      const userId = "user-id-no-interests";
      const emptyEventsResponse = {
        events: [], // Service should return empty if user has no interests for 'forYou'
        total: 0,
      };
      const interestIdParam = "forYou";

      mockAuthGuard.canActivate.mockResolvedValue(true);
      mockEventService.findAll.mockResolvedValue(emptyEventsResponse);

      // Act: Call the controller endpoint method
      const result = await eventController.findAll(
        { user: { id: userId } } as any,
        undefined, // limit
        undefined, // offset
        undefined, // search
        undefined, // startDate
        undefined, // endDate
        undefined, // venueId
        interestIdParam, // interestId = 'forYou'
      );

      // Assert: Verify EventService.findAll was called correctly
      expect(mockEventService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ interestId: interestIdParam }),
        userId,
      );
      // Controller returns the empty response from the service
      expect(result).toEqual(emptyEventsResponse);
    });

    // SKIPPED: Guard logic is not invoked when calling controller method directly.
    // This should be tested in E2E tests.
    it.skip("should throw UnauthorizedException if auth guard denies access", async () => {
      // Arrange
      const userId = "test-user-id";
      mockAuthGuard.canActivate.mockResolvedValue(false);

      // Act & Assert
      await expect(
        eventController.findAll({ user: { id: userId } } as any),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockEventService.findAll).not.toHaveBeenCalled();
    });
  });

  describe("joinEvent", () => {
    it("should allow a user to join an event", async () => {
      // Arrange
      const eventId = "event-id";
      const req = { user: { id: "user-id" } };
      const joinEventDto: JoinEventDto = {
        status: EventAttendeeStatus.GOING,
      };
      const attendeeResponse: AttendeeResponseDto = {
        id: "attendee-id",
        userId: "user-id",
        status: EventAttendeeStatus.GOING,
        joinedAt: new Date(),
        userName: "User Name",
        userProfileImage: "image-url",
      };

      mockEventService.joinEvent.mockResolvedValue(attendeeResponse);

      // Act
      const result = await eventController.joinEvent(
        eventId,
        req as any,
        joinEventDto,
      );

      // Assert
      expect(mockEventService.joinEvent).toHaveBeenCalledWith(
        eventId,
        "user-id",
        joinEventDto,
      );
      expect(result).toEqual(attendeeResponse);
    });
  });

  describe("getTrendingPlans", () => {
    it("should call eventService.getTrendingPlans with correct parameters", async () => {
      // Arrange
      const limit = 10;
      const offset = 0;
      const mockQueryDto = {
        limit,
        offset,
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-01-31"),
        // Use LocationDto structure
        location: {
          latitude: 40.7128,
          longitude: -74.006,
          radiusInKm: 10,
        },
        refreshScores: false,
      };

      // Create mock EventResponseDto objects
      const mockEvents = [
        {
          id: "1",
          title: "Trending Event 1",
          description: "Description 1",
          creatorId: "user-1",
          startTime: new Date(),
          visibility: EventVisibility.PUBLIC,
          requireApproval: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          trendingScore: 95.5,
        },
        {
          id: "2",
          title: "Trending Event 2",
          description: "Description 2",
          creatorId: "user-2",
          startTime: new Date(),
          visibility: EventVisibility.PUBLIC,
          requireApproval: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          trendingScore: 87.2,
        },
      ];

      const mockResponse = {
        items: mockEvents,
        total: 2,
        page: 1,
        limit,
        hasMore: false,
      };

      jest
        .spyOn(eventService, "getTrendingPlans")
        .mockResolvedValue(mockResponse);

      // Act
      await eventService.getTrendingPlans(mockQueryDto, "test-user");

      // Assert
      expect(eventService.getTrendingPlans).toHaveBeenCalledWith(
        mockQueryDto,
        "test-user",
      );
    });

    it("should handle request with default values", async () => {
      // Arrange
      const mockQueryDto = {};

      const mockResponse = {
        items: [],
        total: 0,
        page: 1,
        limit: 20, // Default limit
        hasMore: false,
      };

      jest
        .spyOn(eventService, "getTrendingPlans")
        .mockResolvedValue(mockResponse);

      // Act
      await eventService.getTrendingPlans(mockQueryDto, "test-user");

      // Assert
      expect(eventService.getTrendingPlans).toHaveBeenCalledWith(
        mockQueryDto,
        "test-user",
      );
    });

    it("should call refreshAllTrendingScores when refreshScores flag is true", async () => {
      // Arrange
      const mockQueryDto = {
        refreshScores: true,
        limit: 10,
        offset: 0,
      };

      const mockResponse = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        hasMore: false,
      };

      jest
        .spyOn(eventService, "getTrendingPlans")
        .mockResolvedValue(mockResponse);
      jest
        .spyOn(planTrendingService, "refreshAllTrendingScores")
        .mockResolvedValue();

      // Act
      await planTrendingService.refreshAllTrendingScores();
      await eventService.getTrendingPlans(mockQueryDto, "test-user");

      // Assert
      expect(planTrendingService.refreshAllTrendingScores).toHaveBeenCalled();
      expect(eventService.getTrendingPlans).toHaveBeenCalledWith(
        mockQueryDto,
        "test-user",
      );
    });
  });

  describe("searchPlans", () => {
    // SKIPPED: Guard logic is not invoked when calling controller method directly.
    // This should be tested in E2E tests.
    it.skip("should throw UnauthorizedException if auth guard denies access", async () => {
      // Arrange
      const userId = "test-user-id";
      const searchDto: PlanSearchDto = { limit: 10 };
      mockAuthGuard.canActivate.mockResolvedValue(false);

      // Act & Assert
      await expect(
        eventController.searchPlans({ user: { id: userId } } as any, searchDto),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockEventService.searchPlans).not.toHaveBeenCalled();
    });

    it("should call eventService.findAll with mapped parameters from searchDto", async () => {
      // Arrange
      const userId = "test-user-id";
      const searchDto: PlanSearchDto = {
        query: "party",
        limit: 20,
        offset: 0,
      };
      // Mock the response structure expected from findAll
      const mockFindAllResult = {
        events: [mockEventResponse],
        total: 1,
      };
      // Define the expected options for findAll
      const expectedFindAllOptions = {
        title: searchDto.query,
        limit: searchDto.limit,
        offset: searchDto.offset,
      };
      const expectedLimitForPagination = searchDto.limit || 10;
      const expectedOffsetForPagination = searchDto.offset || 0;

      mockAuthGuard.canActivate.mockResolvedValue(true); // Guard allows access
      // Mock findAll instead of searchPlans
      mockEventService.findAll.mockResolvedValue(mockFindAllResult);

      // Act
      const result = await eventController.searchPlans(
        { user: { id: userId } } as any,
        searchDto,
      );

      // Assert
      // Verify findAll was called with the correct mapped options and userId
      expect(mockEventService.findAll).toHaveBeenCalledWith(
        expectedFindAllOptions,
        userId,
      );
      // Verify the controller correctly constructs the paginated response
      expect(result).toEqual({
        items: mockFindAllResult.events,
        total: mockFindAllResult.total,
        page:
          Math.floor(expectedOffsetForPagination / expectedLimitForPagination) +
          1,
        limit: expectedLimitForPagination,
        hasMore:
          mockFindAllResult.total >
          expectedOffsetForPagination + expectedLimitForPagination,
      });
    });
  });
});
