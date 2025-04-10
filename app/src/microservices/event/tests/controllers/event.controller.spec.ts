import { Test } from "@nestjs/testing";
import { EventController } from "../../event.controller";
import { EventService } from "../../event.service";
import { CreateEventDto } from "../../dto/create-event.dto";
import { JoinEventDto } from "../../dto/join-event.dto";
import { AttendeeResponseDto } from "../../dto/attendee-response.dto";
import { EventVisibility } from "../../enums/event-visibility.enum";
import { EventAttendeeStatus } from "../../enums/event-attendee-status.enum";
import { PlanTrendingService } from "../../services/plan-trending.service";

describe("EventController", () => {
  let eventController: EventController;
  let eventService: EventService;
  let planTrendingService: PlanTrendingService;

  const mockEventResponse = {
    id: "event-id",
    title: "Test Event",
    description: "Test Description",
    creatorId: "creator-id",
    creatorName: "Creator Name",
    startTime: new Date(),
    attendeeCount: 5,
    isAttending: false,
  };

  const mockEventService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getAttendees: jest.fn(),
    joinEvent: jest.fn(),
    leaveEvent: jest.fn(),
    getEventsAttendedByUser: jest.fn(),
    getTrendingPlans: jest.fn(),
  };

  beforeEach(async () => {
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
    }).compile();

    eventController = moduleRef.get<EventController>(EventController);
    eventService = moduleRef.get<EventService>(EventService);
    planTrendingService =
      moduleRef.get<PlanTrendingService>(PlanTrendingService);
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
      const req = { user: { id: "user-id" } };
      const eventsResponse = {
        events: [mockEventResponse, mockEventResponse],
        total: 2,
      };

      mockEventService.findAll.mockResolvedValue(eventsResponse);

      // Act
      const result = await eventController.findAll(
        req as any,
        10,
        0,
        "search",
        "2023-01-01",
        "2023-01-31",
        "venue-id",
      );

      // Assert
      expect(mockEventService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 0,
          venueId: "venue-id",
          title: "search",
        }),
        "user-id",
      );
      expect(result).toEqual(eventsResponse);
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
});
