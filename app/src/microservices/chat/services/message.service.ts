import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Not, IsNull, In } from "typeorm";
import {
  Message,
  MessageStatus,
  MessageType,
} from "../entities/message.entity";
import { User } from "../../auth/entities/user.entity";
import { ChatService } from "./chat.service";
import { SendMessageDto } from "../dto/send-message.dto";
import { UpdateMessageDto } from "../dto/update-message.dto";
import { UpdateMessageStatusDto } from "../dto/update-message-status.dto";
import { MessageResponseDto } from "../dto/message-response.dto";
import { EventEmitter2 } from "@nestjs/event-emitter";

// Define a minimal user interface for sender information
interface UserInfo {
  id: string;
  username: string;
  displayName: string;
  photoURL: string;
  isOnline: boolean;
}

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly chatService: ChatService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async sendMessage(
    sendMessageDto: SendMessageDto,
    userId: string,
  ): Promise<MessageResponseDto> {
    // Validate chat exists and user is a participant (using chatService)
    await this.chatService.validateChatAccess(sendMessageDto.chatId, userId);

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

    // Create message
    const message = this.messageRepository.create({
      chatId: sendMessageDto.chatId,
      senderId: userId,
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
    await this.chatService.updateChatActivity(sendMessageDto.chatId);

    // Emit event for real-time updates
    this.eventEmitter.emit("message.created", {
      message: savedMessage,
      chatId: sendMessageDto.chatId,
    });

    // Map to response DTO
    const sender = await this.getSenderInfo(userId);
    return this.mapMessageToResponseDto(
      savedMessage,
      sender?.displayName || "Unknown User",
    );
  }

  async getChatMessages(
    chatId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<MessageResponseDto[]> {
    // Validate chat exists and user is a participant (using chatService)
    await this.chatService.validateChatAccess(chatId, userId);

    // Get the messages
    const messages = await this.messageRepository.find({
      where: {
        chatId,
        deletedAt: IsNull(),
      },
      order: { createdAt: "DESC" },
      take: limit,
      skip: offset,
    });

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

  async findMessageById(id: string): Promise<Message | null> {
    return this.messageRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
  }

  async updateMessage(
    updateMessageDto: UpdateMessageDto,
    userId: string,
  ): Promise<MessageResponseDto> {
    const message = await this.findMessageById(updateMessageDto.messageId);

    if (!message) {
      throw new NotFoundException("Message not found");
    }

    if (message.senderId !== userId) {
      throw new UnauthorizedException("You can only edit your own messages");
    }

    message.content = updateMessageDto.content ?? message.content;
    message.mediaUrl = updateMessageDto.mediaUrl ?? message.mediaUrl;
    message.isEdited = true;
    message.updatedAt = new Date();

    const updatedMessage = await this.messageRepository.save(message);

    // Emit event for real-time updates
    this.eventEmitter.emit("message.updated", {
      message: updatedMessage,
      chatId: message.chatId,
    });

    // Map to response DTO
    const sender = await this.getSenderInfo(userId);
    return this.mapMessageToResponseDto(
      updatedMessage,
      sender?.displayName || "Unknown User",
    );
  }

  async updateMessageStatus(
    updateStatusDto: UpdateMessageStatusDto,
    userId: string,
  ): Promise<boolean> {
    // Get the message to check that the user is a participant of the chat
    const message = await this.findMessageById(updateStatusDto.messageId);
    if (!message) {
      throw new NotFoundException(
        `Message with ID ${updateStatusDto.messageId} not found`,
      );
    }

    // Validate user can access the chat
    await this.chatService.validateChatAccess(message.chatId, userId);

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

    const result = await this.messageRepository.update(
      { id: updateStatusDto.messageId },
      { status: updateStatusDto.status },
    );

    if (result.affected && result.affected > 0) {
      // Emit event for real-time updates
      this.eventEmitter.emit("message.status.updated", {
        messageId: updateStatusDto.messageId,
        status: updateStatusDto.status,
        chatId: message.chatId,
      });
      return true;
    }

    return false;
  }

  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    const message = await this.findMessageById(messageId);

    if (!message) {
      throw new NotFoundException("Message not found");
    }

    // Only the sender can delete their own messages
    if (message.senderId !== userId) {
      throw new UnauthorizedException("You can only delete your own messages");
    }

    message.deletedAt = new Date();
    await this.messageRepository.save(message);

    // Emit event for real-time updates
    this.eventEmitter.emit("message.deleted", {
      messageId: messageId,
      chatId: message.chatId,
    });

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
        status: Not(MessageStatus.READ),
        deletedAt: IsNull(),
      },
    });
  }

  async getSenderInfo(userId: string): Promise<UserInfo> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      photoURL: user.photoURL || "",
      isOnline: user.isOnline,
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
      senderName,
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
}
