# Venue Microservice

This microservice manages venues, including venue metadata, events, photos, reviews, and trending features.

## Venue Trending Feature

The Venue Trending feature allows users to discover popular venues based on engagement metrics. Venues are ranked by a calculated trending score that considers:

- View counts (users viewing venue details)
- Follower counts (users following venues)
- Associated plan counts (events/plans linked to the venue)
- Venue age (recency factor)

### Implementation Components

#### Entity Structure
The `Venue` entity includes these trending-related fields:
- `viewCount`: Number of venue profile views
- `followerCount`: Number of users following the venue
- `associatedPlanCount`: Number of plans/events associated with the venue
- `trendingScore`: Calculated score used for trending ranking (indexed)

#### Tracking Mechanisms

1. **View Tracking**
   - Direct venue views increment `viewCount` via `VenueService.viewVenue()`
   - Plan views with venue association also increment venue `viewCount` via event listener

2. **Follow Tracking**
   - Follow/unfollow actions update `followerCount` via `VenueService.followVenue()/unfollowVenue()`
   - Uses the `Follow` entity to track user-venue relationships

3. **Plan Association Tracking**
   - Plans created with venue association increment `associatedPlanCount`
   - Handled via event listeners for `plan.associated_with_venue` and `plan.disassociated_from_venue`
   - Also captures `plan.join` and `plan.view` events to update trending scores

#### Algorithm

The trending score is calculated in `VenueAnalyticsService.calculateTrendingScore()` using:

```
trendingScore = [(planCount × planWeight) + 
                 (followerCount × followWeight) + 
                 (viewCount × viewWeight)] × 
                 exp(decayFactor × ageInHours)
```

Where:
- `planWeight = 5.0`: Highest weight (plans indicate strongest intent)
- `followWeight = 2.5`: Medium weight
- `viewWeight = 0.5`: Lowest weight
- `decayFactor = -0.05`: Controls time decay rate
- `ageInHours`: Age of venue in hours

This creates a score that:
- Prioritizes venues with more associated plans
- Factors in follower and view counts as secondary signals
- Promotes newer venues through time decay
- Prevents negative scores through clamping

#### Caching Strategy

1. **Individual Score Caching**
   - Each venue's trending score is cached for 30 minutes
   - Cache key: `venue_trending_score:{venueId}`
   - Invalidated on significant engagement updates

2. **Results Caching**
   - Paginated trending results cached for high-traffic endpoints
   - Cache key: `trending_venues:{params_hash}`
   - Invalidated on periodic score refresh

3. **Recently Viewed Venues**
   - User's recently viewed venues cached client-side
   - Helps track unique views vs. repeated visits

#### Scheduled Updates

The `VenueTrendingService.refreshAllTrendingScores()` method:
- Runs hourly via `@Cron(CronExpression.EVERY_HOUR)`
- Updates all venue trending scores in batches
- Processes venues in batches of 100 to prevent memory issues
- Invalidates cached trending results

### Event Listeners

The service implements the following event listeners:

1. `@OnEvent('plan.view')`
   - Triggered when a plan is viewed
   - Updates venue view count if plan is associated with a venue
   - Triggers trending score recalculation

2. `@OnEvent('plan.join')`
   - Triggered when a user joins a plan
   - Updates trending score for associated venue

3. `@OnEvent('plan.associated_with_venue')`
   - Triggered when a plan is linked to a venue
   - Increments the venue's `associatedPlanCount`
   - Updates trending score

4. `@OnEvent('plan.disassociated_from_venue')`
   - Triggered when a plan is unlinked from a venue
   - Decrements the venue's `associatedPlanCount`
   - Updates trending score

### API Endpoints

1. `GET /venues/trending`
   - Returns venues sorted by trending score
   - Supports pagination via query parameters
   - Uses the `TrendingVenuesRequestDto` for parameters
   - Returns data in `PaginatedVenueResponseDto` format

2. `POST /venues/:venueId/follow`
   - Allows a user to follow a venue
   - Updates follower count and trending score

3. `DELETE /venues/:venueId/follow`
   - Allows a user to unfollow a venue
   - Updates follower count and trending score

### Best Practices

1. **Error Handling**
   - Trending calculations are performed asynchronously to prevent API delays
   - Non-critical tracking failures are logged but don't block user operations
   - All count operations use atomic database transactions

2. **Performance Considerations**
   - Trending counts are stored directly on the Venue entity for fast retrieval
   - Score calculation uses efficient formulas to minimize CPU usage
   - Batch processing prevents memory issues during full recalculation

3. **Data Integrity**
   - Safety checks prevent negative counts (e.g., when decrementing follower count)
   - Ensures valid input data for score calculation
   - Uses proper database indexes for fast sorting by score

## Testing

The trending feature includes comprehensive tests:

1. **Unit Tests**
   - `venue-trending.service.spec.ts`: Tests score updates and batch processing
   - `venue-analytics.service.spec.ts`: Tests trending score calculation
   - `venue.service.spec.ts`: Tests event listener handlers

2. **Integration Tests**
   - Tests for trending endpoints with pagination
   - Validation of view/follow count updates

## Monitoring

Key metrics to monitor:
- Distribution of trending scores across venues
- Processing time for batch score updates
- Cache hit/miss rates for trending endpoints
- Event listener processing times 