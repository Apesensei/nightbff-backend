import { Test, TestingModule } from "@nestjs/testing";
import { EventService } from "../../event.service";
import { EventRepository } from "../../repositories/event.repository";
import { PlanAnalyticsService } from "../../services/plan-analytics.service";
import { PlanTrendingService } from "../../services/plan-trending.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { Event } from "../../entities/event.entity";
import { EventAttendee } from "../../entities/event-attendee.entity";
import { EventVisibility } from "../../enums/event-visibility.enum";
import { EventAttendeeStatus } from "../../enums/event-attendee-status.enum";

describe("EventService", () => {
  let eventService: EventService;
  let eventRepository: EventRepository;

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
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        EventService,
        {
          provide: EventRepository,
          useValue: mockEventRepository,
        },
      ],
    }).compile();

    eventService = moduleRef.get<EventService>(EventService);
    eventRepository = moduleRef.get<EventRepository>(EventRepository);
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
