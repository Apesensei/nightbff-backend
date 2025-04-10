import { Test, TestingModule } from "@nestjs/testing";
import { ChatService } from "../chat.service";
import { ChatRepository } from "../chat.repository";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { Chat, ChatType } from "../entities/chat.entity";
import {
  Message,
  MessageType,
  MessageStatus,
} from "../entities/message.entity";
import { User } from "../../user/entities/user.entity";
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
      findChatsByUserId: jest.fn().mockResolvedValue([mockChat]),
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
        createChatDto,
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

  describe("updateMessageStatus", () => {
    it("should update message status", async () => {
      const result = await service.updateMessageStatus(
        {
          messageId: "1",
          status: MessageStatus.READ,
        },
        "1",
      );

      expect(chatRepository.updateMessageStatus).toHaveBeenCalledWith(
        {
          messageId: "1",
          status: MessageStatus.READ,
        },
        "1",
      );
      expect(result).toBe(true);
    });

    it("should throw BadRequestException if trying to downgrade status", async () => {
      mockMessage.status = MessageStatus.READ;
      (chatRepository.findMessageById as jest.Mock).mockResolvedValueOnce(
        mockMessage,
      );

      await expect(
        service.updateMessageStatus(
          {
            messageId: "1",
            status: MessageStatus.DELIVERED,
          },
          "1",
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
