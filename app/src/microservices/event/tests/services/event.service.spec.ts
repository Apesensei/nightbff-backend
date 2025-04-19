import { Test } from "@nestjs/testing";
import { EventService } from "../../event.service";
import {
  EventRepository,
  FindEventsOptions,
} from "../../repositories/event.repository";
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { EventVisibility } from "../../enums/event-visibility.enum";
import { EventAttendeeStatus } from "../../enums/event-attendee-status.enum";
import { PlanAnalyticsService } from "../../services/plan-analytics.service";
import { PlanTrendingService } from "../../services/plan-trending.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { InterestService } from "../../../interest/services/interest.service";
import { Event } from "../../entities/event.entity";
import { EventAttendee } from "../../entities/event-attendee.entity";
import { JoinEventDto } from "../../dto/join-event.dto";
import { CreateEventDto } from "../../dto/create-event.dto";
import { EventResponseDto } from "../../dto/event-response.dto";

describe("EventService", () => {
  let eventService: EventService;
  let mockInterestService: {
    getUserInterests: jest.Mock<Promise<any[]>>;
    getEventIdsByInterest: jest.Mock<Promise<string[]>>;
  };
  let mockEventRepository: Partial<Record<keyof EventRepository, jest.Mock>>;
  let logger: Logger;
  let loggerDebugSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  const currentDate = new Date();
  const mockEvent: Event = {
    id: "event-id-1",
    title: "Test Event 1",
    description: "Test Description 1",
    startTime: currentDate,
    endTime: new Date(currentDate.getTime() + 3600 * 1000),
    creatorId: "creator-id",
    visibility: EventVisibility.PUBLIC,
    requireApproval: false,
    attendees: [],
    venueId: "venue-1",
    createdAt: currentDate,
    updatedAt: currentDate,
    attendeeLimit: undefined,
    trendingScore: 0,
    viewCount: 0,
  } as Event;

  const mockUserInterests = [{ id: "interest-music", name: "Music" }];
  const mockEventIdsForInterest = ["event-id-1", "event-id-related"];
  const mockUserId = "user-with-interests";
  const mockUserIdNoInterests = "user-no-interests";

  const mockEventResponseDto: EventResponseDto = {
    id: mockEvent.id,
    title: mockEvent.title,
    description: mockEvent.description,
    creatorId: mockEvent.creatorId,
    startTime: mockEvent.startTime,
    visibility: mockEvent.visibility,
    requireApproval: mockEvent.requireApproval,
    createdAt: mockEvent.createdAt,
    updatedAt: mockEvent.updatedAt,
    creatorName: "Mock Creator Name",
    attendeeCount: 0,
    isAttending: false,
    venueId: mockEvent.venueId,
    venueName: "Mock Venue Name",
    customLocation: undefined,
    endTime: mockEvent.endTime,
    coverImage: undefined,
    attendeeLimit: mockEvent.attendeeLimit,
    attendees: [],
    distance: undefined,
  };

  beforeEach(async () => {
    mockInterestService = {
      getUserInterests: jest.fn(),
      getEventIdsByInterest: jest.fn(),
    };

    mockEventRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getAttendees: jest.fn(),
      joinEvent: jest.fn(),
      leaveEvent: jest.fn(),
      isAttendee: jest.fn(),
      getAttendeeCount: jest.fn(),
      getEventsAttendedByUser: jest.fn(),
      incrementViewCount: jest.fn(),
      findVenueIdsByEventIds: jest.fn(),
      updateTrendingScore: jest.fn(),
      getTrendingPlans: jest.fn(),
      findByIdsWithDetails: jest.fn(),
    };

    const mockPlanAnalyticsService = {
      trackPlanView: jest.fn(),
      trackPlanJoin: jest.fn(),
    };
    const mockPlanTrendingService = {
      updatePlanTrendingScore: jest.fn().mockResolvedValue(undefined),
    };
    const mockEventEmitter = {
      emit: jest.fn(),
    };
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        EventService,
        { provide: EventRepository, useValue: mockEventRepository },
        { provide: PlanAnalyticsService, useValue: mockPlanAnalyticsService },
        { provide: PlanTrendingService, useValue: mockPlanTrendingService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: InterestService, useValue: mockInterestService },
      ],
    }).compile();

    eventService = moduleRef.get<EventService>(EventService);
    logger = (eventService as any).logger;
    loggerDebugSpy = jest.spyOn(logger, "debug").mockImplementation();
    loggerErrorSpy = jest.spyOn(logger, "error").mockImplementation();
    loggerWarnSpy = jest.spyOn(logger, "warn").mockImplementation();

    jest.clearAllMocks();

    // Consistently mock the transformation for all tests in this suite
    jest
      .spyOn(eventService as any, "transformToResponseDto")
      .mockImplementation((event: Event) => {
        // Basic mock transformation, ensuring ID matches the input event
        // Add other dynamic fields if necessary (like creatorName)
        return {
          ...mockEventResponseDto, // Use the aligned global mock DTO
          id: event.id,
          // Potentially override other fields based on the input 'event' if needed
        };
      });
  });

  afterEach(() => {
    jest.clearAllMocks();
    loggerDebugSpy.mockRestore();
    loggerErrorSpy.mockRestore();
    loggerWarnSpy.mockRestore();
  });

  describe("create", () => {
    it("should create an event and emit events", async () => {
      const userId = "user-id";
      const createEventDto: CreateEventDto = {
        title: "New Event",
        description: "New Description",
        startTime: new Date(),
        endTime: new Date(),
        visibility: EventVisibility.PUBLIC,
        requireApproval: false,
      };
      mockEventRepository.create!.mockResolvedValue(mockEvent);

      const result = await eventService.create(userId, createEventDto);

      expect(mockEventRepository.create).toHaveBeenCalledWith(
        createEventDto,
        userId,
      );
      expect(result.id).toEqual(mockEvent.id);
      expect(result.title).toEqual(mockEvent.title);
    });

    it("should create and return an event DTO", async () => {
      const userId = "user-id";
      const createEventDto: CreateEventDto = {
        title: "New Event",
        description: "New Description",
        startTime: new Date(),
        endTime: new Date(),
        visibility: EventVisibility.PUBLIC,
        requireApproval: false,
      };
      mockEventRepository.create!.mockResolvedValue(mockEvent);

      const expectedResult = {
        ...mockEventResponseDto,
        id: mockEvent.id,
      };
      jest
        .spyOn(eventService as any, "transformToResponseDto")
        .mockReturnValue(expectedResult);

      const result = await eventService.create(userId, createEventDto);

      expect(mockEventRepository.create).toHaveBeenCalledWith(
        createEventDto,
        userId,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe("findOne", () => {
    it("should return an event when it exists and user has permission", async () => {
      const eventId = "event-id";
      const userId = "user-id";

      mockEventRepository.findOne!.mockResolvedValue(mockEvent);
      mockEventRepository.incrementViewCount!.mockResolvedValue(undefined);

      const result = await eventService.findOne(eventId, userId);

      expect(mockEventRepository.findOne).toHaveBeenCalledWith(eventId);
      expect(mockEventRepository.incrementViewCount).toHaveBeenCalledWith(
        eventId,
      );
      expect(result).toBeDefined();
      expect(result.id).toEqual(mockEvent.id);
    });

    it("should throw NotFoundException when event does not exist", async () => {
      const eventId = "non-existent-id";
      const userId = "user-id";

      mockEventRepository.findOne!.mockResolvedValue(null);

      await expect(eventService.findOne(eventId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when user does not have permission", async () => {
      const eventId = "private-event-id";
      const userId = "non-creator-id";
      const privateEvent: Event = {
        ...mockEvent,
        id: eventId,
        visibility: EventVisibility.PRIVATE,
      } as Event;

      mockEventRepository.findOne!.mockResolvedValue(privateEvent);

      await expect(eventService.findOne(eventId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("joinEvent", () => {
    it("should allow a user to join an event", async () => {
      const eventId = "event-id";
      const userId = "user-id";
      const joinEventDto: JoinEventDto = { status: EventAttendeeStatus.GOING };
      const mockAttendee: EventAttendee = {
        id: "attendee-id",
        eventId,
        userId,
        status: EventAttendeeStatus.GOING,
        joinedAt: new Date(),
        event: mockEvent,
      } as EventAttendee;

      mockEventRepository.findOne!.mockResolvedValue(mockEvent);
      mockEventRepository.getAttendeeCount!.mockResolvedValue(5);
      mockEventRepository.joinEvent!.mockResolvedValue(mockAttendee);

      const result = await eventService.joinEvent(
        eventId,
        userId,
        joinEventDto,
      );

      expect(mockEventRepository.findOne).toHaveBeenCalledWith(eventId);
      expect(mockEventRepository.joinEvent).toHaveBeenCalledWith(
        eventId,
        userId,
        joinEventDto,
      );
      expect(result.id).toEqual(mockAttendee.id);
      expect(result.status).toEqual(mockAttendee.status);
    });

    it("should throw BadRequestException when event has reached capacity", async () => {
      const eventId = "full-event-id";
      const userId = "user-id";
      const joinEventDto: JoinEventDto = { status: EventAttendeeStatus.GOING };
      const fullEvent: Event = {
        ...mockEvent,
        id: eventId,
        attendeeLimit: 10,
      } as Event;

      mockEventRepository.findOne!.mockResolvedValue(fullEvent);
      mockEventRepository.getAttendeeCount!.mockResolvedValue(10);

      await expect(
        eventService.joinEvent(eventId, userId, joinEventDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("findAll", () => {
    it("should return events when findAll is called", async () => {
      const options: FindEventsOptions = { limit: 10, offset: 0 };
      const userId = "test-user-id";
      const mockEvents = [mockEvent];
      const expectedResult = {
        events: [{ ...mockEventResponseDto, id: mockEvent.id }],
        total: 1,
      };
      mockEventRepository.findAll!.mockResolvedValue([mockEvents, 1]);

      const result = await eventService.findAll(options, userId);

      expect(mockEventRepository.findAll).toHaveBeenCalledWith({
        ...options,
        visibility: [EventVisibility.PUBLIC],
      });
      expect(result).toEqual(expectedResult);
    });

    it("(Regular Interest ID - Valid) should call repository with eventIds and options", async () => {
      const userId = "user-regular";
      const interestId = "interest-regular";
      const eventIds = ["e1", "e2"];
      const options = { interestId, limit: 10 };

      mockInterestService.getEventIdsByInterest.mockResolvedValue(eventIds);
      mockEventRepository.findAll!.mockResolvedValue([[], 0]);

      await eventService.findAll(options, userId);

      expect(mockInterestService.getUserInterests).not.toHaveBeenCalled();
      expect(mockInterestService.getEventIdsByInterest).toHaveBeenCalledWith(
        interestId,
      );
      expect(mockEventRepository.findAll!).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: options.limit,
          interestId: options.interestId,
          eventIds: eventIds,
          visibility: [EventVisibility.PUBLIC],
        }),
      );
    });

    it("should transform events to DTOs", async () => {
      const userId = "test-user";
      const mockEvents = [mockEvent];
      const mockTotal = 1;
      mockEventRepository.findAll!.mockResolvedValue([mockEvents, mockTotal]);

      const expectedResultDto = { ...mockEventResponseDto, id: mockEvent.id };
      jest
        .spyOn(eventService as any, "transformToResponseDto")
        .mockReturnValue(expectedResultDto);

      const result = await eventService.findAll({}, userId);

      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toEqual(expectedResultDto);
      expect(result.total).toEqual(mockTotal);
      expect((eventService as any).transformToResponseDto).toHaveBeenCalledWith(
        mockEvent,
        userId,
      );
    });
  });

  describe("findAll with interestId", () => {
    const baseOptions: FindEventsOptions = { limit: 10 };
    const mockEvents = [mockEvent];
    const expectedResult = {
      events: [{ ...mockEventResponseDto, id: mockEvent.id }],
      total: 1,
    };

    it("(Base Case - No Interest ID): should call repo without interest filtering", async () => {
      mockEventRepository.findAll!.mockResolvedValue([mockEvents, 1]);

      await eventService.findAll(baseOptions, mockUserId);

      expect(mockInterestService.getUserInterests).not.toHaveBeenCalled();
      expect(mockInterestService.getEventIdsByInterest).not.toHaveBeenCalled();
      expect(mockEventRepository.findAll!).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: baseOptions.limit,
          visibility: [EventVisibility.PUBLIC],
        }),
      );
    });

    it("(Regular Interest ID - Success): should filter by eventIds from InterestService", async () => {
      const options: FindEventsOptions = {
        ...baseOptions,
        interestId: "interest-music",
      };
      mockInterestService.getEventIdsByInterest.mockResolvedValue(
        mockEventIdsForInterest,
      );
      mockEventRepository.findAll!.mockResolvedValue([mockEvents, 1]);

      const result = await eventService.findAll(options, mockUserId);

      expect(mockInterestService.getUserInterests).not.toHaveBeenCalled();
      expect(mockInterestService.getEventIdsByInterest).toHaveBeenCalledWith(
        "interest-music",
      );
      expect(mockEventRepository.findAll!).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: options.limit,
          interestId: options.interestId,
          eventIds: mockEventIdsForInterest,
          visibility: [EventVisibility.PUBLIC],
        }),
      );
      expect(result).toEqual(expectedResult);
    });

    it("(Regular Interest ID - No Matching Events): should return empty if InterestService returns no event IDs", async () => {
      const options: FindEventsOptions = {
        ...baseOptions,
        interestId: "interest-rare",
      };
      mockInterestService.getEventIdsByInterest.mockResolvedValue([]);

      const result = await eventService.findAll(options, mockUserId);

      expect(mockInterestService.getEventIdsByInterest).toHaveBeenCalledWith(
        "interest-rare",
      );
      expect(mockEventRepository.findAll!).not.toHaveBeenCalled();
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "No events found for interestId: interest-rare",
        ),
      );
      expect(result).toEqual({ events: [], total: 0 });
    });

    it("(Regular Interest ID - Interest Not Found): should return empty if InterestService throws NotFoundException", async () => {
      const options: FindEventsOptions = {
        ...baseOptions,
        interestId: "interest-nonexistent",
      };
      mockInterestService.getEventIdsByInterest.mockRejectedValue(
        new NotFoundException("Interest not found"),
      );

      const result = await eventService.findAll(options, mockUserId);

      expect(mockInterestService.getEventIdsByInterest).toHaveBeenCalledWith(
        "interest-nonexistent",
      );
      expect(mockEventRepository.findAll!).not.toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Interest ID interest-nonexistent not found"),
      );
      expect(result).toEqual({ events: [], total: 0 });
    });

    it("(Regular Interest ID - Other Error): should return empty if InterestService throws other error", async () => {
      const options: FindEventsOptions = {
        ...baseOptions,
        interestId: "interest-error",
      };
      mockInterestService.getEventIdsByInterest.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result = await eventService.findAll(options, mockUserId);

      expect(mockInterestService.getEventIdsByInterest).toHaveBeenCalledWith(
        "interest-error",
      );
      expect(mockEventRepository.findAll!).not.toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Error using InterestService for interest ID interest-error",
        ),
        expect.any(String),
      );
      expect(result).toEqual({ events: [], total: 0 });
    });

    it("('For You' - User HAS Interests): should resolve interest and filter by eventIds", async () => {
      const options: FindEventsOptions = {
        ...baseOptions,
        interestId: "forYou",
      };
      mockInterestService.getUserInterests.mockResolvedValue(mockUserInterests);
      mockInterestService.getEventIdsByInterest.mockResolvedValue(
        mockEventIdsForInterest,
      );
      mockEventRepository.findAll!.mockResolvedValue([mockEvents, 1]);

      const result = await eventService.findAll(options, mockUserId);

      expect(mockInterestService.getUserInterests).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(mockInterestService.getEventIdsByInterest).toHaveBeenCalledWith(
        mockUserInterests[0].id,
      );
      expect(mockEventRepository.findAll!).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: baseOptions.limit,
          interestId: mockUserInterests[0].id,
          eventIds: mockEventIdsForInterest,
          visibility: [EventVisibility.PUBLIC],
        }),
      );
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Resolved 'forYou' to interestId: ${mockUserInterests[0].id}`,
        ),
      );
      expect(result).toEqual(expectedResult);
    });

    it("('For You' - User has NO Interests): should return empty", async () => {
      const options: FindEventsOptions = {
        ...baseOptions,
        interestId: "forYou",
      };
      mockInterestService.getUserInterests.mockResolvedValue([]);

      const result = await eventService.findAll(options, mockUserIdNoInterests);

      expect(mockInterestService.getUserInterests).toHaveBeenCalledWith(
        mockUserIdNoInterests,
      );
      expect(mockInterestService.getEventIdsByInterest).not.toHaveBeenCalled();
      expect(mockEventRepository.findAll!).not.toHaveBeenCalled();
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `User ${mockUserIdNoInterests} has no interests for 'forYou'. Returning empty.`,
        ),
      );
      expect(result).toEqual({ events: [], total: 0 });
    });

    it("('For You' - Error Fetching Interests): should return empty", async () => {
      const options: FindEventsOptions = {
        ...baseOptions,
        interestId: "forYou",
      };
      mockInterestService.getUserInterests.mockRejectedValue(
        new Error("Interest service down"),
      );

      const result = await eventService.findAll(options, mockUserId);

      expect(mockInterestService.getUserInterests).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(mockInterestService.getEventIdsByInterest).not.toHaveBeenCalled();
      expect(mockEventRepository.findAll!).not.toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Error fetching user interests for 'forYou' (userId: ${mockUserId})`,
        ),
        expect.any(String),
      );
      expect(result).toEqual({ events: [], total: 0 });
    });

    it("('For You' - Missing userId - Defensive Check): should return empty and log error", async () => {
      const options: FindEventsOptions = {
        ...baseOptions,
        interestId: "forYou",
      };
      const missingUserId = undefined;

      const result = await eventService.findAll(options, missingUserId as any);

      expect(mockInterestService.getUserInterests).not.toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "'forYou' requested but userId missing unexpectedly! Returning empty.",
        ),
      );
      expect(result).toEqual({ events: [], total: 0 });
    });
  });
});
