# Trending Plans Feature

## Overview

The Trending Plans feature allows users to discover popular events (plans) based on engagement metrics and recency. This feature uses a combination of analytics data and a time-decay algorithm to rank plans by their popularity and freshness.

## Architecture

The trending plans feature is implemented with a microservices architecture with the following components:

### Core Components

1. **PlanTrendingService**
   - Manages real-time and scheduled updates of trending scores
   - Provides caching mechanisms for performance optimization
   - Implements refresh logic to periodically update all plans' trending scores

2. **PlanAnalyticsService**
   - Tracks user interactions with plans (views, joins)
   - Calculates trending scores using a weighted formula
   - Emits events when interactions occur

3. **EventRepository**
   - Stores and retrieves plan data with trending scores
   - Provides methods for querying trending plans with filters

4. **EventService**
   - Coordinates between controllers, repositories, and other services
   - Implements business logic for trending plans

5. **EventController**
   - Exposes REST API endpoints for accessing trending plans
   - Handles query parameters and user context

### Data Flow

1. User interactions (views, joins) are tracked by `PlanAnalyticsService`
2. These interactions trigger events that invalidate cache entries
3. `PlanTrendingService` calculates new trending scores using the formula
4. Scores are stored in the database and cached for quick access
5. API endpoints query trending plans with optional filters (date range, location)

## Implementation Details

### Trending Score Calculation

The trending score for a plan is calculated using the following formula:

```typescript
calculateTrendingScore(
  joins: number,
  views: number,
  ageHours: number
): number {
  const recencyMultiplier = Math.exp(-0.05 * ageHours);
  const joinWeight = 3.0;
  const viewWeight = 1.5;
  
  return (
    (joins * joinWeight) +
    (views * viewWeight)
  ) * recencyMultiplier;
}
```

Key aspects of this algorithm:
- **Join weight (3.0)**: Joins have the highest impact on trending score
- **View weight (1.5)**: Views contribute but have less impact than joins
- **Recency multiplier**: Exponential decay based on hours since creation/update
- **Decay factor (-0.05)**: Controls how quickly scores decay over time

### API Endpoints

#### GET /events/trending

Returns a paginated list of trending plans with optional filters.

**Query Parameters:**
- `limit` (optional): Maximum number of results to return (default: 10)
- `offset` (optional): Number of results to skip (default: 0)
- `startDate` (optional): Filter plans starting on or after this date
- `endDate` (optional): Filter plans starting on or before this date
- `location` (optional): Filter plans by location (latitude, longitude, radius)
- `refreshScores` (optional): Force recalculation of all trending scores

**Response:**
```json
{
  "items": [
    {
      "id": "plan-id",
      "title": "Plan Title",
      "description": "Plan Description",
      "creatorId": "user-id",
      "startTime": "2023-01-01T20:00:00Z",
      "visibility": "public",
      "requireApproval": false,
      "createdAt": "2023-01-01T15:00:00Z",
      "updatedAt": "2023-01-01T15:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "hasMore": false
}
```

## Caching Strategy

The trending feature implements a multi-level caching strategy:

1. **Individual Plan Scores Cache**
   - Key: `plan_trending_score:{planId}`
   - TTL: 30 minutes
   - Invalidated when: plan is viewed, joined, or updated

2. **Global Trending Plans Cache**
   - Key: `trending_plans:{queryHash}`
   - TTL: 5 minutes
   - Invalidated when: trending scores are refreshed

## Scheduled Tasks

The trending feature includes scheduled tasks to ensure data freshness:

1. **Hourly Refresh**: Updates trending scores for all active plans
2. **Daily Cleanup**: Removes outdated analytics data and cache entries

## Testing

The trending feature includes comprehensive testing:

1. **Unit Tests**: For individual components (services, repositories)
2. **Integration Tests**: For API endpoints and data flow
3. **Performance Tests**: For caching and calculation efficiency

## Extension Points

The trending algorithm can be extended in several ways:

1. **Custom Weights**: Modify the weight factors in `PlanAnalyticsService.calculateTrendingScore()`
2. **Additional Signals**: Add new engagement metrics (shares, comments)
3. **Time Window Adjustment**: Modify the decay factor for faster/slower decay
4. **Scheduled Refreshes**: Adjust refresh frequency in `PlanTrendingService`

See the `EXTENSION_POINTS.md` file for more detailed examples of extending this feature. 