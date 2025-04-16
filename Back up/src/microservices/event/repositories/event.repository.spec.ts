import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
// import { Repository } from "typeorm"; // Removed unused import
import { EventRepository } from "./event.repository";
import { Event } from "../entities/event.entity";
import { EventAttendee } from "../entities/event-attendee.entity";
import { EventAttendeeStatus } from "../enums/event-attendee-status.enum";
import { EventVisibility } from "../enums/event-visibility.enum";

describe("EventRepository", () => {
  let eventRepository: EventRepository;

  // Refined Query Builder Mock
  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]), // Ensure this returns a promise
  };

  const mockEventModel = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    // Make createQueryBuilder return the refined mock object
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
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
    // Reset mocks before each test in this describe block
    beforeEach(() => {
      jest.clearAllMocks(); // Clear previous calls
      // Re-assign mock implementation in case it was modified
      mockEventModel.createQueryBuilder.mockImplementation(
        () => mockQueryBuilder,
      );
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]); // Reset return value
    });

    it("should find events with default options", async () => {
      // Arrange
      const defaultLimit = 10;
      const defaultOffset = 0;
      const defaultOrderBy = "startTime";
      const defaultOrder = "DESC";

      // Act
      await eventRepository.findAll();

      // Assert - More specific checks
      expect(mockEventModel.createQueryBuilder).toHaveBeenCalledWith("event");
      // Check essential parts that should always run
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        "event.attendees",
        "eventAttendees",
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        `event.${defaultOrderBy}`,
        defaultOrder,
      );
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(defaultLimit);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(defaultOffset);
      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalledTimes(1);
      // Check that filters NOT used by default are NOT called
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining("venueId"),
        expect.anything(),
      );
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining("creatorId"),
        expect.anything(),
      );
      // Add similar checks for other filters if needed
    });

    it("should apply venue filter when provided", async () => {
      // Arrange
      const venueId = "venue-id";

      // Act
      await eventRepository.findAll({ venueId });

      // Assert
      expect(mockEventModel.createQueryBuilder).toHaveBeenCalledWith("event");
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "event.venueId = :venueId",
        { venueId },
      );
      // Ensure other parts are still called
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        "event.attendees",
        "eventAttendees",
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalled(); // Called with default
      expect(mockQueryBuilder.take).toHaveBeenCalled(); // Called with default
      expect(mockQueryBuilder.skip).toHaveBeenCalled(); // Called with default
      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalledTimes(1);
    });

    // Add more test cases for other filters (creatorId, attendeeId, dates, etc.)
    // For example:
    it("should apply attendee filter when provided", async () => {
      const attendeeId = "user-123";
      await eventRepository.findAll({ attendeeId });

      expect(mockEventModel.createQueryBuilder).toHaveBeenCalledWith("event");
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
        "event.attendees",
        "attendee",
        "attendee.userId = :attendeeId",
        { attendeeId },
      );
      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalledTimes(1);
    });
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
