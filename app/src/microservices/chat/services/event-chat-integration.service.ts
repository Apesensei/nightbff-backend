import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { ChatService } from "./chat.service";
import { CreateChatDto } from "../dto/create-chat.dto";
import { ChatType } from "../entities/chat.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Chat } from "../entities/chat.entity";

/**
 * Service responsible for automatic integration between events and chat rooms.
 * Listens for event-related events and manages corresponding chat rooms.
 */
@Injectable()
export class EventChatIntegrationService {
  constructor(
    private readonly chatService: ChatService,
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
  ) {}

  /**
   * Handles event creation by creating a corresponding chat room.
   *
   * @param payload - Event creation payload containing eventId, title, and creatorId
   */
  @OnEvent("event.created")
  async handleEventCreated(payload: {
    eventId: string;
    title: string;
    creatorId: string;
    visibility: string;
  }) {
    // Check if a chat for this event already exists
    const existingChat = await this.chatService.findEventChat(payload.eventId);

    if (!existingChat) {
      // Create a new chat for the event
      const createChatDto: CreateChatDto = {
        type: ChatType.EVENT,
        title: payload.title,
        eventId: payload.eventId,
        participantIds: [], // Creator will be added automatically
      };

      await this.chatService.createChat(createChatDto, payload.creatorId);
    }
  }

  /**
   * Handles event updates by updating the corresponding chat room's metadata.
   * Currently only updates the chat title when event title changes.
   *
   * @param payload - Event update payload containing eventId, title, and creatorId
   */
  @OnEvent("event.updated")
  async handleEventUpdated(payload: {
    eventId: string;
    title: string;
    creatorId: string;
  }) {
    // Find the chat for this event
    const eventChat = await this.chatService.findEventChat(payload.eventId);

    if (eventChat && eventChat.title !== payload.title) {
      // Update the chat title directly using the repository
      await this.chatRepository.update(
        { id: eventChat.id },
        { title: payload.title },
      );
    }
  }

  /**
   * Handles event deletion by deactivating the corresponding chat room.
   * Chat history is preserved for reference.
   *
   * @param payload - Event deletion payload containing eventId and creatorId
   */
  @OnEvent("event.deleted")
  async handleEventDeleted(payload: { eventId: string; creatorId: string }) {
    // Find the chat for this event
    const eventChat = await this.chatService.findEventChat(payload.eventId);

    if (eventChat) {
      // Deactivate the chat but preserve history
      await this.chatService.deactivateChat(eventChat.id, payload.creatorId);
    }
  }

  /**
   * Handles a user joining an event by adding them to the corresponding chat room.
   * For events that require approval, users are only added if their status is APPROVED.
   *
   * @param payload - Event join payload containing eventId, userId, and approval status
   */
  @OnEvent("event.joined")
  async handleEventJoined(payload: {
    eventId: string;
    userId: string;
    status: string;
  }) {
    // Find the chat for this event
    const eventChat = await this.chatService.findEventChat(payload.eventId);

    if (eventChat) {
      // Only add user to chat if they are properly approved for events requiring approval
      // Status will be 'APPROVED', 'PENDING', or 'GOING' (for events not requiring approval)
      if (payload.status === "APPROVED" || payload.status === "GOING") {
        // Check if user is already a participant
        const isParticipant = eventChat.participants?.some(
          (participant) => participant.id === payload.userId,
        );

        if (!isParticipant) {
          // Add user to the chat participants
          await this.chatService.addParticipantsToChat(eventChat.id, [
            payload.userId,
          ]);
        }
      }
      // For PENDING status, we don't add them to the chat yet
    }
  }

  /**
   * Handles a user leaving an event by removing them from the corresponding chat room.
   *
   * @param payload - Event leave payload containing eventId and userId
   */
  @OnEvent("event.left")
  async handleEventLeft(payload: { eventId: string; userId: string }) {
    // Find the chat for this event
    const eventChat = await this.chatService.findEventChat(payload.eventId);

    if (eventChat) {
      // Remove user from chat participants
      // We use the user's ID as the requester ID since they're removing themselves
      await this.chatService.removeParticipantFromChat(
        eventChat.id,
        payload.userId,
        payload.userId,
      );
    }
  }
}
