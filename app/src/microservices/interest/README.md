# Interest Module

## 1. Purpose

Manages user and event interests, including predefined interest definitions, user-interest associations, event-interest associations, interest discovery (popular, trending), and recommendations.

## 2. Key Components

- **Entities:**
  - `Interest.entity.ts`: Core entity representing an interest (name, icon/image, description, usage count, active status).
  - `UserInterest.entity.ts`: Join table mapping Users (from AuthModule) to Interests.
  - `EventInterest.entity.ts`: Join table mapping Events (from EventModule) to Interests.
- **Services:**
  - `InterestService.ts`: Core CRUD for interests, managing user/event associations.
  - `InterestDisplayService.ts`: Handles context-aware display logic for interests.
  - `InterestAnalyticsService.ts`: Tracks interest usage and calculates trends.
  - `InterestMigrationService.ts`: Supports migrating legacy string-based interests.
- **Repositories:**
  - `InterestRepository.ts`: CRUD for `Interest` entities.
  - `UserInterestRepository.ts`: Manages user-interest links.
  - `EventInterestRepository.ts`: Manages event-interest links.
- **Controllers:**
  - `InterestController.ts`: Public API endpoints for retrieving interests, managing user interests, and getting recommendations.
  - `InterestAdminController.ts`: Admin-only endpoints for managing the master list of interests (CRUD, sorting, migration).
- **DTOs:**
  - `dto/`: DTOs for API requests/responses (e.g., `CreateInterestDto`, `UserInterestsDto`, `PaginatedInterestResponseDto`).

## 3. API Endpoints

(See detailed API documentation below or in separate API spec file)

- **Public:**
  - `GET /interests`: Get all/search interests (paginated).
  - `GET /interests/:id`: Get specific interest by ID.
  - `GET /interests/popular`: Get popular interests.
  - `GET /interests/trending`: Get trending interests.
  - `GET /interests/user/me`: Get current user's interests.
  - `PUT /interests/user/me`: Update current user's interests.
  - `GET /interests/recommendations`: Get recommended interests for the current user.
- **Admin:**
  - `GET /admin/interests`: Get all interests (admin view, includes inactive).
  - `POST /admin/interests`: Create a new interest.
  - `PUT /admin/interests/:id`: Update an existing interest.
  - `DELETE /admin/interests/:id`: Delete an interest.
  - `PUT /admin/interests/sort-order`: Update the display sort order.
  - `GET /admin/interests/analytics`: Get usage statistics.
  - `POST /admin/interests/migrate`: Run the interest migration process.

## 4. Dependencies

- **Internal Modules:**
  - `AuthModule`: To link interests to users.
  - `EventModule`: To link interests to events.
  - `CacheModule`: For caching frequently accessed interest data.
- **External Libraries:**
  - `TypeORM`: Database interaction.
- **External Services:**
  - None.

## 5. Testing

Tests for this module are located in `src/microservices/interest/tests/`.

Run all tests for this module:
```bash
npm test -- --testPathPattern=src/microservices/interest
```

## 6. Environment Variables

- `INTEREST_CACHE_TTL`: TTL for interest caches (default: 3600s).
- `INTEREST_MAX_USER_INTERESTS`: Max interests per user (default: 20).
- `INTEREST_MAX_EVENT_INTERESTS`: Max interests per event (default: 5).

## 7. Notes / Design Decisions

- **Emoji vs. Image:** Supports both emojis and image URLs for interest representation via the `isIconEmoji` flag.
- **Context-Aware Display:** `InterestDisplayService` allows tailoring interest presentation based on where it's shown (profile, post, etc.).
- **Caching:** Implements caching for performance on frequently accessed endpoints.
- **Migration:** Includes a service (`InterestMigrationService`) and admin endpoint (`POST /admin/interests/migrate`) to handle potential migration from older data formats.
- **Detailed API Docs:** Were previously in `documentation.md` (now deleted); consider moving this detail to Swagger/OpenAPI specs or a dedicated API documentation tool.

