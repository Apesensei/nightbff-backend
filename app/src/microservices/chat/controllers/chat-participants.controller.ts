import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
} from "@nestjs/common";
import { ChatService } from "../services/chat.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ParticipantDto } from "../dto/chat-response.dto";

class AddParticipantsDto {
  participantIds: string[];
}

@ApiTags("Chat Participants")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller("chats/:chatId/participants")
export class ChatParticipantsController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  @ApiOperation({ summary: "Get all participants of a chat" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns all participants of the chat",
    type: [ParticipantDto],
  })
  async getParticipants(
    @Param("chatId") chatId: string,
    @CurrentUser("id") userId: string,
  ): Promise<ParticipantDto[]> {
    const chat = await this.chatService.validateChatAccess(chatId, userId);
    return chat.participants.map((participant) => ({
      id: participant.id,
      username: participant.username,
      displayName: participant.displayName || participant.username,
      photoURL: participant.photoURL,
      isOnline: participant.isOnline || false,
    }));
  }

  @Post()
  @ApiOperation({ summary: "Add participants to a chat" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Participants added successfully",
  })
  async addParticipants(
    @Param("chatId") chatId: string,
    @Body() addParticipantsDto: AddParticipantsDto,
    @CurrentUser("id") userId: string,
  ): Promise<{ success: boolean }> {
    // First validate that the requester has access to the chat
    await this.chatService.validateChatAccess(chatId, userId);

    // Then add the participants
    await this.chatService.addParticipantsToChat(
      chatId,
      addParticipantsDto.participantIds,
    );

    return { success: true };
  }

  @Delete(":participantId")
  @ApiOperation({ summary: "Remove a participant from a chat" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Participant removed successfully",
  })
  async removeParticipant(
    @Param("chatId") chatId: string,
    @Param("participantId") participantId: string,
    @CurrentUser("id") userId: string,
  ): Promise<{ success: boolean }> {
    const success = await this.chatService.removeParticipantFromChat(
      chatId,
      participantId,
      userId,
    );

    return { success };
  }
}
