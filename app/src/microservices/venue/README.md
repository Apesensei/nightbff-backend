# Venue Module

## 1. Purpose

Manages venue data, including discovery (search, nearby), details, photos, reviews, events associated with venues, and a venue trending feature based on user engagement.

## 2. Key Components

- **Entities:**
  - `Venue.entity.ts`: Core entity representing a physical venue, including metadata, location, and trending metrics (`viewCount`, `followerCount`, `associatedPlanCount`, `trendingScore`).
  - `VenuePhoto.entity.ts`: Stores photos associated with a venue.
  - `VenueReview.entity.ts`: Stores user reviews and ratings for a venue.
  - `VenueEvent.entity.ts`: Links venues to events (likely from the Event module).
  - `Follow.entity.ts`: (Likely shared or adapted from User module) Tracks users following venues.
- **Services:**
  - `VenueService.ts`: Core CRUD operations, view/follow tracking, association with events.
  - `VenueSearchService.ts`: Handles text-based search and nearby venue discovery using geospatial queries.
  - `VenueTrendingService.ts`: Manages the calculation and refreshing of venue trending scores (runs hourly).
  - `VenueAnalyticsService.ts`: Contains the logic/algorithm for calculating the trending score.
- **Repositories:**
  - `VenueRepository.ts`: CRUD for `Venue` entities, including methods for geospatial queries and updating trending counts.
  - `VenuePhotoRepository.ts`: CRUD for `VenuePhoto`.
  - `VenueReviewRepository.ts`: CRUD for `VenueReview`.
  - `FollowRepository.ts`: (Likely shared) Manages follow relationships.
- **Controllers:**
  - `VenueController.ts`: Exposes endpoints for venue CRUD, details, photos, reviews, following.
  - `VenueDiscoveryController.ts`: Exposes endpoints for searching and finding nearby venues.
  - `VenueTrendingController.ts`: Exposes endpoint for getting trending venues.
- **DTOs:**
  - `dto/`: Various DTOs for API requests/responses (venue creation, search parameters, trending results).

## 3. API Endpoints

- `POST /venues`: Create a new venue.
- `GET /venues`: Search/list venues (supports text search, filtering).
- `GET /venues/nearby`: Find venues near given coordinates.
- `GET /venues/trending`: Get venues sorted by trending score.
- `GET /venues/:venueId`: Get details for a specific venue.
- `PATCH /venues/:venueId`: Update a venue.
- `DELETE /venues/:venueId`: Delete a venue.
- `POST /venues/:venueId/photos`: Upload photos for a venue.
- `POST /venues/:venueId/reviews`: Add a review for a venue.
- `POST /venues/:venueId/follow`: Follow a venue.
- `DELETE /venues/:venueId/follow`: Unfollow a venue.

## 4. Dependencies

- **Internal Modules:**
  - `AuthModule`: For user authentication context (e.g., who is following/reviewing).
  - `EventModule`: For linking venues to events.
  - `UserModule`: Potentially for accessing user details related to follows/reviews.
  - `EventEmitterModule`: For listening to events (e.g., `plan.view`, `plan.join`) that affect trending scores.
- **External Libraries:**
  - `TypeORM`: Database interaction.
  - `nestjs/schedule`: For the hourly trending score refresh (`@Cron`).
  - `MulterModule`: For photo uploads.
- **External Services:**
  - Potentially Google Maps/Foursquare API for venue data enrichment or validation.

## 5. Testing

Tests for this module are located in `src/microservices/venue/tests/`.

Run all tests for this module:
```bash
npm test -- --testPathPattern=src/microservices/venue
```

Run specific test types (e.g., trending feature):
```bash
npm test -- --testPathPattern=src/microservices/venue/tests/services/venue-trending.service.spec.ts
```

## 6. Environment Variables

- `GOOGLE_MAPS_API_KEY` / `FOURSQUARE_API_KEY`: Potentially used for venue data.

## 7. Notes / Design Decisions

- **Trending Feature:** The trending logic is detailed within the code and was previously documented extensively. Key aspects include weighted scoring based on plan associations, follows, and views, with time decay. Scores are refreshed hourly via a cron job.
- **Permissions:** Currently has Phase 1 permissions (any authenticated user). Phase 3 requires restricting actions to VENUE_OWNER/ADMIN (See `app/docs/project/tech-debt.md#TD-1`).
- **Geospatial Queries:** Uses PostgreSQL's `ST_Distance_Sphere` for nearby searches. 