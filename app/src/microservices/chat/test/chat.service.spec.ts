import { Test, TestingModule } from "@nestjs/testing";
import { ChatService } from "../chat.service";
import { ChatRepository } from "../chat.repository";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { ChatType } from "../entities/chat.entity";
import { MessageStatus, MessageType } from "../entities/message.entity";
import { User } from "../../auth/entities/user.entity";
import { Event } from "../../event/entities/event.entity";
import { CreateChatDto } from "../dto/create-chat.dto";
import { SendMessageDto } from "../dto/send-message.dto";

describe("ChatService", () => {
  let service: ChatService;
  let chatRepository: Partial<ChatRepository>;
  let userRepository: any;
  let eventRepository: any;

  const mockUser = {
    id: "1",
    username: "testuser",
    displayName: "Test User",
    photoURL: "https://example.com/photo.jpg",
    isOnline: true,
  };

  const mockEvent = {
    id: "1",
    title: "Test Event",
  };

  const mockChat = {
    id: "1",
    type: ChatType.DIRECT,
    title: null,
    imageUrl: null,
    participants: [
      mockUser,
      { id: "2", username: "otheruser", displayName: "Other User" },
    ],
    creatorId: "1",
    eventId: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActivityAt: new Date(),
    save: jest.fn(),
  };

  const mockMessage = {
    id: "1",
    chatId: "1",
    senderId: "1",
    type: MessageType.TEXT,
    content: "Hello, world!",
    mediaUrl: null,
    locationLatitude: null,
    locationLongitude: null,
    status: MessageStatus.SENT,
    isEdited: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    chatRepository = {
      createChat: jest.fn().mockResolvedValue(mockChat),
      findChatById: jest.fn().mockResolvedValue(mockChat),
      findChatsByUserId: jest.fn().mockResolvedValue([]),
      findEventChat: jest.fn().mockResolvedValue(null),
      updateChatActivity: jest.fn().mockResolvedValue(undefined),
      deactivateChat: jest.fn().mockResolvedValue(undefined),
      sendMessage: jest.fn().mockResolvedValue(mockMessage),
      findChatMessages: jest.fn().mockResolvedValue([mockMessage]),
      findMessageById: jest.fn().mockResolvedValue(mockMessage),
      updateMessage: jest.fn().mockResolvedValue(mockMessage),
      updateMessageStatus: jest.fn().mockResolvedValue(true),
      softDeleteMessage: jest.fn().mockResolvedValue(true),
      getLastMessage: jest.fn().mockResolvedValue(mockMessage),
      countUnreadMessages: jest.fn().mockResolvedValue(0),
      save: jest.fn().mockImplementation(async (chat) => chat),
    };

    userRepository = {
      findOne: jest.fn().mockResolvedValue(mockUser),
      find: jest.fn().mockResolvedValue([mockUser]),
    };

    eventRepository = {
      findOne: jest.fn().mockResolvedValue(mockEvent),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: ChatRepository,
          useValue: chatRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(Event),
          useValue: eventRepository,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createChat", () => {
    it("should create a direct chat", async () => {
      const createChatDto: CreateChatDto = {
        type: ChatType.DIRECT,
        participantIds: ["2"],
      };

      const result = await service.createChat(createChatDto, "1");

      expect(chatRepository.createChat).toHaveBeenCalledWith(
        expect.objectContaining(createChatDto),
        "1",
      );
      expect(result).toBeDefined();
      expect(result.type).toBe(ChatType.DIRECT);
    });

    it("should throw BadRequestException if direct chat has too many participants", async () => {
      const createChatDto: CreateChatDto = {
        type: ChatType.DIRECT,
        participantIds: ["2", "3"],
      };

      await expect(service.createChat(createChatDto, "1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException if participant does not exist", async () => {
      userRepository.findOne.mockResolvedValueOnce(null);

      const createChatDto: CreateChatDto = {
        type: ChatType.DIRECT,
        participantIds: ["999"],
      };

      await expect(service.createChat(createChatDto, "1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return existing direct chat if it already exists", async () => {
      const existingChat = { ...mockChat };
      (chatRepository.findChatsByUserId as jest.Mock).mockResolvedValueOnce([
        existingChat,
      ]);

      const createChatDto: CreateChatDto = {
        type: ChatType.DIRECT,
        participantIds: ["2"],
      };

      const result = await service.createChat(createChatDto, "1");

      expect(chatRepository.createChat).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    // Test case from Step 3.3.1
    it("should create a direct chat between two specified users (Relationship Test)", async () => {
      const creatorId = "user-1-id";
      const participantId = "user-2-id";
      const createChatDto: CreateChatDto = {
        type: ChatType.DIRECT,
        participantIds: [participantId],
      };

      const mockUser1 = { id: creatorId, username: "user1" } as User;
      const mockUser2 = { id: participantId, username: "user2" } as User;
      const mockCreatedChat = {
        ...mockChat, // Use base mock chat
        id: "new-chat-id",
        type: ChatType.DIRECT,
        participants: [mockUser1, mockUser2],
        creatorId: creatorId,
      };

      // Configure mocks
      // Ensure userRepository.findOne returns the correct users when called by createChat logic
      userRepository.findOne.mockImplementation(async (options: any) => {
        if (options?.where?.id === creatorId) return mockUser1;
        if (options?.where?.id === participantId) return mockUser2;
        return null;
      });
      // Ensure findChatsByUserId returns empty initially to trigger creation
      (chatRepository.findChatsByUserId as jest.Mock).mockResolvedValueOnce([]);
      // Mock the actual chat creation to return our specific mock chat
      (chatRepository.createChat as jest.Mock).mockResolvedValueOnce(
        mockCreatedChat,
      );
      // **ADDITION:** Mock findChatById for *this specific test* to return the correct chat
      (chatRepository.findChatById as jest.Mock).mockImplementation(
        async (chatId: string) => {
          if (chatId === mockCreatedChat.id) {
            // Need to return a slightly more complete mock matching Chat entity structure for findById
            // It seems the service uses the result of findById to map to a DTO later.
            return {
              ...mockCreatedChat,
              participants: [mockUser1, mockUser2], // Ensure participants are included
              // Add other potential fields if findById expects them
            };
          }
          return null; // Or return the generic mockChat if needed for other calls
        },
      );

      const result = await service.createChat(createChatDto, creatorId);

      // Assertions
      expect(chatRepository.createChat).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ChatType.DIRECT,
          participantIds: [participantId],
        }),
        creatorId,
      );
      expect(result).toBeDefined();
      expect(result.id).toBe(mockCreatedChat.id);
      expect(result.type).toBe(ChatType.DIRECT);
      expect(result.participants).toHaveLength(2);
      // Verify participants are the correct users from the auth module context
      expect(result.participants.map((p) => p.id)).toContain(creatorId);
      expect(result.participants.map((p) => p.id)).toContain(participantId);
    });
  });

  describe("getChatById", () => {
    it("should return a chat by id", async () => {
      const result = await service.getChatById("1", "1");

      expect(chatRepository.findChatById).toHaveBeenCalledWith("1");
      expect(result).toBeDefined();
      expect(result.id).toBe("1");
    });

    it("should throw NotFoundException if chat does not exist", async () => {
      (chatRepository.findChatById as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.getChatById("999", "1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw UnauthorizedException if user is not a participant", async () => {
      const nonParticipantId = "999";

      await expect(service.getChatById("1", nonParticipantId)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("sendMessage", () => {
    it("should send a message to a chat", async () => {
      const sendMessageDto: SendMessageDto = {
        chatId: "1",
        type: MessageType.TEXT,
        content: "Hello, world!",
      };

      const result = await service.sendMessage(sendMessageDto, "1");

      expect(chatRepository.sendMessage).toHaveBeenCalledWith(
        sendMessageDto,
        "1",
      );
      expect(result).toBeDefined();
      expect(result.content).toBe("Hello, world!");
    });

    it("should throw NotFoundException if chat does not exist", async () => {
      (chatRepository.findChatById as jest.Mock).mockResolvedValueOnce(null);

      const sendMessageDto: SendMessageDto = {
        chatId: "999",
        type: MessageType.TEXT,
        content: "Hello, world!",
      };

      await expect(service.sendMessage(sendMessageDto, "1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw UnauthorizedException if user is not a participant", async () => {
      const nonParticipantId = "999";

      const sendMessageDto: SendMessageDto = {
        chatId: "1",
        type: MessageType.TEXT,
        content: "Hello, world!",
      };

      await expect(
        service.sendMessage(sendMessageDto, nonParticipantId),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw BadRequestException if text message has no content", async () => {
      const sendMessageDto: SendMessageDto = {
        chatId: "1",
        type: MessageType.TEXT,
        content: "",
      };

      await expect(service.sendMessage(sendMessageDto, "1")).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
