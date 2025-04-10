import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtModule } from "@nestjs/jwt";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ConfigModule } from "@nestjs/config";

import { ChatModule } from "../chat.module";
import { Chat, ChatType } from "../entities/chat.entity";
import { Message } from "../entities/message.entity";
import { User } from "../../user/entities/user.entity";

describe("Chat API (e2e)", () => {
  let app: INestApplication;
  let chatRepository: Repository<Chat>;
  let userRepository: Repository<User>;
  let jwtToken: string;
  let testUser: User;
  let testChat: Chat;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "sqlite",
          database: ":memory:",
          entities: [Chat, Message, User],
          synchronize: true,
        }),
        JwtModule.register({
          secret: "test-secret",
          signOptions: { expiresIn: "1h" },
        }),
        EventEmitterModule.forRoot(),
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ".env.test",
        }),
        ChatModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    chatRepository = moduleFixture.get("ChatRepository");
    userRepository = moduleFixture.get("UserRepository");

    // Create test user
    testUser = await userRepository.save({
      email: "test@example.com",
      username: "testuser",
      displayName: "Test User",
      password: "password",
    });

    // Generate JWT token for test user
    const jwtService = moduleFixture.get("JwtService");
    jwtToken = jwtService.sign({
      sub: testUser.id,
      email: testUser.email,
      username: testUser.username,
    });

    // Mock implementations
    jest
      .spyOn(chatRepository, "findOne")
      .mockImplementation(async (options) => {
        if (options && options.where) {
          const whereClause = Array.isArray(options.where)
            ? options.where[0]
            : options.where;
          if (whereClause && whereClause.id === testChat?.id) {
            return testChat;
          }
        }
        return null;
      });

    jest.spyOn(chatRepository, "find").mockImplementation(() => {
      return Promise.resolve([testChat]);
    });

    jest
      .spyOn(userRepository, "findOne")
      .mockImplementation(async (options) => {
        if (options && options.where) {
          const whereClause = Array.isArray(options.where)
            ? options.where[0]
            : options.where;
          if (whereClause && whereClause.id === testUser.id) {
            return testUser;
          }
        }
        return null;
      });

    const chatService = moduleFixture.get("ChatService");
    jest.spyOn(chatService, "findChatsByUserId").mockImplementation(() => {
      return Promise.resolve([testChat]);
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Chat Management", () => {
    it("POST /api/chats - Create a new chat", async () => {
      const createChatDto = {
        type: ChatType.DIRECT,
        participantIds: ["other-user-id"],
      };

      const response = await request(app.getHttpServer())
        .post("/api/chats")
        .set("Authorization", `Bearer ${jwtToken}`)
        .send(createChatDto)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.type).toBe(ChatType.DIRECT);
      testChat = response.body as Chat;
    });

    it("GET /api/chats - Get user chats", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/chats")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    it("GET /api/chats/:id - Get chat by ID", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/chats/${testChat.id}`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("id", testChat.id);
    });
  });

  describe("Message Management", () => {
    let testMessage: Message;

    it("POST /api/chats/:id/messages - Send a message", async () => {
      const sendMessageDto = {
        type: "TEXT",
        content: "Hello, this is a test message",
      };

      const response = await request(app.getHttpServer())
        .post(`/api/chats/${testChat.id}/messages`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send(sendMessageDto)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.content).toBe(sendMessageDto.content);
      testMessage = response.body as Message;
    });

    it("GET /api/chats/:id/messages - Get chat messages", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/chats/${testChat.id}/messages`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    it("PATCH /api/messages/:id - Update a message", async () => {
      const updateMessageDto = {
        content: "Updated message content",
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/messages/${testMessage.id}`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send(updateMessageDto)
        .expect(200);

      expect(response.body).toHaveProperty("id", testMessage.id);
      expect(response.body.content).toBe(updateMessageDto.content);
      expect(response.body.isEdited).toBe(true);
    });

    it("POST /api/messages/:id/read - Mark message as read", async () => {
      await request(app.getHttpServer())
        .post(`/api/messages/${testMessage.id}/read`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // We would verify the message status is READ in a real test
    });
  });

  describe("Chat Participants", () => {
    it("GET /api/chats/:id/participants - List chat participants", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/chats/${testChat.id}/participants`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });

    it("POST /api/chats/:id/participants - Add participant to chat", async () => {
      const addParticipantDto = {
        userIds: ["new-user-id"],
      };

      await request(app.getHttpServer())
        .post(`/api/chats/${testChat.id}/participants`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send(addParticipantDto)
        .expect(201);
    });

    it("DELETE /api/chats/:id/participants/:userId - Remove participant from chat", async () => {
      await request(app.getHttpServer())
        .delete(`/api/chats/${testChat.id}/participants/new-user-id`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);
    });
  });
});
