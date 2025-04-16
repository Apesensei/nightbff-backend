import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, Not, IsNull } from "typeorm";
import { Chat, ChatType } from "./entities/chat.entity";
import { Message, MessageStatus } from "./entities/message.entity";
import { CreateChatDto } from "./dto/create-chat.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { UpdateMessageDto } from "./dto/update-message.dto";
import { UpdateMessageStatusDto } from "./dto/update-message-status.dto";

@Injectable()
export class ChatRepository {
  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  async createChat(
    createChatDto: CreateChatDto,
    creatorId: string,
  ): Promise<Chat> {
    const chat = this.chatRepository.create({
      type: createChatDto.type,
      title: createChatDto.title,
      imageUrl: createChatDto.imageUrl,
      eventId: createChatDto.eventId,
      creatorId,
      isActive: true,
      lastActivityAt: new Date(),
    });

    return this.chatRepository.save(chat);
  }

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
    });
  }

  async updateChatActivity(chatId: string): Promise<void> {
    await this.chatRepository.update(
      { id: chatId },
      { lastActivityAt: new Date() },
    );
  }

  async deactivateChat(chatId: string): Promise<void> {
    await this.chatRepository.update({ id: chatId }, { isActive: false });
  }

  async sendMessage(
    sendMessageDto: SendMessageDto,
    senderId: string,
  ): Promise<Message> {
    const message = this.messageRepository.create({
      chatId: sendMessageDto.chatId,
      senderId,
      type: sendMessageDto.type,
      content: sendMessageDto.content,
      mediaUrl: sendMessageDto.mediaUrl,
      locationLatitude: sendMessageDto.locationLatitude,
      locationLongitude: sendMessageDto.locationLongitude,
      status: MessageStatus.SENT,
      isEdited: false,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Update chat's last activity
    await this.updateChatActivity(sendMessageDto.chatId);

    return savedMessage;
  }

  async findChatMessages(
    chatId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<Message[]> {
    return this.messageRepository.find({
      where: {
        chatId,
        deletedAt: IsNull(),
      },
      order: { createdAt: "DESC" },
      take: limit,
      skip: offset,
    });
  }

  async findMessageById(id: string): Promise<Message | null> {
    return this.messageRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
  }

  async updateMessage(
    updateMessageDto: UpdateMessageDto,
    userId: string,
  ): Promise<Message | null> {
    const message = await this.findMessageById(updateMessageDto.messageId);

    if (!message || message.senderId !== userId) {
      return null;
    }

    message.content = updateMessageDto.content ?? message.content;
    message.mediaUrl = updateMessageDto.mediaUrl ?? message.mediaUrl;
    message.isEdited = true;
    message.updatedAt = new Date();

    return this.messageRepository.save(message);
  }

  async updateMessageStatus(
    updateStatusDto: UpdateMessageStatusDto,
  ): Promise<boolean> {
    const result = await this.messageRepository.update(
      { id: updateStatusDto.messageId },
      { status: updateStatusDto.status },
    );

    return result.affected ? result.affected > 0 : false;
  }

  async softDeleteMessage(messageId: string, userId: string): Promise<boolean> {
    const message = await this.findMessageById(messageId);

    if (!message || message.senderId !== userId) {
      return false;
    }

    message.deletedAt = new Date();
    await this.messageRepository.save(message);
    return true;
  }

  async getLastMessage(chatId: string): Promise<Message | null> {
    return this.messageRepository.findOne({
      where: { chatId, deletedAt: IsNull() },
      order: { createdAt: "DESC" },
    });
  }

  async countUnreadMessages(chatId: string, userId: string): Promise<number> {
    return this.messageRepository.count({
      where: {
        chatId,
        senderId: Not(userId),
        status: In([MessageStatus.SENT, MessageStatus.DELIVERED]),
        deletedAt: IsNull(),
      },
    });
  }

  async save(chat: Chat): Promise<Chat> {
    return this.chatRepository.save(chat);
  }
}
