import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { EventEmitter2, EventEmitterModule } from "@nestjs/event-emitter";
import { EventChatIntegrationService } from "../../services/event-chat-integration.service";
import { ChatService } from "../../services/chat.service";
import { Chat, ChatType } from "../../entities/chat.entity";
import { Repository } from "typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { User } from "../../../auth/entities/user.entity";

describe("Event-Chat Integration (Integration Tests)", () => {
  let eventEmitter: EventEmitter2;
  let chatService: ChatService;
  let chatRepository: Repository<Chat>;
  let integrationService: EventChatIntegrationService;

  const mockEvent = {
    id: "event-id-123",
    title: "Integration Test Event",
    creatorId: "creator-123",
    visibility: "PUBLIC",
  };

  const mockUser = {
    id: "user-123",
    username: "testuser",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: `.env.test`,
        }),
      ],
      providers: [
        EventChatIntegrationService,
        {
          provide: ChatService,
          useValue: {
            findEventChat: jest.fn(),
            createChat: jest.fn(),
            deactivateChat: jest.fn(),
            addParticipantsToChat: jest.fn(),
            removeParticipantFromChat: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Chat),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    chatService = module.get<ChatService>(ChatService);
    chatRepository = module.get<Repository<Chat>>(getRepositoryToken(Chat));
    integrationService = module.get<EventChatIntegrationService>(
      EventChatIntegrationService,
    );
  });

  describe("End-to-end event-chat integration", () => {
    it("should create a chat when an event is created", async () => {
      // Setup mocks
      jest.spyOn(chatService, "findEventChat").mockResolvedValue(null);
      const createChatSpy = jest
        .spyOn(chatService, "createChat")
        .mockResolvedValue({} as any);

      // Emit the event
      eventEmitter.emit("event.created", {
        eventId: mockEvent.id,
        title: mockEvent.title,
        creatorId: mockEvent.creatorId,
        visibility: mockEvent.visibility,
      });

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify chat creation was called with correct parameters
      expect(createChatSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ChatType.EVENT,
          title: mockEvent.title,
          eventId: mockEvent.id,
        }),
        mockEvent.creatorId,
      );
    });

    it("should update chat title when event title is updated", async () => {
      // Mock existing chat
      const existingChat = {
        id: "chat-123",
        title: "Old Title",
        type: ChatType.EVENT,
        eventId: mockEvent.id,
        participants: [],
      };

      // Setup mocks
      jest
        .spyOn(chatService, "findEventChat")
        .mockResolvedValue(existingChat as any);
      const updateSpy = jest
        .spyOn(chatRepository, "update")
        .mockResolvedValue({} as any);

      // Emit the event
      eventEmitter.emit("event.updated", {
        eventId: mockEvent.id,
        title: "Updated Title",
        creatorId: mockEvent.creatorId,
      });

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify update was called with correct parameters
      expect(updateSpy).toHaveBeenCalledWith(
        { id: existingChat.id },
        { title: "Updated Title" },
      );
    });

    it("should add user to chat when they join an event with APPROVED status", async () => {
      // Mock existing chat
      const existingChat = {
        id: "chat-123",
        title: mockEvent.title,
        type: ChatType.EVENT,
        eventId: mockEvent.id,
        participants: [],
      };

      // Setup mocks
      jest
        .spyOn(chatService, "findEventChat")
        .mockResolvedValue(existingChat as any);
      const addParticipantsSpy = jest
        .spyOn(chatService, "addParticipantsToChat")
        .mockResolvedValue(undefined);

      // Emit the event
      eventEmitter.emit("event.joined", {
        eventId: mockEvent.id,
        userId: mockUser.id,
        status: "APPROVED",
      });

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify user was added to chat
      expect(addParticipantsSpy).toHaveBeenCalledWith(existingChat.id, [
        mockUser.id,
      ]);
    });

    it("should not add user to chat when they join with PENDING status", async () => {
      // Mock existing chat
      const existingChat = {
        id: "chat-123",
        title: mockEvent.title,
        type: ChatType.EVENT,
        eventId: mockEvent.id,
        participants: [],
      };

      // Setup mocks
      jest
        .spyOn(chatService, "findEventChat")
        .mockResolvedValue(existingChat as any);
      const addParticipantsSpy = jest
        .spyOn(chatService, "addParticipantsToChat")
        .mockResolvedValue(undefined);

      // Emit the event
      eventEmitter.emit("event.joined", {
        eventId: mockEvent.id,
        userId: mockUser.id,
        status: "PENDING",
      });

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify user was NOT added to chat
      expect(addParticipantsSpy).not.toHaveBeenCalled();
    });

    it("should remove user from chat when they leave an event", async () => {
      // Mock existing chat
      const existingChat = {
        id: "chat-123",
        title: mockEvent.title,
        type: ChatType.EVENT,
        eventId: mockEvent.id,
        participants: [{ id: mockUser.id, username: mockUser.username }],
      };

      // Setup mocks
      jest
        .spyOn(chatService, "findEventChat")
        .mockResolvedValue(existingChat as any);
      const removeParticipantSpy = jest
        .spyOn(chatService, "removeParticipantFromChat")
        .mockResolvedValue(true);

      // Emit the event
      eventEmitter.emit("event.left", {
        eventId: mockEvent.id,
        userId: mockUser.id,
      });

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify user was removed from chat
      expect(removeParticipantSpy).toHaveBeenCalledWith(
        existingChat.id,
        mockUser.id,
        mockUser.id,
      );
    });

    it("should deactivate chat when event is deleted", async () => {
      // Mock existing chat
      const existingChat = {
        id: "chat-123",
        title: mockEvent.title,
        type: ChatType.EVENT,
        eventId: mockEvent.id,
        participants: [],
      };

      // Setup mocks
      jest
        .spyOn(chatService, "findEventChat")
        .mockResolvedValue(existingChat as any);
      const deactivateSpy = jest
        .spyOn(chatService, "deactivateChat")
        .mockResolvedValue(true);

      // Emit the event
      eventEmitter.emit("event.deleted", {
        eventId: mockEvent.id,
        creatorId: mockEvent.creatorId,
      });

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify chat was deactivated
      expect(deactivateSpy).toHaveBeenCalledWith(
        existingChat.id,
        mockEvent.creatorId,
      );
    });
  });
});
