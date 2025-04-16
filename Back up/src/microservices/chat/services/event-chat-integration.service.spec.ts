import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EventChatIntegrationService } from "./event-chat-integration.service";
import { ChatService } from "./chat.service";
import { Chat, ChatType } from "../entities/chat.entity";

describe("EventChatIntegrationService", () => {
  let service: EventChatIntegrationService;
  let chatService: ChatService;
  let chatRepository: Repository<Chat>;

  // Mock data
  const mockChat = {
    id: "chat-id",
    type: ChatType.EVENT,
    title: "Test Event",
    eventId: "event-id",
    participants: [{ id: "creator-id", username: "creator" }],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEventCreatedPayload = {
    eventId: "event-id",
    title: "Test Event",
    creatorId: "creator-id",
    visibility: "PUBLIC",
  };

  const mockEventUpdatedPayload = {
    eventId: "event-id",
    title: "Updated Event Title",
    creatorId: "creator-id",
  };

  const mockEventDeletedPayload = {
    eventId: "event-id",
    creatorId: "creator-id",
  };

  const mockEventJoinedPayload = {
    eventId: "event-id",
    userId: "user-id",
    status: "GOING",
  };

  const mockEventLeftPayload = {
    eventId: "event-id",
    userId: "user-id",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EventChatIntegrationService>(
      EventChatIntegrationService,
    );
    chatService = module.get<ChatService>(ChatService);
    chatRepository = module.get<Repository<Chat>>(getRepositoryToken(Chat));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("handleEventCreated", () => {
    it("should create a new chat when an event is created and no chat exists", async () => {
      // Mock chat service to return no existing chat
      jest.spyOn(chatService, "findEventChat").mockResolvedValue(null);

      await service.handleEventCreated(mockEventCreatedPayload);

      // Verify a new chat was created
      expect(chatService.createChat).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ChatType.EVENT,
          title: mockEventCreatedPayload.title,
          eventId: mockEventCreatedPayload.eventId,
        }),
        mockEventCreatedPayload.creatorId,
      );
    });

    it("should not create a chat if one already exists for the event", async () => {
      // Mock chat service to return an existing chat
      jest
        .spyOn(chatService, "findEventChat")
        .mockResolvedValue(mockChat as any);

      await service.handleEventCreated(mockEventCreatedPayload);

      // Verify no new chat was created
      expect(chatService.createChat).not.toHaveBeenCalled();
    });
  });

  describe("handleEventUpdated", () => {
    it("should update the chat title when an event title changes", async () => {
      // Mock chat service to return an existing chat
      jest.spyOn(chatService, "findEventChat").mockResolvedValue({
        ...mockChat,
        title: "Old Title",
      } as any);

      await service.handleEventUpdated(mockEventUpdatedPayload);

      // Verify the chat title was updated
      expect(chatRepository.update).toHaveBeenCalledWith(
        { id: mockChat.id },
        { title: mockEventUpdatedPayload.title },
      );
    });

    it("should not update the chat if titles match", async () => {
      // Mock chat service to return an existing chat with the same title
      jest.spyOn(chatService, "findEventChat").mockResolvedValue({
        ...mockChat,
        title: mockEventUpdatedPayload.title,
      } as any);

      await service.handleEventUpdated(mockEventUpdatedPayload);

      // Verify no update was made
      expect(chatRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("handleEventDeleted", () => {
    it("should deactivate the chat when an event is deleted", async () => {
      // Mock chat service to return an existing chat
      jest
        .spyOn(chatService, "findEventChat")
        .mockResolvedValue(mockChat as any);

      await service.handleEventDeleted(mockEventDeletedPayload);

      // Verify the chat was deactivated
      expect(chatService.deactivateChat).toHaveBeenCalledWith(
        mockChat.id,
        mockEventDeletedPayload.creatorId,
      );
    });
  });

  describe("handleEventJoined", () => {
    it("should add the user to the chat when they join an event with GOING status", async () => {
      // Mock chat service to return an existing chat with no participants
      jest.spyOn(chatService, "findEventChat").mockResolvedValue({
        ...mockChat,
        participants: [],
      } as any);

      await service.handleEventJoined(mockEventJoinedPayload);

      // Verify the user was added to the chat
      expect(chatService.addParticipantsToChat).toHaveBeenCalledWith(
        mockChat.id,
        [mockEventJoinedPayload.userId],
      );
    });

    it("should add the user to the chat when they join with APPROVED status", async () => {
      // Mock chat service to return an existing chat
      jest.spyOn(chatService, "findEventChat").mockResolvedValue({
        ...mockChat,
        participants: [],
      } as any);

      await service.handleEventJoined({
        ...mockEventJoinedPayload,
        status: "APPROVED",
      });

      // Verify the user was added to the chat
      expect(chatService.addParticipantsToChat).toHaveBeenCalledWith(
        mockChat.id,
        [mockEventJoinedPayload.userId],
      );
    });

    it("should not add the user if they are already a participant", async () => {
      // Mock chat service to return a chat where the user is already a participant
      jest.spyOn(chatService, "findEventChat").mockResolvedValue({
        ...mockChat,
        participants: [{ id: mockEventJoinedPayload.userId }],
      } as any);

      await service.handleEventJoined(mockEventJoinedPayload);

      // Verify the user was not added again
      expect(chatService.addParticipantsToChat).not.toHaveBeenCalled();
    });

    it("should not add the user to the chat if their status is PENDING", async () => {
      // Mock chat service to return an existing chat
      jest.spyOn(chatService, "findEventChat").mockResolvedValue({
        ...mockChat,
        participants: [],
      } as any);

      await service.handleEventJoined({
        ...mockEventJoinedPayload,
        status: "PENDING",
      });

      // Verify the user was not added to the chat
      expect(chatService.addParticipantsToChat).not.toHaveBeenCalled();
    });
  });

  describe("handleEventLeft", () => {
    it("should remove the user from the chat when they leave an event", async () => {
      // Mock chat service to return an existing chat
      jest
        .spyOn(chatService, "findEventChat")
        .mockResolvedValue(mockChat as any);

      await service.handleEventLeft(mockEventLeftPayload);

      // Verify the user was removed from the chat
      expect(chatService.removeParticipantFromChat).toHaveBeenCalledWith(
        mockChat.id,
        mockEventLeftPayload.userId,
        mockEventLeftPayload.userId,
      );
    });
  });
});