## Architecture

The Interest module follows a layered architecture pattern:

1. **Controllers**: Handle HTTP requests and responses
2. **Services**: Contain business logic and orchestrate operations
3. **Repositories**: Manage data access and persistence
4. **Entities**: Define the data model
5. **DTOs**: Validate input and format output data

## Implementation Details

### Interest Entity

```typescript
@Entity('interests')
export class Interest {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  name: string;
  
  @Column()
  icon: string; // Emoji string or asset path
  
  @Column({ nullable: true })
  description?: string;
  
  @Column({ default: true })
  isIconEmoji: boolean; // Flag to differentiate between emoji and image asset
  
  @Column({ nullable: true })
  imageUrl?: string; // For interests that use image assets instead of emojis
  
  @Column({ default: 0 })
  usageCount: number;
  
  @Column({ default: true })
  isActive: boolean;
  
  @Column({ default: 0 })
  sortOrder: number; // For admin-controlled ordering
  
  @CreateDateColumn()
  createdAt: Date;
  
  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Context-Aware Display

The module supports different display contexts for interests:

```typescript
enum InterestDisplayContext {
  PROFILE = 'PROFILE',
  POST = 'POST',
  PLAN = 'PLAN',
  EXPLORE = 'EXPLORE',
  SELECTION = 'SELECTION'
}
```

Each context has specific display properties:

```typescript
interface InterestDisplayProps {
  name: string;
  useEmoji: boolean;
  displayIcon: string;
  size: 'small' | 'medium' | 'large';
}
```

### Caching Strategy

The Interest module implements a comprehensive caching strategy:

- Cache frequently accessed data (all interests, trending interests, etc.)
- Use appropriate TTL values based on how frequently the data changes
- Clear specific caches when related data is modified
- Use cache prefixes to organize and manage cache entries

### Migration Support

The module includes a robust migration service for transitioning from string-based interests to entity-based interests:

- String normalization for consistent matching
- Mapping table for non-obvious matches
- Transaction support for data integrity
- Dry-run mode for testing
- Detailed logging for debugging

## API Documentation

Detailed API documentation is available in the [documentation.md](./documentation.md) file.

## Usage Examples

### Backend Integration

To integrate with this module from other parts of the backend:

```typescript
// Get the InterestService in your module
constructor(
  private readonly interestService: InterestService
) {}

// Get interests for a user
async getUserInterests(userId: string): Promise<Interest[]> {
  return this.interestService.getUserInterests(userId);
}

// Update interests for an event
async updateEventInterests(eventId: string, interestIds: string[]): Promise<void> {
  return this.interestService.updateEventInterests(eventId, interestIds);
}
```

### Frontend Integration

The module provides a comprehensive API for frontend integration. See the [documentation.md](./documentation.md) file for detailed frontend integration guidelines.

## Configuration

The Interest module can be configured through environment variables:

- `INTEREST_CACHE_TTL`: TTL for interest caches in seconds (default: 3600)
- `INTEREST_MAX_USER_INTERESTS`: Maximum number of interests a user can have (default: 20)
- `INTEREST_MAX_EVENT_INTERESTS`: Maximum number of interests an event can have (default: 5)

## Testing

The module includes comprehensive unit and integration tests:

- Repository tests for data access operations
- Service tests for business logic
- Controller tests for API endpoints
- E2E tests for full integration testing

## Future Enhancements

Planned enhancements for future versions:

1. **Interest Categories**: Group interests into categories for better organization
2. **Interest Network Analysis**: Advanced analytics to discover relationships between interests
3. **Interest Recommendation ML**: Machine learning-based interest recommendations
4. **Interest Localization**: Support for interest names and descriptions in multiple languages
5. **Interest Taxonomy**: Hierarchical organization of interests (parent-child relationships)

## Contributing

To contribute to this module:

1. Follow the existing architectural patterns
2. Write comprehensive tests for new functionality
3. Update documentation as needed
4. Follow the project's coding standards and guidelines 