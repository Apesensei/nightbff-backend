import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
} from "@nestjs/common";
import { MessageService } from "../services/message.service";
import { SendMessageDto } from "../dto/send-message.dto";
import { UpdateMessageDto } from "../dto/update-message.dto";
import { UpdateMessageStatusDto } from "../dto/update-message-status.dto";
import { MessageResponseDto } from "../dto/message-response.dto";
import { MessageStatus } from "../entities/message.entity";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { User } from "../../auth/entities/user.entity";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";

@ApiTags("Messages")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller()
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post("chats/:chatId/messages")
  @ApiOperation({ summary: "Send a message to a chat" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "The message has been successfully sent",
    type: MessageResponseDto,
  })
  async sendMessage(
    @Param("chatId") chatId: string,
    @Body() messageData: Omit<SendMessageDto, "chatId">,
    @CurrentUser() currentUser: User,
  ): Promise<MessageResponseDto> {
    // Combine the path parameter with the body to create the complete DTO
    const sendMessageDto: SendMessageDto = {
      chatId,
      ...messageData,
    };

    return this.messageService.sendMessage(sendMessageDto, currentUser.id);
  }

  @Get("chats/:chatId/messages")
  @ApiOperation({ summary: "Get messages for a chat" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns messages for the chat",
    type: [MessageResponseDto],
  })
  async getChatMessages(
    @Param("chatId") chatId: string,
    @CurrentUser() currentUser: User,
    @Query("limit") limit?: number,
    @Query("offset") offset?: number,
  ): Promise<MessageResponseDto[]> {
    return this.messageService.getChatMessages(
      chatId,
      currentUser.id,
      limit,
      offset,
    );
  }

  @Patch("messages/:messageId")
  @ApiOperation({ summary: "Update a message" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The message has been successfully updated",
    type: MessageResponseDto,
  })
  async updateMessage(
    @Param("messageId") messageId: string,
    @Body() updateData: Omit<UpdateMessageDto, "messageId">,
    @CurrentUser() currentUser: User,
  ): Promise<MessageResponseDto> {
    // Combine the path parameter with the body to create the complete DTO
    const updateMessageDto: UpdateMessageDto = {
      messageId,
      ...updateData,
    };

    return this.messageService.updateMessage(updateMessageDto, currentUser.id);
  }

  @Post("messages/:messageId/read")
  @ApiOperation({ summary: "Mark a message as read" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The message has been marked as read",
  })
  @HttpCode(HttpStatus.OK)
  async markMessageAsRead(
    @Param("messageId") messageId: string,
    @CurrentUser() currentUser: User,
  ): Promise<{ success: boolean }> {
    const updateStatusDto: UpdateMessageStatusDto = {
      messageId,
      status: MessageStatus.READ,
    };

    const result = await this.messageService.updateMessageStatus(
      updateStatusDto,
      currentUser.id,
    );
    return { success: result };
  }

  @Delete("messages/:messageId")
  @ApiOperation({ summary: "Delete a message" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The message has been successfully deleted",
  })
  @HttpCode(HttpStatus.OK)
  async deleteMessage(
    @Param("messageId") messageId: string,
    @CurrentUser() currentUser: User,
  ): Promise<{ success: boolean }> {
    const result = await this.messageService.deleteMessage(
      messageId,
      currentUser.id,
    );
    return { success: result };
  }
}
