import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common"; // Combined imports
import request from "supertest";
import { TypeOrmModule, getRepositoryToken, TypeOrmModuleOptions } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "@/common/database/database.module";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql"; // Added Testcontainers import
// Removed unused ValidationPipe import here as it's combined above

import { ChatModule } from "../chat.module";
import { Chat, ChatType } from "../entities/chat.entity";
import { Message, MessageType } from "../entities/message.entity";
import { User } from "../../auth/entities/user.entity";
import { AuthModule } from "../../auth/auth.module";
import { EventModule } from '../../event/event.module'; // Added import

// --- Add missing entity imports --- 
import { Event } from "../../event/entities/event.entity";
import { EventAttendee } from "../../event/entities/event-attendee.entity";
import { Interest } from "../../interest/entities/interest.entity";
import { UserInterest } from "../../interest/entities/user-interest.entity";
import { EventInterest } from "../../interest/entities/event-interest.entity";
// --- End missing entity imports ---

// --- Add missing AgeVerification entity import ---
import { AgeVerification } from "../../auth/entities/age-verification.entity";
// --- End missing AgeVerification entity import ---

// Remove ALL Controller and Service imports if not directly used for setup/assertions
// import { ChatService } from "../services/chat.service";
// import { ChatController } from "../controllers/chat.controller";
// import { MessageController } from "../controllers/message.controller";
// import { ChatParticipantsController } from "../controllers/chat-participants.controller";

// Remove DTO imports if not directly used for assertions
// import { ChatResponseDto } from "../dto/chat-response.dto";
// import { MessageResponseDto } from "../dto/message-response.dto";

// --- Testcontainers Setup ---
let postgresContainer: StartedPostgreSqlContainer;
let app: INestApplication;
// --- End Testcontainers Setup ---

