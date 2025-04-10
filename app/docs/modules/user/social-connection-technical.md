# Social Connection System - Technical Reference

This document provides technical details about the Social Connection System implementation.

## Database Schema

### UserRelationship Entity

```typescript
export enum RelationshipType {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  FOLLOWING = 'following',
  BLOCKED = 'blocked'
}

@Entity('user_relationships')
@Index(['requesterId', 'recipientId'], { unique: true })
export class UserRelationship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'requester_id' })
  requesterId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requester_id' })
  requester: User;

  @Column({ name: 'recipient_id' })
  recipientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column({
    type: 'enum',
    enum: RelationshipType,
    default: RelationshipType.PENDING
  })
  type: RelationshipType;

  @Column({ nullable: true })
  message?: string;

  @Column({ name: 'is_reported', default: false })
  isReported: boolean;

  @Column({ name: 'report_reason', nullable: true })
  reportReason?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### ProfileView Entity

```typescript
@Entity('profile_views')
export class ProfileView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'viewer_id' })
  viewerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'viewer_id' })
  viewer: User;

  @Column({ name: 'viewed_id' })
  viewedId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'viewed_id' })
  viewed: User;

  @Column({ default: true })
  anonymous: boolean;

  @Column({ name: 'is_notified', default: false })
  isNotified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

## Repository Implementation Details

### UserRepository Geospatial Methods

The `UserRepository` implements geospatial queries using PostgreSQL's `ST_Distance_Sphere` function:

```typescript
async findNearbyUsers(params: NearbyUsersParams, currentUserId: string): Promise<[UserWithDistance[], number]> {
  // Calculate distance using PostgreSQL's ST_Distance_Sphere
  const queryBuilder = this.userRepository.createQueryBuilder('user')
    .select('user.*')
    .addSelect(`ST_Distance_Sphere(
      ST_MakePoint(user.location_longitude, user.location_latitude),
      ST_MakePoint(:longitude, :latitude)
    ) as distance`, 'distance')
    .where('user.id NOT IN (:...excludedIds)', { excludedIds })
    .andWhere('user.location_latitude IS NOT NULL')
    .andWhere('user.location_longitude IS NOT NULL')
    .andWhere(`ST_Distance_Sphere(
      ST_MakePoint(user.location_longitude, user.location_latitude),
      ST_MakePoint(:longitude, :latitude)
    ) <= :radius`, {
      latitude,
      longitude,
      radius: radiusInKm * 1000 // Convert km to meters
    })
    .orderBy('distance', 'ASC')
    .limit(limit)
    .offset(offset);

  // ... result processing
}
```

### ProfileViewRepository Tracking Methods

The `ProfileViewRepository` includes methods to prevent duplicate notifications and track view patterns:

```typescript
async hasUserViewedProfileWithinTimeframe(
  viewerId: string,
  viewedId: string,
  hours = 24
): Promise<boolean> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  const count = await this.repository.count({
    where: {
      viewerId,
      viewedId,
      createdAt: MoreThanOrEqual(cutoffDate)
    }
  });

  return count > 0;
}
```

## Service Layer Implementation

### UserDiscoveryService

The `UserDiscoveryService` coordinates repository calls with business logic:

```typescript
async findNearbyUsers(
  userId: string,
  latitude: number,
  longitude: number,
  options?: {
    radiusInKm?: number;
    limit?: number;
    offset?: number;
    activeOnly?: boolean;
    activeWithinMinutes?: number;
  },
): Promise<{ users: UserWithDistance[]; total: number }> {
  // Input validation
  if (isNaN(latitude) || isNaN(longitude)) {
    throw new BadRequestException('Invalid coordinates provided');
  }

  // Get blocked relationships
  const [blockedBy] = await this.userRelationshipRepository.findUserRelationships(
    userId,
    RelationshipType.BLOCKED
  );

  // ... process blocking logic

  // Call appropriate repository method
  let users: UserWithDistance[];
  let total: number;

  if (activeOnly) {
    [users, total] = await this.userRepository.findActiveNearbyUsers(
      params,
      userId,
      activeWithinMinutes,
    );
  } else {
    [users, total] = await this.userRepository.findNearbyUsers(params, userId);
  }

  return { users, total };
}
```

## API Response Formats

### Nearby Users Response

```json
{
  "users": [
    {
      "id": "user-123",
      "email": "user123@example.com",
      "username": "nightlifer123",
      "displayName": "Party Person",
      "photoURL": "https://example.com/photos/user123.jpg",
      "bio": "Love to dance all night!",
      "interests": ["dancing", "clubs", "cocktails"],
      "locationLatitude": 40.7128,
      "locationLongitude": -74.0060,
      "lastActive": "2023-03-26T15:45:00Z",
      "distance": 0.5
    },
    // More users...
  ],
  "total": 42
}
```

### Profile Viewers Response

```json
{
  "users": [
    {
      "id": "user-456",
      "username": "nightowl",
      "displayName": "Night Owl",
      "photoURL": "https://example.com/photos/user456.jpg",
      "viewedAt": "2023-03-25T22:15:00Z",
      "distance": 1.2
    },
    // More viewers...
  ],
  "total": 15
}
```

## Performance Considerations

### Query Optimization

- The geospatial queries are optimized with proper indexing on location columns
- Queries exclude users with NULL location data early to improve performance
- Batch processing is used for relationship filtering to handle large user counts

### Pagination

- All endpoints use limit/offset pagination with reasonable defaults (20 items per page)
- Future optimization will implement cursor-based pagination for better performance with large datasets

### Caching Opportunities

- Nearby user queries can be cached for short durations (1-2 minutes)
- Relationship data can be cached for longer periods with cache invalidation on relationship changes
- View counts can be cached with periodic database synchronization

## Database Indexes

```sql
-- Required indexes for optimal query performance
CREATE INDEX idx_user_location ON users(location_latitude, location_longitude) 
  WHERE location_latitude IS NOT NULL AND location_longitude IS NOT NULL;

CREATE INDEX idx_user_relationships_requester ON user_relationships(requester_id, type);
CREATE INDEX idx_user_relationships_recipient ON user_relationships(recipient_id, type);

CREATE INDEX idx_profile_views_viewed ON profile_views(viewed_id, created_at);
CREATE INDEX idx_profile_views_viewer ON profile_views(viewer_id, created_at);
```

## Security Considerations

### Privacy Protection

- All location-based queries filter out blocked users
- User IDs are never exposed in query parameters, only in JWT-authenticated requests
- Profile view anonymity is preserved for non-premium users

### Authorization

- All endpoints require valid JWT authentication
- Controller methods use the CurrentUser decorator to get the authenticated user
- Service methods verify the requester has appropriate access to the requested data

## Testing Strategy

See the tests directory for complete test coverage, including:

- Unit tests for repository methods
- Integration tests for service layer logic
- End-to-end tests for API endpoints

## Monitoring Recommendations

Key metrics to monitor:

- Average query time for nearby users
- Cache hit/miss rates
- Profile view counts by time period
- Relationship creation/deletion rates
- Error rates by endpoint

## Known Limitations

- The current implementation doesn't support real-time updates (will be added in Phase 2)
- Large datasets may experience performance degradation with offset-based pagination
- The geospatial queries require PostgreSQL with PostGIS extensions 