import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ChatService } from "../services/chat.service";
import { MessageService } from "../services/message.service";
import { UpdateMessageStatusDto } from "../dto/update-message-status.dto";
import { OnEvent } from "@nestjs/event-emitter";
import { ParseSocketJwtPipe } from "../pipes/parse-socket-jwt.pipe";

interface AuthenticatedSocket extends Socket {
  user: {
    id: string;
    [key: string]: any;
  };
}

@WebSocketGateway({
  namespace: "chat",
  cors: {
    origin: "*",
  },
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  // Map of userId to socket
  private userSockets = new Map<string, Socket[]>();
  // Map of chatId to array of user IDs
  private chatParticipants = new Map<string, Set<string>>();

  constructor(
    private readonly chatService: ChatService,
    private readonly messageService: MessageService,
    private readonly parseJwt: ParseSocketJwtPipe,
  ) {}

  afterInit() {
    console.log("Chat WebSocket Gateway initialized");
  }

  async handleConnection(client: Socket) {
    try {
      // Authenticate the user from the token
      const user = await this.parseJwt.transform(client);

      if (!user) {
        client.disconnect();
        return;
      }

      // Store socket in user map
      (client as AuthenticatedSocket).user = user;

      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, []);
      }
      this.userSockets.get(user.id)?.push(client);

      // Join user to their chat rooms
      const chats = await this.chatService.findChatsByUserId(user.id);
      chats.forEach((chat) => {
        // Add user to chat map
        if (!this.chatParticipants.has(chat.id)) {
          this.chatParticipants.set(chat.id, new Set());
        }
        this.chatParticipants.get(chat.id)?.add(user.id);

        // Join socket room
        client.join(`chat:${chat.id}`);
      });

      // Emit user online status
      this.server.emit("user:status", { userId: user.id, status: "online" });
    } catch (error) {
      console.error("WebSocket connection error:", error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const authClient = client as AuthenticatedSocket;
    if (authClient.user) {
      const userId = authClient.user.id;

      // Remove socket from user map
      const userSockets = this.userSockets.get(userId) || [];
      const updatedSockets = userSockets.filter(
        (socket) => socket.id !== client.id,
      );

      if (updatedSockets.length > 0) {
        this.userSockets.set(userId, updatedSockets);
      } else {
        this.userSockets.delete(userId);

        // If this was the last socket, emit offline status
        this.server.emit("user:status", { userId, status: "offline" });
      }
    }
  }

  // Subscribe to real-time events from message service
  @OnEvent("message.created")
  handleMessageCreated(payload: { message: any; chatId: string }) {
    this.server
      .to(`chat:${payload.chatId}`)
      .emit("message:new", payload.message);
  }

  @OnEvent("message.updated")
  handleMessageUpdated(payload: { message: any; chatId: string }) {
    this.server
      .to(`chat:${payload.chatId}`)
      .emit("message:updated", payload.message);
  }

  @OnEvent("message.deleted")
  handleMessageDeleted(payload: { messageId: string; chatId: string }) {
    this.server
      .to(`chat:${payload.chatId}`)
      .emit("message:deleted", { messageId: payload.messageId });
  }

  @OnEvent("message.status.updated")
  handleMessageStatusUpdated(payload: {
    messageId: string;
    status: string;
    chatId: string;
  }) {
    this.server.to(`chat:${payload.chatId}`).emit("message:status", payload);
  }

  @OnEvent("chat.created")
  handleChatCreated(payload: { chat: any; creatorId: string }) {
    // Add all participants to the chat room
    if (payload.chat.participants) {
      payload.chat.participants.forEach((participant: any) => {
        // Add user to chat map
        if (!this.chatParticipants.has(payload.chat.id)) {
          this.chatParticipants.set(payload.chat.id, new Set());
        }
        this.chatParticipants.get(payload.chat.id)?.add(participant.id);

        // Add all sockets of this user to the chat room
        const userSockets = this.userSockets.get(participant.id) || [];
        userSockets.forEach((socket) => {
          socket.join(`chat:${payload.chat.id}`);
        });

        // Notify user of new chat
        if (participant.id !== payload.creatorId) {
          userSockets.forEach((socket) => {
            socket.emit("chat:new", payload.chat);
          });
        }
      });
    }
  }

  @OnEvent("chat.participants.added")
  handleParticipantsAdded(payload: {
    chatId: string;
    participantIds: string[];
  }) {
    payload.participantIds.forEach((userId) => {
      // Add user to chat map
      if (!this.chatParticipants.has(payload.chatId)) {
        this.chatParticipants.set(payload.chatId, new Set());
      }
      this.chatParticipants.get(payload.chatId)?.add(userId);

      // Add all sockets of this user to the chat room
      const userSockets = this.userSockets.get(userId) || [];
      userSockets.forEach((socket) => {
        socket.join(`chat:${payload.chatId}`);
        socket.emit("chat:joined", { chatId: payload.chatId });
      });
    });

    // Notify all participants of new users
    this.server.to(`chat:${payload.chatId}`).emit("chat:participants", {
      chatId: payload.chatId,
      participantIds: payload.participantIds,
      action: "added",
    });
  }

  @OnEvent("chat.participant.removed")
  handleParticipantRemoved(payload: {
    chatId: string;
    participantId: string;
    requesterId: string;
  }) {
    // Remove user from chat map
    this.chatParticipants.get(payload.chatId)?.delete(payload.participantId);

    // Remove all sockets of this user from the chat room
    const userSockets = this.userSockets.get(payload.participantId) || [];
    userSockets.forEach((socket) => {
      socket.leave(`chat:${payload.chatId}`);
      socket.emit("chat:left", { chatId: payload.chatId });
    });

    // Notify all participants
    this.server.to(`chat:${payload.chatId}`).emit("chat:participants", {
      chatId: payload.chatId,
      participantId: payload.participantId,
      requesterId: payload.requesterId,
      action: "removed",
    });
  }

  @SubscribeMessage("typing")
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; isTyping: boolean },
  ) {
    if (!client.user) return;

    this.server.to(`chat:${data.chatId}`).emit("user:typing", {
      userId: client.user.id,
      chatId: data.chatId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage("read")
  async handleReadMessages(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; messageIds: string[] },
  ) {
    if (!client.user) return;

    // Mark messages as read
    const updates = data.messageIds.map(async (messageId) => {
      const updateDto: UpdateMessageStatusDto = {
        messageId,
        status: "READ" as any,
      };
      return this.messageService.updateMessageStatus(updateDto, client.user.id);
    });

    await Promise.all(updates);
  }
}
