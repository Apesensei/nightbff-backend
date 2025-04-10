import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { ChatRepository } from "./chat.repository";
import { CreateChatDto } from "./dto/create-chat.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { UpdateMessageDto } from "./dto/update-message.dto";
import { UpdateMessageStatusDto } from "./dto/update-message-status.dto";
import { ChatResponseDto } from "./dto/chat-response.dto";
import { MessageResponseDto } from "./dto/message-response.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Chat, ChatType } from "./entities/chat.entity";
import { Message, MessageType, MessageStatus } from "./entities/message.entity";
import { User } from "@/microservices/auth/entities/user.entity";
import { Event } from "@/microservices/event/entities/event.entity";

// Remove locally defined interfaces if User and Event entities cover the needs
/* // Commenting out instead of deleting for reference
interface User {
  id: string;
  username: string;
  displayName?: string;
  photoURL?: string;
  isOnline?: boolean;
}

interface Event {
  id: string;
  title: string;
}
*/

// Remove ChatWithParticipants interface as well, rely on Chat entity relations
/*
interface ChatWithParticipants {
  id: string;
  type: ChatType;
  title?: string;
  imageUrl?: string;
  participants: User[];
  creatorId: string;
  eventId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt?: Date;
}
*/

@Injectable()
export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async createChat(
    createChatDto: CreateChatDto,
    userId: string,
  ): Promise<ChatResponseDto> {
    // Validate participants based on chat type
    if (createChatDto.type === ChatType.DIRECT) {
      if (createChatDto.participantIds.length !== 1) {
        throw new BadRequestException(
          "Direct chat must have exactly one participant besides the creator",
        );
      }

      // Ensure the other participant exists
      const otherUser = await this.userRepository.findOne({
        where: { id: createChatDto.participantIds[0] },
      });
      if (!otherUser) {
        throw new NotFoundException(
          `User with ID ${createChatDto.participantIds[0]} not found`,
        );
      }

      // Check if a direct chat already exists between these users
      const existingChats = await this.chatRepository.findChatsByUserId(userId);
      const existingDirectChat = existingChats.find(
        (chat) =>
          chat.type === ChatType.DIRECT &&
          chat.participants?.some(
            (p) => p.id === createChatDto.participantIds[0],
          ),
      );

      if (existingDirectChat) {
        // Return the existing chat instead of creating a new one
        return await this.mapChatToResponseDto(existingDirectChat, userId);
      }
    } else if (createChatDto.type === ChatType.GROUP) {
      if (createChatDto.participantIds.length < 2) {
        throw new BadRequestException(
          "Group chat must have at least two participants besides the creator",
        );
      }

      if (!createChatDto.title) {
        throw new BadRequestException("Group chat must have a title");
      }
    } else if (createChatDto.type === ChatType.EVENT) {
      if (!createChatDto.eventId) {
        throw new BadRequestException("Event chat must have an event ID");
      }

      // Ensure the event exists
      const event = await this.eventRepository.findOne({
        where: { id: createChatDto.eventId },
      });
      if (!event) {
        throw new NotFoundException(
          `Event with ID ${createChatDto.eventId} not found`,
        );
      }

      // Check if a chat already exists for this event
      const existingEventChat = await this.chatRepository.findEventChat(
        createChatDto.eventId,
      );
      if (existingEventChat) {
        // Return the existing chat instead of creating a new one
        return await this.mapChatToResponseDto(existingEventChat, userId);
      }

      // Use the event title as the chat title if not provided
      if (!createChatDto.title) {
        createChatDto.title = event.title;
      }
    }

    // Create the chat using the custom repository method
    const newChat = await this.chatRepository.createChat(createChatDto, userId);

    // Add participants - requires fixing addParticipantsToChat internal logic
    const participantIds = [userId, ...createChatDto.participantIds];
    await this.addParticipantsToChat(newChat.id, participantIds);

    // Fetch the complete chat using the custom repository method
    const completeChat = await this.chatRepository.findChatById(newChat.id);
    if (!completeChat) {
      throw new NotFoundException(
        `Chat with ID ${newChat.id} not found after creation`,
      );
    }

    return await this.mapChatToResponseDto(completeChat, userId);
  }

  async getChatById(chatId: string, userId: string): Promise<ChatResponseDto> {
    const chat = await this.chatRepository.findChatById(chatId);
    if (!chat) {
      throw new NotFoundException(`Chat with ID ${chatId} not found`);
    }

    // Check if user is a participant
    if (!this.isUserParticipant(chat, userId)) {
      throw new UnauthorizedException("You are not a participant of this chat");
    }

    return await this.mapChatToResponseDto(chat, userId);
  }

  async getUserChats(userId: string): Promise<ChatResponseDto[]> {
    const chats = await this.chatRepository.findChatsByUserId(userId);

    const chatResponses: ChatResponseDto[] = [];
    for (const chat of chats) {
      chatResponses.push(await this.mapChatToResponseDto(chat, userId));
    }

    return chatResponses;
  }

  async sendMessage(
    sendMessageDto: SendMessageDto,
    userId: string,
  ): Promise<MessageResponseDto> {
    // Validate that the chat exists
    const chat = await this.chatRepository.findChatById(sendMessageDto.chatId);
    if (!chat) {
      throw new NotFoundException(
        `Chat with ID ${sendMessageDto.chatId} not found`,
      );
    }

    // Check if user is a participant
    if (!this.isUserParticipant(chat, userId)) {
      throw new UnauthorizedException("You are not a participant of this chat");
    }

    // Validate message content based on type
    if (sendMessageDto.type === MessageType.TEXT && !sendMessageDto.content) {
      throw new BadRequestException("Text message must have content");
    } else if (
      sendMessageDto.type === MessageType.IMAGE &&
      !sendMessageDto.mediaUrl
    ) {
      throw new BadRequestException("Image message must have a media URL");
    } else if (
      sendMessageDto.type === MessageType.LOCATION &&
      (sendMessageDto.locationLatitude === undefined ||
        sendMessageDto.locationLongitude === undefined)
    ) {
      throw new BadRequestException(
        "Location message must have latitude and longitude",
      );
    }

    // Send the message
    const message = await this.chatRepository.sendMessage(
      sendMessageDto,
      userId,
    );

    // Map to response DTO
    const sender = await this.userRepository.findOne({ where: { id: userId } });
    return this.mapMessageToResponseDto(
      message,
      sender?.displayName || "Unknown User",
    );
  }

  async getChatMessages(
    chatId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<MessageResponseDto[]> {
    // Validate that the chat exists
    const chat = await this.chatRepository.findChatById(chatId);
    if (!chat) {
      throw new NotFoundException(`Chat with ID ${chatId} not found`);
    }

    // Check if user is a participant
    if (!this.isUserParticipant(chat, userId)) {
      throw new UnauthorizedException("You are not a participant of this chat");
    }

    // Get the messages
    const messages = await this.chatRepository.findChatMessages(
      chatId,
      limit,
      offset,
    );

    // Get all unique sender IDs
    const senderIds = [...new Set(messages.map((m) => m.senderId))];

    // Check if senderIds is empty before querying
    if (senderIds.length === 0) {
      return messages.map((message) =>
        this.mapMessageToResponseDto(message, "Unknown User"),
      );
    }

    // Use the In operator
    const senders = await this.userRepository.find({
      where: { id: In(senderIds) },
    });

    // Create a map of sender ID to display name
    const senderMap = new Map<string, string>();
    senders.forEach((sender) => {
      // Prioritize displayName, then username
      senderMap.set(sender.id, sender.displayName || "Unknown User");
    });

    // Map to response DTOs
    return messages.map((message) =>
      this.mapMessageToResponseDto(
        message,
        senderMap.get(message.senderId) || "Unknown User",
      ),
    );
  }

  async updateMessage(
    updateMessageDto: UpdateMessageDto,
    userId: string,
  ): Promise<MessageResponseDto> {
    // Update the message
    const updatedMessage = await this.chatRepository.updateMessage(
      updateMessageDto,
      userId,
    );

    if (!updatedMessage) {
      throw new NotFoundException(
        "Message not found or you are not the sender",
      );
    }

    // Map to response DTO
    const sender = await this.userRepository.findOne({ where: { id: userId } });
    return this.mapMessageToResponseDto(
      updatedMessage,
      sender?.displayName ?? sender?.username ?? "Unknown User",
    );
  }

  async updateMessageStatus(
    updateStatusDto: UpdateMessageStatusDto,
    userId: string,
  ): Promise<boolean> {
    // Get the message to check that the user is a participant of the chat
    const message = await this.chatRepository.findMessageById(
      updateStatusDto.messageId,
    );
    if (!message) {
      throw new NotFoundException(
        `Message with ID ${updateStatusDto.messageId} not found`,
      );
    }

    // Validate that the chat exists
    const chat = await this.chatRepository.findChatById(message.chatId);
    if (!chat) {
      throw new NotFoundException(`Chat with ID ${message.chatId} not found`);
    }

    // Check if user is a participant
    if (!this.isUserParticipant(chat, userId)) {
      throw new UnauthorizedException("You are not a participant of this chat");
    }

    // Only allow updating to a "higher" status (SENT -> DELIVERED -> READ)
    if (
      (message.status === MessageStatus.DELIVERED &&
        updateStatusDto.status === MessageStatus.SENT) ||
      (message.status === MessageStatus.READ &&
        (updateStatusDto.status === MessageStatus.SENT ||
          updateStatusDto.status === MessageStatus.DELIVERED))
    ) {
      throw new BadRequestException("Cannot downgrade message status");
    }

    return this.chatRepository.updateMessageStatus(updateStatusDto);
  }

  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    return this.chatRepository.softDeleteMessage(messageId, userId);
  }

  private isUserParticipant(chat: Chat, userId: string): boolean {
    return (
      chat.participants?.some((participant) => participant.id === userId) ??
      false
    );
  }

  private async mapChatToResponseDto(
    chat: Chat | null,
    userId: string,
  ): Promise<ChatResponseDto> {
    if (!chat) {
      throw new NotFoundException("Chat not found for mapping to DTO.");
    }
    const lastMessageEntity = await this.chatRepository.getLastMessage(chat.id);
    const unreadCount = await this.chatRepository.countUnreadMessages(
      chat.id,
      userId,
    );

    let lastMessageDto: MessageResponseDto | undefined = undefined;
    if (lastMessageEntity) {
      const sender = await this.userRepository.findOne({
        where: { id: lastMessageEntity.senderId },
      });
      lastMessageDto = this.mapMessageToResponseDto(
        lastMessageEntity,
        sender?.displayName || "Unknown User",
      );
    }

    return {
      id: chat.id,
      type: chat.type,
      title: chat.title,
      imageUrl: chat.imageUrl,
      participants:
        chat.participants?.map((p) => ({
          id: p.id,
          username: p.username,
          displayName: p.displayName,
          photoURL: p.photoURL,
          isOnline: p.isOnline,
        })) ?? [],
      eventId: chat.eventId,
      lastActivityAt: lastMessageEntity?.createdAt ?? chat.updatedAt,
      lastMessage: lastMessageDto,
      unreadCount: unreadCount,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      isActive: chat.isActive,
    };
  }

  private mapMessageToResponseDto(
    message: Message,
    senderName: string,
  ): MessageResponseDto {
    return new MessageResponseDto({
      id: message.id,
      chatId: message.chatId,
      senderId: message.senderId,
      senderName: senderName,
      type: message.type,
      content: message.content,
      mediaUrl: message.mediaUrl,
      locationLatitude: message.locationLatitude,
      locationLongitude: message.locationLongitude,
      status: message.status,
      isEdited: message.isEdited,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    });
  }

  private async addParticipantsToChat(
    chatId: string,
    participantIds: string[],
  ): Promise<void> {
    console.log(
      `Adding participants ${participantIds.join(", ")} to chat ${chatId}`,
    );
    const chat = await this.chatRepository.findChatById(chatId);
    if (!chat) {
      throw new NotFoundException(
        `Chat with ID ${chatId} not found while adding participants`,
      );
    }
    if (participantIds.length === 0) return;

    const usersToAdd = await this.userRepository.find({
      where: { id: In(participantIds) },
    });
    if (usersToAdd.length !== participantIds.length) {
      console.warn("Some participants to add were not found");
    }

    const existingParticipantIds = new Set(
      chat.participants?.map((p) => p.id) ?? [],
    );
    const usersToActuallyAdd = usersToAdd.filter(
      (u) => !existingParticipantIds.has(u.id),
    );

    if (usersToActuallyAdd.length > 0) {
      chat.participants = [
        ...(chat.participants || []),
        ...usersToActuallyAdd,
      ] as any;
      if (!chat) {
        throw new Error(
          "Assertion failed: chat became null unexpectedly before save.",
        );
      }
      await this.chatRepository.save(chat);
    }
  }

  // Ensure ChatService method exists if needed by message.service
  async validateChatAccess(chatId: string, userId: string): Promise<Chat> {
    const chat = await this.chatRepository.findChatById(chatId); // Uses custom method
    if (!chat) {
      throw new NotFoundException(`Chat with ID ${chatId} not found`);
    }
    if (!this.isUserParticipant(chat, userId)) {
      throw new UnauthorizedException("You are not a participant of this chat");
    }
    return chat;
  }

  // Ensure ChatService method exists if needed by message.service
  async updateChatActivity(chatId: string): Promise<void> {
    await this.chatRepository.updateChatActivity(chatId); // Uses custom method
  }

  async getExistingDirectChat(
    userId: string,
    otherUserId: string,
  ): Promise<Chat | null> {
    const existingChats = await this.chatRepository.findChatsByUserId(userId);
    return (
      existingChats.find(
        (chat) =>
          chat.type === ChatType.DIRECT &&
          chat.participants?.some((p) => p.id === otherUserId),
      ) ?? null
    );
  }
}