describe("Chat API (e2e)", () => {
  // Increased timeout for Docker operations
  jest.setTimeout(60000); 

  let userRepository: Repository<User>;
  let jwtToken: string;
  let testUser: User;
  let otherUser: User;
  let testChat: Chat | null = null; // Initialize to null for safety
  let testMessage: Message | null = null; // Initialize to null for safety

  beforeAll(async () => {
    console.log("Starting PostgreSQL container...");
    const postgresContainerInstance = new PostgreSqlContainer("postgres:15");
    postgresContainer = await postgresContainerInstance.start();
    console.log("PostgreSQL container started.");

    console.log("Creating TypeORM options...");
    const typeOrmOptions: TypeOrmModuleOptions = {
      type: 'postgres',
      host: postgresContainer.getHost(),
      port: postgresContainer.getPort(),
      username: postgresContainer.getUsername(),
      password: postgresContainer.getPassword(),
      database: postgresContainer.getDatabase(),
      entities: [User, Chat, Message, Event, EventAttendee, Interest, UserInterest, EventInterest, AgeVerification],
      synchronize: true, // Create schema automatically
      dropSchema: true, // Ensure clean state for tests
      logging: false, // Keep false unless debugging SQL
    };
    console.log("TypeORM options created:", {
      host: typeOrmOptions.host,
      port: typeOrmOptions.port,
      username: typeOrmOptions.username,
      database: typeOrmOptions.database,
    });

    console.log("Compiling module..."); // Log before compile
    const compiledModule: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env.test" }),
        DatabaseModule, // Provides global entity registration (for non-test connections if ever needed)
        // Replace previous TypeOrmModule.forRoot with the dynamic one
        TypeOrmModule.forRoot(typeOrmOptions),
        EventEmitterModule.forRoot(),
        AuthModule,
        ChatModule,
        EventModule, // Uncommented: Include EventModule and its dependencies (like InterestModule)
      ],
      // No direct providers for controllers/services needed for E2E
    }).compile();
    console.log("Module compiled."); // Log after compile

    app = compiledModule.createNestApplication();

    // Apply global prefix and pipes exactly like in main.ts
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    console.log("Initializing app..."); // Log before init
    await app.init();
    console.log("App initialized."); // Log after init

    // Get Repositories needed for setup/assertions - use getRepositoryToken
    try {
      userRepository = compiledModule.get(getRepositoryToken(User)); 
    } catch (e) {
      console.error("Error getting repositories in test setup:", e);
      throw e; // Fail fast if repositories can't be retrieved
    }

    // Create test users directly using the repository
    testUser = await userRepository.save(
      userRepository.create({
        // Use .create() for better clarity
        email: "test@example.com",
        username: "testuser",
        displayName: "Test User",
        passwordHash: "test-hash", // In real app, use hashing
      }),
    );
    otherUser = await userRepository.save(
      userRepository.create({
        email: "other@example.com",
        username: "otheruser",
        displayName: "Other User",
        passwordHash: "other-hash",
      }),
    );

    // Generate JWT token using compiledModule
    const jwtService = compiledModule.get(JwtService);
    jwtToken = jwtService.sign({
      sub: testUser.id,
      email: testUser.email,
      username: testUser.username,
      // Add any other claims your AuthGuard/Strategy expects
    });

    // --- Debug Logging ---
    console.log(`Test Setup: testUser ID = ${testUser.id}`);
    console.log(`Test Setup: otherUser ID = ${otherUser.id}`);
    console.log(`Test Setup: JWT Token = ${jwtToken}`);
    // --- End Debug Logging ---

    // Reset test variables before each run (optional but good practice)
    testChat = null;
    testMessage = null;
  });

  afterAll(async () => {
    // Clean up database connections, etc.
    await app?.close(); // Use optional chaining for safety
    // Stop the Testcontainer
    await postgresContainer?.stop();
    console.log("PostgreSQL container stopped.");
    // No need for explicit repository.clear() with dropSchema: true
  });

  // Reset testChat and testMessage before each describe block or test if needed
  beforeEach(() => {
    // This ensures tests depending on previous ones have a clean slate if needed
    // If tests MUST run sequentially and depend on state, manage this carefully
  });

  // Remove .only to run all tests again
  describe("Chat Management", () => {
    it("POST /api/chats - Create a new chat", async () => {
      const createChatDto = {
        type: ChatType.DIRECT,
        participantIds: [otherUser.id],
        // title: "Optional Title" // Add if your DTO allows/requires it
      };

      const response = await request(app.getHttpServer())
        .post("/api/chats")
        .set("Authorization", `Bearer ${jwtToken}`)
        .send(createChatDto)
        .expect(201); // Expect 'Created'

      expect(response.body).toHaveProperty("id");
      expect(response.body.type).toBe(ChatType.DIRECT);
      // Ensure participants are correctly represented in the response if needed
      // expect(response.body.participants).toEqual(expect.arrayContaining([expect.objectContaining({ id: testUser.id }), expect.objectContaining({ id: otherUser.id })]));

      // Assign the created chat (or just its ID) for subsequent tests
      // Casting might be needed if response is DTO
      testChat = response.body as Chat; // Store the created chat entity/dto
      console.log("Created testChat:", testChat); // Debug log
    });

    it("GET /api/chats/me - Get user chats", async () => {
      // This test depends on the previous one creating a chat
      if (!testChat) {
        throw new Error(
          "Cannot run 'Get user chats' test: testChat not created in previous step.",
        );
      }

      const response = await request(app.getHttpServer())
        .get("/api/chats/me") // Corrected endpoint to fetch current user's chats
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      // Optionally, check if the newly created chat is in the list
      expect(response.body.some((chat: any) => chat.id === testChat?.id)).toBe(
        true,
      );
    });

    it("GET /api/chats/:id - Get chat by ID", async () => {
      if (!testChat?.id) {
        throw new Error(
          "Cannot run 'Get chat by ID' test: testChat.id is undefined.",
        );
      }

      const response = await request(app.getHttpServer())
        .get(`/api/chats/${testChat.id}`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("id", testChat.id);
      // Add more assertions based on expected response structure
    });
  });

  describe("Message Management", () => {
    // Removed beforeAll check here, added checks within each test

    it("POST /api/chats/:id/messages - Send a message", async () => {
      if (!testChat?.id) {
        throw new Error(
          "Cannot run 'Send message' test: testChat.id is undefined.",
        );
      }
      const sendMessageDto = {
        type: MessageType.TEXT, // Ensure MessageType is imported and used
        content: "Hello, this is a test message",
      };

      const response = await request(app.getHttpServer())
        .post(`/api/chats/${testChat.id}/messages`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send(sendMessageDto)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.content).toBe(sendMessageDto.content);
      // Verify sender ID directly from the DTO
      expect(response.body.senderId).toBe(testUser.id);
      testMessage = response.body as Message; // Store the created message
      console.log("Created testMessage:", testMessage); // Debug log
    });

    it("GET /api/chats/:id/messages - Get chat messages", async () => {
      if (!testChat?.id) {
        throw new Error(
          "Cannot run 'Get messages' test: testChat.id is undefined.",
        );
      }
      if (!testMessage) {
        throw new Error(
          "Cannot run 'Get messages' test: testMessage not created in previous step.",
        );
      }

      const response = await request(app.getHttpServer())
        .get(`/api/chats/${testChat.id}/messages`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      // Optionally, check if the sent message is present
      expect(response.body.some((msg: any) => msg.id === testMessage?.id)).toBe(
        true,
      );
    });

    it("PATCH /api/messages/:id - Update a message", async () => {
      if (!testMessage?.id) {
        throw new Error(
          "Cannot run 'Update message' test: testMessage.id is undefined.",
        );
      }

      const updateMessageDto = {
        content: "Updated message content",
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/messages/${testMessage.id}`) // Endpoint targets message directly
        .set("Authorization", `Bearer ${jwtToken}`)
        .send(updateMessageDto)
        .expect(200);

      expect(response.body).toHaveProperty("id", testMessage.id);
      expect(response.body.content).toBe(updateMessageDto.content);
      expect(response.body.isEdited).toBe(true);
    });

    it("POST /api/messages/:id/read - Mark message as read", async () => {
      if (!testMessage?.id) {
        throw new Error(
          "Cannot run 'Mark read' test: testMessage.id is undefined.",
        );
      }
      if (!otherUser?.id) {
        throw new Error(
          "Cannot run 'Mark read' test: otherUser.id is undefined.",
        );
      }

      // Use the OTHER user's token to mark the message as read
      const otherJwtService = app.get(JwtService); // Get service instance from app
      const otherJwtToken = otherJwtService.sign({
        sub: otherUser.id,
        email: otherUser.email,
        username: otherUser.username,
      });

      await request(app.getHttpServer())
        .post(`/api/messages/${testMessage.id}/read`)
        .set("Authorization", `Bearer ${otherJwtToken}`) // Use other user's token
        .expect(200); // Expect success status

      // Verification would involve fetching the message again or checking DB state
      // For now, we just check if the endpoint returns success
    });
  });

  describe("Chat Participants", () => {
    // Removed beforeAll check, add checks within each test

    it("GET /api/chats/:id/participants - List chat participants", async () => {
      if (!testChat?.id) {
        throw new Error(
          "Cannot run 'List participants' test: testChat.id is undefined.",
        );
      }

      const response = await request(app.getHttpServer())
        .get(`/api/chats/${testChat.id}/participants`)
        .set("Authorization", `Bearer ${jwtToken}`) // Use test user's token
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2); // Expecting testUser and otherUser
      // Check participant ID directly on the DTO element
      expect(response.body.some((p: any) => p.id === testUser.id)).toBe(true);
      expect(response.body.some((p: any) => p.id === otherUser.id)).toBe(true);
    });

    // --- Tests for adding/removing participants might not apply to DIRECT chats ---
    // --- Add tests for EVENT chats if applicable ---

    // Example: Assuming adding/removing is allowed OR for EVENT chats
    // it("POST /api/chats/:id/participants - Add participant to chat", async () => {
    //   if (!testChat?.id) { throw new Error("Test setup failed"); }
    //   // Create a third user if needed
    //   const thirdUser = await userRepository.save(userRepository.create({ email: "third@example.com", username: "thirduser", displayName: "Third User", passwordHash:"hash"}));
    //
    //   await request(app.getHttpServer())
    //     .post(`/api/chats/${testChat.id}/participants`)
    //     .set("Authorization", `Bearer ${jwtToken}`) // Assuming creator can add
    //     .send({ userId: thirdUser.id })
    //     .expect(200); // Or 201 if appropriate
    //
    //   // Verify participant added
    // });
    //
    // it("DELETE /api/chats/:id/participants/:userId - Remove participant from chat", async () => {
    //    if (!testChat?.id) { throw new Error("Test setup failed"); }
    //
    //    await request(app.getHttpServer())
    //     .delete(`/api/chats/${testChat.id}/participants/${otherUser.id}`)
    //     .set("Authorization", `Bearer ${jwtToken}`) // Assuming creator can remove
    //     .expect(200);
    //
    //   // Verify participant removed
    // });
  });
});
