import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Chat, ChatType } from "../entities/chat.entity";
import { ChatResponseDto } from "../dto/chat-response.dto";
import { CreateChatDto } from "../dto/create-chat.dto";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { User } from "../../auth/entities/user.entity";
import { MessageResponseDto } from "../dto/message-response.dto";

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createChat(
    dto: CreateChatDto,
    creatorId: string,
  ): Promise<ChatResponseDto> {
    // Validate participants exist using proper TypeORM In() operator
    const allUserIds = [creatorId, ...dto.participantIds];
    const participants = await this.userRepository.findBy({
      id: In(allUserIds),
    });

    if (participants.length !== allUserIds.length) {
      throw new BadRequestException("One or more participants not found");
    }

    // For direct chats, check if a chat already exists between these users
    if (dto.type === ChatType.DIRECT && dto.participantIds.length === 1) {
      const existingChat = await this.findDirectChatBetweenUsers(
        creatorId,
        dto.participantIds[0],
      );
      if (existingChat) {
        return this.mapChatToResponseDto(existingChat, creatorId);
      }
    }

    // Create new chat
    const chat = this.chatRepository.create({
      type: dto.type,
      title: dto.title,
      imageUrl: dto.imageUrl,
      creatorId,
      eventId: dto.eventId,
      lastActivityAt: new Date(),
    });

    // Add participants
    chat.participants = participants;

    // Save chat
    const savedChat = await this.chatRepository.save(chat);

    // Emit chat created event
    this.eventEmitter.emit("chat.created", {
      chat: savedChat,
      creatorId,
      participantIds: participants.map((p) => p.id),
    });

    // Return the mapped DTO instead of the raw entity
    return this.mapChatToResponseDto(savedChat, creatorId);
  }

  async getChatById(chatId: string, userId: string): Promise<ChatResponseDto> {
    const chat = await this.validateChatAccess(chatId, userId);
    return this.mapChatToResponseDto(chat, userId);
  }

  async getUserChats(userId: string): Promise<ChatResponseDto[]> {
    const chats = await this.findChatsByUserId(userId);

    const chatResponses: ChatResponseDto[] = [];
    for (const chat of chats) {
      chatResponses.push(await this.mapChatToResponseDto(chat, userId));
    }

    return chatResponses;
  }

  async updateChatActivity(chatId: string): Promise<void> {
    await this.chatRepository.update(
      { id: chatId },
      { lastActivityAt: new Date() },
    );
  }

  async deactivateChat(chatId: string, userId: string): Promise<boolean> {
    const chat = await this.validateChatAccess(chatId, userId);

    // Only the creator or an admin can deactivate a chat
    if (chat.creatorId !== userId) {
      throw new UnauthorizedException(
        "Only the chat creator can deactivate this chat",
      );
    }

    await this.chatRepository.update({ id: chatId }, { isActive: false });

    // Emit event for real-time updates
    this.eventEmitter.emit("chat.deactivated", {
      chatId: chatId,
      userId: userId,
    });

    return true;
  }

  async addParticipantsToChat(
    chatId: string,
    participantIds: string[],
  ): Promise<void> {
    const chat = await this.findChatById(chatId);
    if (!chat) {
      throw new NotFoundException(`Chat with ID ${chatId} not found`);
    }

    const participants = await this.userRepository.find({
      where: { id: In(participantIds) },
    });

    if (participants.length !== participantIds.length) {
      throw new NotFoundException("One or more participants not found");
    }

    // Add all participants to the chat
    if (!chat.participants) {
      chat.participants = [];
    }

    chat.participants = [...chat.participants, ...participants];
    await this.chatRepository.save(chat);

    // Emit event for real-time updates
    this.eventEmitter.emit("chat.participants.added", {
      chatId: chatId,
      participantIds: participantIds,
    });
  }

  async removeParticipantFromChat(
    chatId: string,
    participantId: string,
    requesterId: string,
  ): Promise<boolean> {
    const chat = await this.validateChatAccess(chatId, requesterId);

    // Check if requester is chat creator or removing themselves
    if (chat.creatorId !== requesterId && requesterId !== participantId) {
      throw new UnauthorizedException(
        "Only the chat creator can remove other participants",
      );
    }

    // Remove participant
    if (!chat.participants) {
      return false;
    }

    const participantIndex = chat.participants.findIndex(
      (p) => p.id === participantId,
    );
    if (participantIndex === -1) {
      throw new NotFoundException(
        `Participant with ID ${participantId} not found in this chat`,
      );
    }

    chat.participants.splice(participantIndex, 1);
    await this.chatRepository.save(chat);

    // Emit event for real-time updates
    this.eventEmitter.emit("chat.participant.removed", {
      chatId: chatId,
      participantId: participantId,
      requesterId: requesterId,
    });

    return true;
  }

  async validateChatAccess(chatId: string, userId: string): Promise<Chat> {
    const chat = await this.findChatById(chatId);
    if (!chat) {
      throw new NotFoundException(`Chat with ID ${chatId} not found`);
    }

    // Check if user is a participant
    if (!this.isUserParticipant(chat, userId)) {
      throw new UnauthorizedException("You are not a participant of this chat");
    }

    return chat;
  }

  // Repository methods
  async findChatById(id: string): Promise<Chat | null> {
    return this.chatRepository.findOne({
      where: { id },
      relations: ["participants"],
    });
  }

  async findChatsByUserId(userId: string): Promise<Chat[]> {
    return this.chatRepository
      .createQueryBuilder("chat")
      .innerJoinAndSelect("chat.participants", "participant")
      .where("participant.id = :userId", { userId })
      .andWhere("chat.isActive = :isActive", { isActive: true })
      .orderBy("chat.lastActivityAt", "DESC")
      .getMany();
  }

  async findEventChat(eventId: string): Promise<Chat | null> {
    return this.chatRepository.findOne({
      where: {
        eventId,
        type: ChatType.EVENT,
        isActive: true,
      },
      relations: ["participants"],
    });
  }

  private isUserParticipant(chat: Chat, userId: string): boolean {
    return (
      chat.participants &&
      chat.participants.some((participant) => participant.id === userId)
    );
  }

  private async mapChatToResponseDto(
    chat: Chat,
    userId: string,
  ): Promise<ChatResponseDto> {
    // Get message statistics from message service
    // These will be fetched via the MessageService in the controller
    const unreadCount = 0;
    let lastMessage: MessageResponseDto | undefined = undefined;

    // Map participants to DTOs
    const participantDtos = chat.participants
      ? chat.participants.map((participant) => ({
          id: participant.id,
          username: participant.username,
          displayName: participant.displayName || participant.username,
          photoURL: participant.photoURL,
          isOnline: participant.isOnline || false,
        }))
      : [];

    // For direct chats, find the other participant's name for the title
    let title = chat.title;
    if (chat.type === ChatType.DIRECT && !title && chat.participants) {
      const otherParticipant = chat.participants.find((p) => p.id !== userId);
      if (otherParticipant) {
        title = otherParticipant.displayName || otherParticipant.username;
      }
    }

    return new ChatResponseDto({
      id: chat.id,
      type: chat.type,
      title,
      imageUrl: chat.imageUrl,
      participants: participantDtos,
      eventId: chat.eventId,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      lastActivityAt: chat.lastActivityAt,
      lastMessage: lastMessage,
      unreadCount: unreadCount,
      isActive: chat.isActive,
    });
  }

  private async findDirectChatBetweenUsers(
    user1Id: string,
    user2Id: string,
  ): Promise<Chat | null> {
    // Find direct chat between these two users
    const chats = await this.chatRepository
      .createQueryBuilder("chat")
      .innerJoin("chat.participants", "p1", "p1.id = :user1Id", { user1Id })
      .innerJoin("chat.participants", "p2", "p2.id = :user2Id", { user2Id })
      .where("chat.type = :type", { type: ChatType.DIRECT })
      .andWhere("chat.isActive = :isActive", { isActive: true })
      .getOne();

    return chats;
  }

  async addParticipants(
    chatId: string,
    userIds: string[],
    requesterId: string,
  ): Promise<Chat> {
    const chat = await this.findChatById(chatId);
    if (!chat) {
      throw new NotFoundException(`Chat with ID ${chatId} not found`);
    }

    // Only creator can add participants to group chats
    if (chat.type !== ChatType.DIRECT && chat.creatorId !== requesterId) {
      throw new ForbiddenException(
        "Only the chat creator can add participants",
      );
    }

    // Can't add participants to direct chats
    if (chat.type === ChatType.DIRECT) {
      throw new BadRequestException("Cannot add participants to direct chats");
    }

    // Get users to add using proper TypeORM In() operator
    const usersToAdd = await this.userRepository.findBy({
      id: In(userIds),
    });

    if (usersToAdd.length !== userIds.length) {
      throw new BadRequestException("One or more users not found");
    }

    // Add new participants
    chat.participants = [...chat.participants, ...usersToAdd];

    // Save updated chat
    const updatedChat = await this.chatRepository.save(chat);

    // Emit participants added event
    this.eventEmitter.emit("chat.participants.added", {
      chatId,
      newParticipantIds: userIds,
      addedBy: requesterId,
    });

    return updatedChat;
  }
}
