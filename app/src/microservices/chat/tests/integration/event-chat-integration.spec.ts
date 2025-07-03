import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { EventChatIntegrationService } from "../../services/event-chat-integration.service";
import { ChatService } from "../../services/chat.service";
import { Chat, ChatType } from "../../entities/chat.entity";
import { Repository } from "typeorm";
import { ConfigModule } from "@nestjs/config";
import { User } from "../../../auth/entities/user.entity";

describe("Event-Chat Integration (Integration Tests)", () => {
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
          envFilePath: `config/env/test.env`,
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

      // Call handler directly instead of emitting
      const payload = {
        eventId: mockEvent.id,
        title: mockEvent.title,
        creatorId: mockEvent.creatorId,
        visibility: mockEvent.visibility,
      };
      await integrationService.handleEventCreated(payload);

      // Verify chat creation was called with correct parameters
      console.log(
        "Expecting createChatSpy to be called with:",
        expect.objectContaining({
          type: ChatType.EVENT,
          title: mockEvent.title,
          eventId: mockEvent.id,
        }),
        mockEvent.creatorId,
      );
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

      // Call handler directly
      const payload = {
        eventId: mockEvent.id,
        title: "Updated Title",
        creatorId: mockEvent.creatorId,
      };
      await integrationService.handleEventUpdated(payload);

      // Verify update was called with correct parameters
      console.log(
        "Expecting updateSpy to be called with:",
        { id: existingChat.id },
        { title: "Updated Title" },
      );
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

      // Call handler directly
      const payload = {
        eventId: mockEvent.id,
        userId: mockUser.id,
        status: "APPROVED",
      };
      await integrationService.handleEventJoined(payload);

      // Verify user was added to chat
      console.log(
        "Expecting addParticipantsSpy to be called with:",
        existingChat.id,
        [mockUser.id],
      );
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

      // Call handler directly
      const payload = {
        eventId: mockEvent.id,
        userId: mockUser.id,
        status: "PENDING",
      };
      await integrationService.handleEventJoined(payload);

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

      // Call handler directly
      const payload = { eventId: mockEvent.id, userId: mockUser.id };
      await integrationService.handleEventLeft(payload);

      // Verify user was removed from chat
      console.log(
        "Expecting removeParticipantSpy to be called with:",
        existingChat.id,
        mockUser.id,
        mockUser.id,
      );
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

      // Call handler directly
      const payload = { eventId: mockEvent.id, creatorId: mockEvent.creatorId };
      await integrationService.handleEventDeleted(payload);

      // Verify chat was deactivated
      console.log(
        "Expecting deactivateSpy to be called with:",
        existingChat.id,
        mockEvent.creatorId,
      );
      expect(deactivateSpy).toHaveBeenCalledWith(
        existingChat.id,
        mockEvent.creatorId,
      );
    });
  });
});
