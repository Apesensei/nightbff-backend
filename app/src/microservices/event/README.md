# Event Module

## 1. Purpose

Manages event (also referred to as "plans") creation, discovery, attendance, and associated features like event-specific chat rooms and trending events.

## 2. Key Components

- **Entities:**
  - `Event.entity.ts`: Core entity representing an event/plan, including details, time, location, visibility, creator, and trending metrics.
  - `EventAttendee.entity.ts`: Join table tracking users attending events.
  - `EventInterest.entity.ts`: (Likely defined in Interest module) Links events to interests.
  - `VenueEvent.entity.ts`: (Likely defined in Venue module) Links events to venues.
- **Services:**
  - `EventService.ts`: Core logic for event CRUD, managing attendees, visibility, and interactions.
  - `EventSearchService.ts`: Handles searching and filtering events.
  - `EventTrendingService.ts` / `PlanTrendingService.ts`: Manages calculation and caching of trending event scores.
  - `EventAnalyticsService.ts` / `PlanAnalyticsService.ts`: Tracks user interactions (views, joins) for trending calculations.
- **Repositories:**
  - `EventRepository.ts`: CRUD for `Event` entities, including methods for querying trending events.
  - `EventAttendeeRepository.ts`: Manages event attendance records.
- **Controllers:**
  - `EventController.ts`: Exposes REST API endpoints for event management, discovery, attendance, and trending.
- **DTOs:**
  - `dto/`: DTOs for API requests/responses (event creation, search filters, trending results).
- **Enums:**
  - `enums/`: Defines enumerations like `EventVisibility`, `EventStatus`.

## 3. API Endpoints

- `POST /events`: Create a new event.
- `GET /events`: Search/list events (supports filtering by date, location, interests, etc.).
- `GET /events/trending`: Get events sorted by trending score.
- `GET /events/:eventId`: Get details for a specific event.
- `PATCH /events/:eventId`: Update an event.
- `DELETE /events/:eventId`: Cancel/delete an event.
- `POST /events/:eventId/join`: Join an event.
- `DELETE /events/:eventId/leave`: Leave an event.
- `GET /events/:eventId/attendees`: List attendees for an event.

## 4. Dependencies

- **Internal Modules:**
  - `AuthModule`: For user authentication and identifying event creators/attendees.
  - `UserModule`: For accessing user details.
  - `VenueModule`: For linking events to venues.
  - `InterestModule`: For linking events to interests.
  - `ChatModule`: For creating/managing event-specific chat rooms.
  - `EventEmitterModule`: For emitting events (`event.created`, `event.joined`, etc.) used by Chat and potentially other modules.
- **External Libraries:**
  - `TypeORM`: Database interaction.
  - `nestjs/schedule`: For potential scheduled tasks related to events or trending.
- **External Services:**
  - Potentially mapping services if location features are advanced.

## 5. Testing

Tests for this module are located in `src/microservices/event/tests/`.

Run all tests for this module:
```bash
npm test -- --testPathPattern=src/microservices/event
```

## 6. Environment Variables

- None specific identified (inherits `DATABASE_URL`, etc.).

## 7. Notes / Design Decisions

- **Trending Plans:** Similar to venue trending, uses joins, views, and recency with exponential decay. Scores are cached and refreshed periodically. See `README-trending.md` (now deleted, info incorporated here) for previous details.
- **Event-Chat Integration:** Events automatically trigger chat room creation/management via events listened to by the `ChatModule`.
- **String Relations:** Acknowledged tech debt (TD-2) regarding string references instead of TypeORM relations in some entity definitions; planned for refactoring.
- **Error Handling:** Acknowledged tech debt (TD-3) regarding missing comprehensive error handling for attendance operations.
- **Extension Points:** See `EXTENSION_POINTS.md` for planned Phase 2 enhancements. 