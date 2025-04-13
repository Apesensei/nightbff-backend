import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { EventRepository } from "../../repositories/event.repository";
import { Event } from "../../entities/event.entity";
import { EventAttendee } from "../../entities/event-attendee.entity";
import { EventAttendeeStatus } from "../../enums/event-attendee-status.enum";
import { EventVisibility } from "../../enums/event-visibility.enum";

describe("EventRepository", () => {
  let eventRepository: EventRepository;

  // Updated QueryBuilder mock
  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    // Reset calls before each test using it
    mockClear: function () {
      this.andWhere.mockClear();
      this.innerJoin.mockClear();
      this.leftJoinAndSelect.mockClear();
      this.setParameter.mockClear();
      this.addSelect.mockClear();
      this.orderBy.mockClear();
      this.take.mockClear();
      this.skip.mockClear();
      this.getManyAndCount.mockClear();
    },
  };

  const mockEventModel = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder), // Use the updated mock
  };

  const mockAttendeeModel = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    // Reset query builder mocks before each test
    mockQueryBuilder.mockClear();
    // Reset model mocks
    Object.values(mockEventModel).forEach((mockFn) => mockFn.mockClear());
    Object.values(mockAttendeeModel).forEach((mockFn) => mockFn.mockClear());

    const moduleRef = await Test.createTestingModule({
      providers: [
        EventRepository,
        {
          provide: getRepositoryToken(Event),
          useValue: mockEventModel,
        },
        {
          provide: getRepositoryToken(EventAttendee),
          useValue: mockAttendeeModel,
        },
      ],
    }).compile();

    eventRepository = moduleRef.get<EventRepository>(EventRepository);
  });

  describe("create", () => {
    it("should create an event and add creator as an attendee", async () => {
      // Arrange
      const createEventDto = {
        title: "Test Event",
        description: "Test Description",
        startTime: new Date(),
        endTime: new Date(),
        visibility: EventVisibility.PUBLIC,
        requireApproval: false,
      };
      const creatorId = "user-id";
      const createdEvent = {
        id: "event-id",
        ...createEventDto,
        creatorId,
      };
      const createdAttendee = {
        id: "attendee-id",
        eventId: createdEvent.id,
        userId: creatorId,
        status: EventAttendeeStatus.GOING,
      };

      mockEventModel.create.mockReturnValue(createdEvent);
      mockEventModel.save.mockResolvedValue(createdEvent);
      mockAttendeeModel.create.mockReturnValue(createdAttendee);
      mockAttendeeModel.save.mockResolvedValue(createdAttendee);
      mockEventModel.findOne.mockResolvedValue(createdEvent);

      // Act
      const result = await eventRepository.create(createEventDto, creatorId);

      // Assert
      expect(mockEventModel.create).toHaveBeenCalledWith({
        ...createEventDto,
        creatorId,
      });
      expect(mockEventModel.save).toHaveBeenCalledWith(createdEvent);
      expect(mockAttendeeModel.create).toHaveBeenCalledWith({
        eventId: createdEvent.id,
        userId: creatorId,
        status: EventAttendeeStatus.GOING,
      });
      expect(mockAttendeeModel.save).toHaveBeenCalledWith(createdAttendee);
      expect(mockEventModel.findOne).toHaveBeenCalledWith({
        where: { id: createdEvent.id },
        relations: ["attendees"],
      });
      expect(result).toEqual(createdEvent);
    });
  });

  describe("findAll", () => {
    it("should find events with default options", async () => {
      // Arrange
      // No need to get queryBuilder here, it's done by the repo method

      // Act
      await eventRepository.findAll();

      // Assert
      expect(mockEventModel.createQueryBuilder).toHaveBeenCalledWith("event");
      // Verify calls on the mockQueryBuilder instance
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        "event.startTime",
        "DESC",
      );
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10); // Default limit is 10
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0); // Default offset
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        "event.attendees",
        "eventAttendees",
      );
      // Do NOT expect venue join
      expect(mockQueryBuilder.leftJoinAndSelect).not.toHaveBeenCalledWith(
        "event.venue",
        "venue",
      );
      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalled();
    });

    it("should apply venue filter when provided", async () => {
      // Arrange
      const venueId = "venue-id";

      // Act
      await eventRepository.findAll({ venueId });

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "event.venueId = :venueId",
        { venueId },
      );
    });

    // Add more tests for other filters (startTimeFrom, creatorId, attendeeId)
  });

  describe("joinEvent", () => {
    it("should create new attendance when not already attending", async () => {
      // Arrange
      const eventId = "event-id";
      const userId = "user-id";
      const joinEventDto = { status: EventAttendeeStatus.GOING };
      const createdAttendee = {
        id: "attendee-id",
        eventId,
        userId,
        status: EventAttendeeStatus.GOING,
      };

      mockAttendeeModel.findOne.mockResolvedValue(null);
      mockAttendeeModel.create.mockReturnValue(createdAttendee);
      mockAttendeeModel.save.mockResolvedValue(createdAttendee);

      // Act
      const result = await eventRepository.joinEvent(
        eventId,
        userId,
        joinEventDto,
      );

      // Assert
      expect(mockAttendeeModel.findOne).toHaveBeenCalledWith({
        where: { eventId, userId },
      });
      expect(mockAttendeeModel.create).toHaveBeenCalledWith({
        eventId,
        userId,
        status: joinEventDto.status,
      });
      expect(mockAttendeeModel.save).toHaveBeenCalledWith(createdAttendee);
      expect(result).toEqual(createdAttendee);
    });

    it("should update status when already attending", async () => {
      // Arrange
      const eventId = "event-id";
      const userId = "user-id";
      const joinEventDto = { status: EventAttendeeStatus.GOING };
      const existingAttendee = {
        id: "attendee-id",
        eventId,
        userId,
        status: EventAttendeeStatus.MAYBE,
      };
      const updatedAttendee = {
        ...existingAttendee,
        status: EventAttendeeStatus.GOING,
      };

      mockAttendeeModel.findOne.mockResolvedValue(existingAttendee);
      mockAttendeeModel.save.mockResolvedValue(updatedAttendee);

      // Act
      const result = await eventRepository.joinEvent(
        eventId,
        userId,
        joinEventDto,
      );

      // Assert
      expect(mockAttendeeModel.findOne).toHaveBeenCalledWith({
        where: { eventId, userId },
      });
      expect(mockAttendeeModel.save).toHaveBeenCalledWith({
        ...existingAttendee,
        status: joinEventDto.status,
      });
      expect(result).toEqual(updatedAttendee);
    });
  });
});
