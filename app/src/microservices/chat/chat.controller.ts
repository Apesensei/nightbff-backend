import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Delete,
  Patch,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseInterceptors,
  ClassSerializerInterceptor,
} from "@nestjs/common";
import { ChatService } from "./chat.service";
import { CreateChatDto } from "./dto/create-chat.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { UpdateMessageDto } from "./dto/update-message.dto";
import { UpdateMessageStatusDto } from "./dto/update-message-status.dto";
import { ChatResponseDto } from "./dto/chat-response.dto";
import { MessageResponseDto } from "./dto/message-response.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";

@ApiTags("Chat")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

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
    return this.chatService.createChat(createChatDto, userId);
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
    return this.chatService.getUserChats(userId);
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
    return this.chatService.getChatById(chatId, userId);
  }

  @Post("send")
  @ApiOperation({ summary: "Send a message to a chat" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "The message has been successfully sent",
    type: MessageResponseDto,
  })
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @CurrentUser("id") userId: string,
  ): Promise<MessageResponseDto> {
    return this.chatService.sendMessage(sendMessageDto, userId);
  }

  @Get(":id/messages")
  @ApiOperation({ summary: "Get messages for a chat" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns messages for the chat",
    type: [MessageResponseDto],
  })
  async getChatMessages(
    @Param("id") chatId: string,
    @CurrentUser("id") userId: string,
    @Query("limit") limit: number = 50,
    @Query("offset") offset: number = 0,
  ): Promise<MessageResponseDto[]> {
    return this.chatService.getChatMessages(chatId, userId, limit, offset);
  }

  @Patch("message")
  @ApiOperation({ summary: "Update a message" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The message has been successfully updated",
    type: MessageResponseDto,
  })
  async updateMessage(
    @Body() updateMessageDto: UpdateMessageDto,
    @CurrentUser("id") userId: string,
  ): Promise<MessageResponseDto> {
    return this.chatService.updateMessage(updateMessageDto, userId);
  }

  @Patch("message/status")
  @ApiOperation({ summary: "Update a message status" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The message status has been successfully updated",
  })
  @HttpCode(HttpStatus.OK)
  async updateMessageStatus(
    @Body() updateStatusDto: UpdateMessageStatusDto,
    @CurrentUser("id") userId: string,
  ): Promise<{ success: boolean }> {
    const result = await this.chatService.updateMessageStatus(
      updateStatusDto,
      userId,
    );
    return { success: result };
  }

  @Delete("message/:id")
  @ApiOperation({ summary: "Delete a message" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The message has been successfully deleted",
  })
  @HttpCode(HttpStatus.OK)
  async deleteMessage(
    @Param("id") messageId: string,
    @CurrentUser("id") userId: string,
  ): Promise<{ success: boolean }> {
    const result = await this.chatService.deleteMessage(messageId, userId);
    return { success: result };
  }
}
