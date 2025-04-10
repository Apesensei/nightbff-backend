import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EventRepository } from "./event.repository";
import { Event } from "../entities/event.entity";
import { EventAttendee } from "../entities/event-attendee.entity";
import { EventAttendeeStatus } from "../enums/event-attendee-status.enum";
import { EventVisibility } from "../enums/event-visibility.enum";

describe("EventRepository", () => {
  let eventRepository: EventRepository;
  let eventModel: Repository<Event>;
  let attendeeModel: Repository<EventAttendee>;

  const mockEventModel = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      andWhere: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    })),
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
    eventModel = moduleRef.get<Repository<Event>>(getRepositoryToken(Event));
    attendeeModel = moduleRef.get<Repository<EventAttendee>>(
      getRepositoryToken(EventAttendee),
    );
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
      const queryBuilder = mockEventModel.createQueryBuilder();

      // Act
      await eventRepository.findAll();

      // Assert
      expect(mockEventModel.createQueryBuilder).toHaveBeenCalledWith("event");
      expect(queryBuilder.orderBy).toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalled();
      expect(queryBuilder.skip).toHaveBeenCalled();
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        "event.attendees",
        "eventAttendees",
      );
      expect(queryBuilder.getManyAndCount).toHaveBeenCalled();
    });

    it("should apply venue filter when provided", async () => {
      // Arrange
      const venueId = "venue-id";
      const queryBuilder = mockEventModel.createQueryBuilder();

      // Act
      await eventRepository.findAll({ venueId });

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "event.venueId = :venueId",
        { venueId },
      );
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
