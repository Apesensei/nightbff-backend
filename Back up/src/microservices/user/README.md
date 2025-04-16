# User Module

## 1. Purpose

Manages user profiles, social relationships (connections, following, blocking), profile interactions (views), and user discovery features within the NightBFF application. It complements the `AuthModule` which handles the core `User` entity and authentication.

## 2. Key Components

- **Entities:**
  - `UserProfile.entity.ts`: Stores extended profile data (country, birthDate, gender, etc.) linked one-to-one with the `auth/User` entity.
  - `UserRelationship.entity.ts`: Tracks relationships between users (pending, accepted, blocked).
  - `Follow.entity.ts`: Represents a non-mutual follow relationship.
  - `ProfileView.entity.ts`: Records profile view events.
  - `UserPreference.entity.ts`: Stores user-specific settings or preferences.
  - `Profile.entity.ts`: (Potentially related to profile completion/sections - needs verification).
- **Services:**
  - `UserService.ts`: Core logic for user profile management.
  - `UserDiscoveryService.ts`: Handles finding nearby users, recommendations, and profile viewers.
  - `UserRelationshipService.ts`: Manages connection requests, blocking, and following.
  - `ProfileViewService.ts`: Logic for tracking and notifying about profile views.
  - `FollowService.ts`: Manages follow/unfollow operations.
- **Repositories:**
  - `UserRepository.ts`: Provides access methods combining `auth/User` and `UserProfile` data. Includes geospatial queries.
  - `UserRelationshipRepository.ts`: CRUD for `UserRelationship` entities.
  - `ProfileViewRepository.ts`: CRUD for `ProfileView` entities.
  - `FollowRepository.ts`: CRUD for `Follow` entities.
  - `UserProfileRepository.ts`: Direct CRUD for `UserProfile` entities.
  - `ProfileRepository.ts`: CRUD for `Profile` entities.
- **Controllers:**
  - `UserController.ts`: Endpoints for managing the current user's profile.
  - `UserDiscoveryController.ts`: Endpoints related to finding other users (`/nearby`, `/recommended`, `/profile-viewers`).
  - `UserRelationshipController.ts`: Endpoints for managing connections (`/connections`, `/connections/block`).
- **DTOs:**
  - `dto/`: Various DTOs for API requests and responses related to profiles, discovery, and relationships.

## 3. API Endpoints

- `GET /users/me`: Get the current user's profile.
- `PATCH /users/me`: Update the current user's profile.
- `GET /users/discovery/nearby`: Find nearby users.
- `GET /users/discovery/recommended`: Get recommended users.
- `GET /users/discovery/profile-viewers`: Get users who viewed the current user's profile.
- `POST /users/connections`: Send a connection request.
- `GET /users/connections`: Get accepted connections.
- `GET /users/connections/pending`: Get pending requests.
- `PATCH /users/connections/:id`: Accept/decline a request.
- `POST /users/connections/block`: Block a user.
- `DELETE /users/connections/block/:userId`: Unblock a user.
- `GET /users/connections/blocked`: Get blocked users.
- `POST /users/:userId/follow`: Follow a user.
- `DELETE /users/:userId/follow`: Unfollow a user.

## 4. Dependencies

- **Internal Modules:**
  - `AuthModule`: Required for accessing the canonical `User` entity and authentication context.
  - `EventEmitterModule`: For emitting events (e.g., profile updated).
  - `MulterModule`: For handling file uploads (profile pictures).
- **External Libraries:**
  - `TypeORM`: For database interaction.
- **External Services:**
  - None directly (relies on `AuthModule` for Supabase interaction).

## 5. Testing

Tests for this module are located in `src/microservices/user/tests/`.

Run all tests for this module:
```bash
npm test -- --testPathPattern=src/microservices/user
```

Run specific test types:
```bash
npm test -- --testPathPattern=src/microservices/user/tests/[controllers|services|repositories]
```

## 6. Environment Variables

- None specific to this module (inherits `DATABASE_URL`, etc.).

## 7. Notes / Design Decisions

- This module heavily relies on the `User` entity provided by the `AuthModule`.
- The `UserRepository` acts as an abstraction layer to simplify accessing combined `User` and `UserProfile` data.
- See `app/docs/modules/user/extension-points.md` for planned Phase 2 enhancements. 