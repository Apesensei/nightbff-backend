import { Test } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EventService } from "./event.service";
import { EventRepository } from "./repositories/event.repository";
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { EventVisibility } from "./enums/event-visibility.enum";
import { EventAttendeeStatus } from "./enums/event-attendee-status.enum";
import { PlanAnalyticsService } from "./services/plan-analytics.service";
import { PlanTrendingService } from "./services/plan-trending.service";
import { InterestService } from "../interest/services/interest.service";
import { createMockInterestService } from "../interest/test/utils/mock-interest.service";

describe("EventService", () => {
  let eventService: EventService;

  const mockEvent: any = {
    id: "event-id",
    title: "Test Event",
    description: "Test Description",
    startTime: new Date(),
    endTime: new Date(),
    creatorId: "creator-id",
    visibility: EventVisibility.PUBLIC,
    requireApproval: false,
    attendees: [],
  };

  const mockEventRepository = {
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
  };

  const mockEventsEmitter = {
    emit: jest.fn(),
  };

  const mockPlanAnalyticsService = {
    trackEventCreation: jest.fn(),
    trackEventJoin: jest.fn(), // This might be trackPlanJoin - needs verification
    trackEventView: jest.fn(), // This might be trackPlanView - needs verification
    trackPlanView: jest.fn(), // Added missing mock method
    trackPlanJoin: jest.fn(), // Added missing mock method
  };

  const mockPlanTrendingService = {
    updatePlanTrendingScore: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const mockInterestService = createMockInterestService();

    const moduleRef = await Test.createTestingModule({
      providers: [
        EventService,
        {
          provide: EventRepository,
          useValue: mockEventRepository,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventsEmitter,
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
          provide: InterestService,
          useValue: mockInterestService,
        },
      ],
    }).compile();

    eventService = moduleRef.get<EventService>(EventService);
  });

  describe("create", () => {
    it("should create an event and emit events", async () => {
      // Arrange
      const userId = "user-id";
      const createEventDto = {
        title: "New Event",
        description: "New Description",
        startTime: new Date(),
        endTime: new Date(),
        visibility: EventVisibility.PUBLIC,
        requireApproval: false,
      };

      mockEventRepository.create.mockResolvedValue(mockEvent);

      // Act
      await eventService.create(userId, createEventDto);

      // Assert
      expect(mockEventRepository.create).toHaveBeenCalledWith(
        createEventDto,
        userId,
      );
      expect(mockEventsEmitter.emit).toHaveBeenCalledWith(
        "event.created",
        expect.any(Object),
      );
      expect(mockEventsEmitter.emit).toHaveBeenCalledWith(
        "notification.event.created",
        expect.any(Object),
      );
    });
  });

  describe("findOne", () => {
    it("should return an event when it exists and user has permission", async () => {
      // Arrange
      const eventId = "event-id";
      const userId = "user-id";

      mockEventRepository.findOne.mockResolvedValue(mockEvent);

      // Act
      const result = await eventService.findOne(eventId, userId);

      // Assert
      expect(mockEventRepository.findOne).toHaveBeenCalledWith(eventId);
      expect(result).toBeDefined();
    });

    it("should throw NotFoundException when event does not exist", async () => {
      // Arrange
      const eventId = "non-existent-id";
      const userId = "user-id";

      mockEventRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(eventService.findOne(eventId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when user does not have permission", async () => {
      // Arrange
      const eventId = "private-event-id";
      const userId = "non-creator-id";
      const privateEvent = {
        ...mockEvent,
        visibility: EventVisibility.PRIVATE,
      };

      mockEventRepository.findOne.mockResolvedValue(privateEvent);

      // Act & Assert
      await expect(eventService.findOne(eventId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("joinEvent", () => {
    it("should allow a user to join an event", async () => {
      // Arrange
      const eventId = "event-id";
      const userId = "user-id";
      const joinEventDto = { status: EventAttendeeStatus.GOING };
      const mockAttendee = {
        id: "attendee-id",
        eventId,
        userId,
        status: EventAttendeeStatus.GOING,
      };

      mockEventRepository.findOne.mockResolvedValue(mockEvent);
      mockEventRepository.getAttendeeCount.mockResolvedValue(5);
      mockEventRepository.joinEvent.mockResolvedValue(mockAttendee);

      // Act
      await eventService.joinEvent(eventId, userId, joinEventDto);

      // Assert
      expect(mockEventRepository.findOne).toHaveBeenCalledWith(eventId);
      expect(mockEventRepository.joinEvent).toHaveBeenCalledWith(
        eventId,
        userId,
        joinEventDto,
      );
      expect(mockEventsEmitter.emit).toHaveBeenCalledWith(
        "event.joined",
        expect.any(Object),
      );
    });

    it("should throw BadRequestException when event has reached capacity", async () => {
      // Arrange
      const eventId = "full-event-id";
      const userId = "user-id";
      const joinEventDto = { status: EventAttendeeStatus.GOING };
      const fullEvent = {
        ...mockEvent,
        attendeeLimit: 10,
      };

      mockEventRepository.findOne.mockResolvedValue(fullEvent);
      mockEventRepository.getAttendeeCount.mockResolvedValue(10);

      // Act & Assert
      await expect(
        eventService.joinEvent(eventId, userId, joinEventDto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
