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

## Implementation Guidance

When implementing these extensions:

1. Follow the existing architectural patterns
2. Maintain backward compatibility with existing APIs
3. Add appropriate unit and integration tests
4. Update documentation as features are implemented
5. Consider performance implications, especially for geospatial queries

These extension points provide a framework for the continued development of the Events module in Phase 2 of the NightBFF project. 