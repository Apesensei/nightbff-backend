# Notification Module

## 1. Purpose

Handles the generation and delivery of notifications (e.g., push notifications, in-app messages) to users based on application events.

## 2. Key Components

<!-- TODO: Populate with actual components -->
- **Entities:**
  - `Notification.entity.ts`: Represents a notification record.
- **Services:**
  - `NotificationService.ts`: Logic for creating and sending notifications.
- **Repositories:**
  - `NotificationRepository.ts`: Database interaction for notifications.
- **DTOs:**
  - `dto/...`: Data transfer objects for notifications.

## 3. API Endpoints (If Applicable)

<!-- TODO: Add endpoints if any are directly exposed -->
- None directly exposed (likely triggered by internal events).

## 4. Dependencies

- **Internal Modules:**
  - `AuthModule`: To get user information for targeting.
  - `EventEmitterModule`: Listens for events that trigger notifications.
- **External Libraries:**
  - `TypeORM`: For database interaction.
  - Potentially a push notification library (e.g., Firebase Admin SDK).
- **External Services:**
  - Push Notification Service (e.g., APNS, FCM).

## 5. Testing

Tests for this module are located in `src/microservices/notification/tests/`.

Run all tests for this module:
```bash
npm test -- --testPathPattern=src/microservices/notification
```

## 6. Environment Variables

<!-- TODO: Add specific env vars -->
- `PUSH_NOTIFICATION_SERVICE_KEY`: API key for the push service.

## 7. Notes / Design Decisions

- This module primarily acts as a listener for events emitted by other modules. 