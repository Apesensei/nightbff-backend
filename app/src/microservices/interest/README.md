# Interest Module

## Overview

The Interest module manages user and event interests in the NightBFF application. This module provides comprehensive functionality for:

- Storing and managing predefined interests
- Associating interests with users and events
- Tracking interest popularity and trends
- Providing recommendations based on user preferences
- Supporting both emoji and image representation of interests

## Architecture

The Interest module follows a layered architecture pattern:

1. **Controllers**: Handle HTTP requests and responses
2. **Services**: Contain business logic and orchestrate operations
3. **Repositories**: Manage data access and persistence
4. **Entities**: Define the data model
5. **DTOs**: Validate input and format output data

## Key Components

### Entities

- **Interest**: The core entity representing an interest
- **UserInterest**: Join entity for the many-to-many relationship between users and interests
- **EventInterest**: Join entity for the many-to-many relationship between events and interests

### Services

- **InterestService**: Main service for CRUD operations and business logic
- **InterestDisplayService**: Context-aware display of interests
- **InterestAnalyticsService**: Track and analyze interest usage
- **InterestMigrationService**: Migrate from string-based to entity-based interests

### Controllers

- **InterestController**: Public API for interest-related operations
- **InterestAdminController**: Admin-only operations for managing interests

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