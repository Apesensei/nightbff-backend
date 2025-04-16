# Chat Module

## 1. Purpose

Handles real-time messaging functionality, including direct messages, group chats, and event-specific chat rooms, using WebSockets.

## 2. Key Components

- **Entities:**
  - `Chat.entity.ts`: Represents a chat room (direct, group, event), tracks participants, and metadata.
  - `Message.entity.ts`: Represents a single message within a chat (text, image, location), including sender and status.
- **Services:**
  - `ChatService.ts`: Manages chat room creation, participant management (add/remove), and metadata updates.
  - `MessageService.ts`: Handles message creation, updates (editing), deletion, and status tracking (sent, delivered, read).
  - `EventChatIntegrationService.ts`: Listens for events from the `EventModule` to automatically create/manage event chat rooms and add/remove participants.
  - `MediaUploadService.ts`: Handles image uploads for messages.
- **Repositories:**
  - `ChatRepository.ts`: CRUD for `Chat` entities.
  - `MessageRepository.ts`: CRUD for `Message` entities.
- **Gateways:**
  - `ChatGateway.ts`: WebSocket gateway handling real-time connections, message broadcasting, typing indicators, read receipts, and online status.
- **Controllers:**
  - `ChatController.ts`: REST endpoints for managing chats (create, list, get, delete).
  - `MessageController.ts`: REST endpoints for managing messages (potentially for history retrieval, though primary interaction is via WebSocket).
  - `ChatParticipantsController.ts`: REST endpoints for managing chat participants.
  - `MediaUploadController.ts`: REST endpoint for uploading media for messages.
- **DTOs:**
  - `dto/`: DTOs for API requests/responses and WebSocket event payloads.

## 3. API Endpoints

- `POST /chat`: Create a new chat (likely direct or group).
- `GET /chat`: Get chats for the current user.
- `GET /chat/:id`: Get details of a specific chat.
- `DELETE /chat/:id`: Delete/leave a chat.
- `POST /chat/:id/participants`: Add participants.
- `DELETE /chat/:id/participants/:userId`: Remove a participant.
- `POST /chat/message`: (Potentially for initial message or REST fallback) Send a message.
- `PATCH /chat/message`: Update a message.
- `DELETE /chat/message/:id`: Delete a message.
- `POST /chat/media`: Upload media for a chat message.

## 4. Dependencies

- **Internal Modules:**
  - `AuthModule`: For user authentication and getting user IDs.
  - `UserModule`: Potentially for fetching participant details.
  - `EventModule`: Required for event-chat integration.
  - `EventEmitterModule`: Used by `EventChatIntegrationService` to listen for events.
  - `JwtModule`: For validating WebSocket connection tokens.
  - `ConfigModule`: For configuration values.
  - `DatabaseModule`: (Implicitly via `@Global()`) Provides centralized TypeORM entity registration for shared entities like `Chat`, `Message`, `User`, `Event`, etc. **This module should NOT use `TypeOrmModule.forFeature()` for these entities.**
- **External Libraries:**
  - `TypeORM`: Database interaction.
  - `@nestjs/websockets`, `@nestjs/platform-socket.io`: For WebSocket implementation.
  - `MulterModule`: For media uploads.
- **External Services:**
  - None directly.

## 5. Testing

Tests for this module are located in `src/microservices/chat/tests/` (or `/test/`).

Run all tests for this module:
```bash
npm test -- --testPathPattern=src/microservices/chat
```

## 6. Environment Variables

- `UPLOAD_DIR`: Directory for chat media uploads (e.g., `uploads/chat`).
- `MAX_UPLOAD_SIZE`: Max file size for uploads (e.g., `5242880`).

## 7. Notes / Design Decisions

- **Real-time:** Core functionality relies on WebSockets (`ChatGateway`). REST endpoints supplement for management tasks.
- **Event Integration:** Event chats are managed automatically based on events from the `EventModule`.
- **Message Status:** Supports sent, delivered, and read status tracking via WebSockets. 