# NightBFF Events Module Extension Points

This document outlines the extension points for the Events module that will be implemented in Phase 2 of the NightBFF project. These extension points are designed to support the future features described in the PRD while maintaining the existing architecture.

## 1. Social Media Integration

The current Events implementation can be extended to support social media sharing through the following extension points:

### 1.1. Event Entity Extensions
```typescript
// Future extension to Event entity
@Column({ nullable: true })
socialShareImage?: string; // Optimized image for social sharing

@Column({ nullable: true })
socialShareText?: string; // Pre-formatted text for social sharing
```

### 1.2. Service Extensions
The EventService can be extended with methods for social sharing:

```typescript
// Add to EventService
async shareToSocialMedia(eventId: string, userId: string, platform: SocialPlatform): Promise<SocialShareResult> {
  // Implementation will connect to social media services
}
```

## 2. AI Night Planning Integration

The AI Night Planner premium feature can be integrated by extending the following components:

### 2.1. AI Planning Service
```typescript
// New service to be added
@Injectable()
export class EventAIService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly venueService: VenueService,
  ) {}

  async generateItinerary(options: AIItineraryOptions): Promise<AIItinerary> {
    // AI-based planning implementation
  }
  
  async recommendEvents(userId: string, preferences: UserPreferences): Promise<Event[]> {
    // AI-based event recommendations
  }
}
```

### 2.2. Controller Extensions
```typescript
// Add to EventController
@Post('ai/generate')
@UseGuards(JwtAuthGuard, PremiumGuard)
@ApiBearerAuth()
async generateAIItinerary(
  @Request() req: RequestWithUser,
  @Body() options: AIItineraryOptions,
): Promise<AIItinerary> {
  return this.eventAIService.generateItinerary(options);
}
```

## 3. Venue Integration Enhancements

### 3.1. Venue-specific Event Templates
```typescript
// New entity to be added
@Entity('event_templates')
export class EventTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  venueId: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  // Additional template fields
}
```

### 3.2. Venue Recommendation Engine
```typescript
// Add to VenueService
async getRecommendedVenuesForEvent(eventType: string, preferences: EventPreferences): Promise<Venue[]> {
  // Implementation for venue recommendations
}
```

## 4. Premium Features Integration

### 4.1. Premium Event Options
```typescript
// Extensions to CreateEventDto
export class PremiumEventOptions {
  @IsOptional()
  @IsUrl()
  externalBookingLink?: string;

  @IsOptional()
  @IsBoolean()
  featuredListing?: boolean;

  @IsOptional()
  @IsArray()
  sponsorIds?: string[];
}
```

### 4.2. Featured Events Filtering
```typescript
// Add to FindEventsOptions
featuredOnly?: boolean;
sponsoredOnly?: boolean;
```

## 5. Geo-Spatial Query Enhancements

### 5.1. Enhanced Location Filtering
```typescript
// Enhance location filtering in FindEventsOptions
location?: {
  latitude: number;
  longitude: number;
  radiusInKm: number;
  transportMode?: 'walking' | 'driving' | 'transit';
  maxTravelTime?: number; // in minutes
};
```

## 6. Event Scheduling Enhancements

### 6.1. Recurring Events Support
```typescript
// New entity for recurring events
@Entity('event_recurrence')
export class EventRecurrence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  eventId: string;

  @Column({
    type: 'enum',
    enum: RecurrenceType,
  })
  type: RecurrenceType; // DAILY, WEEKLY, MONTHLY

  @Column('json')
  pattern: RecurrencePattern;

  @Column({ type: 'timestamp with time zone', nullable: true })
  endsAt?: Date;
}
```

### 6.2. Service Extensions for Recurring Events
```typescript
// Add to EventService
async createRecurringEvent(
  userId: string, 
  createEventDto: CreateEventDto, 
  recurrenceOptions: RecurrenceOptions
): Promise<EventRecurrenceResult> {
  // Implementation for recurring events
}
```

## Trending Plans Feature

### Overview
The trending plans feature allows users to discover popular events based on engagement metrics. Plans are ranked based on a combination of:
- Number of attendees/joins (highest weight)
- Number of views (medium weight)
- Recency (time decay factor)

### Components
- **PlanAnalyticsService**: Tracks user interactions with plans and calculates trending scores
- **PlanTrendingService**: Manages real-time and scheduled updates of trending scores
- **EventRepository**: Enhanced with methods for querying trending plans and updating scores
- **EventService**: Integrates with analytics and trending services
- **EventController**: Provides endpoints for accessing trending plans

### Endpoints
- **GET /events/trending**: Returns a paginated list of trending plans
  - Query parameters: limit, offset, startDate, endDate, location
  - Response: PaginatedEventResponseDto

### Extending the Trending Algorithm
The trending algorithm can be extended in the following ways:

1. **Custom Weights**: Modify the weight factors in `PlanAnalyticsService.calculateTrendingScore()`
2. **Additional Signals**: Add new engagement metrics like shares or comments
3. **Time Window Adjustment**: Modify the decay factor (-0.05) for faster or slower decay
4. **Scheduled Refreshes**: Adjust the refresh frequency in `PlanTrendingService`

### Implementation Example
Adding a new signal (e.g., shares) to the trending algorithm:

```typescript
// In PlanAnalyticsService
trackPlanShare(planId: string, userId: string): void {
  this.eventEmitter.emit('plan.share', {
    planId, userId, timestamp: new Date()
  });
  this.cacheManager.del(`plan_trending_score:${planId}`);
}

// Update the calculation formula
calculateTrendingScore(
  joins: number,
  views: number,
  shares: number, // New parameter
  ageHours: number
): number {
  const recencyMultiplier = Math.exp(-0.05 * ageHours);
  const joinWeight = 3.0;
  const viewWeight = 1.5;
  const shareWeight = 2.5; // New weight
  
  return (
    (joins * joinWeight) +
    (views * viewWeight) +
    (shares * shareWeight)
  ) * recencyMultiplier;
}
```

## Implementation Guidance

When implementing these extensions:

1. Follow the existing architectural patterns
2. Maintain backward compatibility with existing APIs
3. Add appropriate unit and integration tests
4. Update documentation as features are implemented
5. Consider performance implications, especially for geospatial queries

These extension points provide a framework for the continued development of the Events module in Phase 2 of the NightBFF project. 