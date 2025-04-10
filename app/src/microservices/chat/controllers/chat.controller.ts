import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
} from "@nestjs/common";
import { ChatService } from "../services/chat.service";
import { MessageService } from "../services/message.service";
import { CreateChatDto } from "../dto/create-chat.dto";
import { ChatResponseDto } from "../dto/chat-response.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";

@ApiTags("Chats")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller("chats")
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly messageService: MessageService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create a new chat" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "The chat has been successfully created",
    type: ChatResponseDto,
  })
  async createChat(
    @Body() createChatDto: CreateChatDto,
    @CurrentUser("id") userId: string,
  ): Promise<ChatResponseDto> {
    return this.chatService.createChat(
      createChatDto,
      userId,
    ) as Promise<ChatResponseDto>;
  }

  @Get("me")
  @ApiOperation({ summary: "Get all chats for current user" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns all chats for the current user",
    type: [ChatResponseDto],
  })
  async getUserChats(
    @CurrentUser("id") userId: string,
  ): Promise<ChatResponseDto[]> {
    const chats = await this.chatService.getUserChats(userId);

    // Enrich with message data
    for (const chat of chats) {
      if (chat.id) {
        // Get unread count
        chat.unreadCount = await this.messageService.countUnreadMessages(
          chat.id,
          userId,
        );

        // Get last message
        const lastMessage = await this.messageService.getLastMessage(chat.id);
        if (lastMessage) {
          const sender = await this.messageService.getSenderInfo(
            lastMessage.senderId,
          );
          chat.lastMessage = {
            id: lastMessage.id,
            chatId: lastMessage.chatId,
            senderId: lastMessage.senderId,
            senderName: sender?.displayName || "Unknown User",
            type: lastMessage.type,
            content: lastMessage.content,
            mediaUrl: lastMessage.mediaUrl,
            locationLatitude: lastMessage.locationLatitude,
            locationLongitude: lastMessage.locationLongitude,
            status: lastMessage.status,
            isEdited: lastMessage.isEdited,
            createdAt: lastMessage.createdAt,
            updatedAt: lastMessage.updatedAt,
          };
        }
      }
    }

    return chats;
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a chat by ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the chat with the given ID",
    type: ChatResponseDto,
  })
  async getChatById(
    @Param("id") chatId: string,
    @CurrentUser("id") userId: string,
  ): Promise<ChatResponseDto> {
    const chat = await this.chatService.getChatById(chatId, userId);

    // Enrich with message data
    if (chat.id) {
      // Get unread count
      chat.unreadCount = await this.messageService.countUnreadMessages(
        chat.id,
        userId,
      );

      // Get last message
      const lastMessage = await this.messageService.getLastMessage(chat.id);
      if (lastMessage) {
        const sender = await this.messageService.getSenderInfo(
          lastMessage.senderId,
        );
        chat.lastMessage = {
          id: lastMessage.id,
          chatId: lastMessage.chatId,
          senderId: lastMessage.senderId,
          senderName: sender?.displayName || "Unknown User",
          type: lastMessage.type,
          content: lastMessage.content,
          mediaUrl: lastMessage.mediaUrl,
          locationLatitude: lastMessage.locationLatitude,
          locationLongitude: lastMessage.locationLongitude,
          status: lastMessage.status,
          isEdited: lastMessage.isEdited,
          createdAt: lastMessage.createdAt,
          updatedAt: lastMessage.updatedAt,
        };
      }
    }

    return chat;
  }

  @Delete(":id")
  @ApiOperation({ summary: "Deactivate a chat" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The chat has been successfully deactivated",
  })
  @HttpCode(HttpStatus.OK)
  async deactivateChat(
    @Param("id") chatId: string,
    @CurrentUser("id") userId: string,
  ): Promise<{ success: boolean }> {
    const result = await this.chatService.deactivateChat(chatId, userId);
    return { success: result };
  }
}
