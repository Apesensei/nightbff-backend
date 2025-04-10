# Chat Service

This module handles messaging functionality for the NightBFF application, including direct messages, group chats, and event chat rooms.

## Key Components

- `ChatService`: Manages chat rooms and participants
- `MessageService`: Handles the creation and management of messages
- `ChatGateway`: WebSocket gateway for real-time messaging
- `EventChatIntegrationService`: Automatically manages chat rooms for events

## Features

### Chat Types

- **Direct Chats**: One-on-one conversations between users
- **Group Chats**: Conversations between multiple users
- **Event Chats**: Automatically created for events where event attendees can chat

### Real-time Messaging

The chat system uses WebSockets for real-time messaging, providing:

- Instant message delivery
- Read receipts
- Typing indicators
- Online status tracking

### Event-Chat Integration

The system automatically creates and manages chat rooms for events:

- When an event is created, a chat room is automatically created
- When users join an event, they are automatically added to the event's chat room
- When users leave an event, they are automatically removed from the chat room
- When an event is updated (e.g., title changed), the chat room is updated accordingly
- When an event is deleted, the chat room is deactivated but chat history is preserved

## API Endpoints

### Chat Management

- `POST /chat`: Create a new chat
- `GET /chat`: Get all chats for the current user
- `GET /chat/:id`: Get a specific chat by ID
- `DELETE /chat/:id`: Delete/deactivate a chat

### Message Management

- `POST /chat/message`: Send a message to a chat
- `PATCH /chat/message`: Update a message
- `DELETE /chat/message/:id`: Delete a message
- `PATCH /chat/message/status`: Update message status (read/delivered)

### Chat Participants

- `POST /chat/:id/participants`: Add participants to a chat
- `DELETE /chat/:id/participants/:userId`: Remove a participant from a chat

## WebSocket Events

### Server to Client

- `message:new`: New message received
- `message:updated`: Message was updated
- `message:deleted`: Message was deleted
- `message:status`: Message status updated
- `chat:new`: New chat created
- `chat:participants`: Participants added/removed from chat
- `chat:typing`: User is typing
- `chat:joined`: Current user was added to a chat
- `chat:left`: Current user was removed from a chat

### Client to Server

- `message:send`: Send a new message
- `message:update`: Update a message
- `message:delete`: Delete a message
- `message:status`: Update message status
- `typing:start`: User started typing
- `typing:stop`: User stopped typing

## Event Listeners

The `EventChatIntegrationService` listens for the following events:

- `event.created`: Create a new chat room for the event
- `event.updated`: Update the chat room title/metadata
- `event.deleted`: Mark the chat room as inactive
- `event.joined`: Add user to the event chat room
- `event.left`: Remove user from the event chat room

## Architecture

The Chat Service follows the NestJS microservice architecture pattern with the following components:

1. **Entities**: 
   - `Chat`: Represents a chat room (direct, group, or event)
   - `Message`: Represents messages in a chat

2. **DTOs**:
   - Request DTOs: Validation and transformation of incoming data
   - Response DTOs: Properly formatted API responses

3. **Services**:
   - `ChatService`: Business logic for chat operations
   - `MessageService`: Business logic for message operations
   - `MediaUploadService`: Handling image uploads

4. **Controllers**:
   - `ChatController`: REST endpoints for chat management
   - `MessageController`: REST endpoints for messaging
   - `ChatParticipantsController`: REST endpoints for managing chat participants
   - `MediaUploadController`: REST endpoints for media uploads

5. **Gateway**:
   - `ChatGateway`: WebSocket gateway for real-time communication

## Integration Points

- **User Service**: User lookup and validation
- **Event Service**: Event chat creation and participant synchronization
- **Notification Service**: Push notifications for new messages

## Database Schema

### Chat Table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| type | enum | Chat type (DIRECT, GROUP, EVENT) |
| title | string | Chat title (optional) |
| imageUrl | string | Chat image URL (optional) |
| creatorId | uuid | User who created the chat |
| eventId | uuid | Associated event ID (optional) |
| isActive | boolean | Whether the chat is active |
| createdAt | timestamp | Creation time |
| updatedAt | timestamp | Last update time |
| lastActivityAt | timestamp | Last activity time |

### Message Table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| chatId | uuid | Chat ID |
| senderId | uuid | Sender user ID |
| type | enum | Message type (TEXT, IMAGE, LOCATION) |
| content | string | Text content |
| mediaUrl | string | Media URL |
| locationLatitude | float | Location latitude |
| locationLongitude | float | Location longitude |
| status | enum | Message status (SENT, DELIVERED, READ) |
| isEdited | boolean | Whether the message has been edited |
| createdAt | timestamp | Creation time |
| updatedAt | timestamp | Last update time |
| deletedAt | timestamp | Soft delete time |

## Setup Instructions

1. Install dependencies:
```
npm install
```

2. Configure environment variables:
```
# Chat service configuration
UPLOAD_DIR=uploads/chat
MAX_UPLOAD_SIZE=5242880  # 5MB
API_URL=http://localhost:3000
```

3. Run migrations:
```
npm run migration:run
```

4. Start the service:
```
npm run start:dev
```

## Testing

Run unit tests:
```
npm run test
```

Run integration tests:
```
npm run test:e2e
``` 