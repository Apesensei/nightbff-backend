# Social Connection System - Extension Points

This document outlines the extension points designed into the Social Connection System for Phase 2 development.

## 1. Enhanced Privacy Controls

The current implementation includes basic privacy controls based on relationship status. Phase 2 will extend this with:

### 1.1 Granular Visibility Settings

```typescript
// Planned extension in User entity
export interface EnhancedPrivacySettings {
  locationVisibility: 'all' | 'connections' | 'none';
  profileViewerVisibility: 'all' | 'connections' | 'none';
  activityStatusVisibility: 'all' | 'connections' | 'none';
  interestVisibility: 'all' | 'connections' | 'none';
}
```

Implementation paths:
- Extend User entity with privacy settings
- Add privacy check middleware for all user discovery endpoints
- Update frontend to support granular privacy settings

### 1.2 Temporary Visibility Modes

```typescript
// Planned extension in UserService
interface TemporaryVisibilityOptions {
  mode: 'ghost' | 'incognito' | 'spotlight';
  duration: number; // in minutes
  expiresAt: Date;
}

// Ghost mode: Hidden from all discovery
// Incognito: Browse without leaving view traces
// Spotlight: Enhanced visibility in discovery (premium)
```

Implementation paths:
- Add temporary state tracking to User entity
- Create scheduled job to reset temporary states
- Implement premium feature flags for special modes

## 2. Advanced User Recommendations

The current implementation uses basic geolocation for recommendations. Phase 2 will add:

### 2.1 Interest-Based Matching

```typescript
// Planned enhancement to UserDiscoveryService
async getInterestBasedRecommendations(
  userId: string,
  options: {
    interestWeighting: number; // 0-1 weight for interest match vs. location
    maxDistanceKm?: number;
    excludedUsers?: string[];
  }
): Promise<RecommendedUser[]>;
```

Implementation paths:
- Create interest comparison algorithm
- Implement weighted scoring for recommendations
- Add interest data aggregation for improved matching

### 2.2 Event-Based Suggestions

```typescript
// Planned integration with Event module
interface EventBasedDiscoveryOptions {
  eventId?: string; // Specific event or category
  timeframe: 'upcoming' | 'attended' | 'similar';
  relationshipPriority: boolean; // Prioritize existing connections
}
```

Implementation paths:
- Create cross-module integration with Event system
- Add repository methods for finding users by event participation
- Implement privacy-aware event attendance visibility

## 3. Social Graph Analytics

The current implementation handles direct relationships. Phase 2 will extend to:

### 3.1 Connection Path Discovery

```typescript
// Planned enhancement to UserRelationshipService
async findConnectionPath(
  sourceUserId: string,
  targetUserId: string,
  options: {
    maxDepth: number; // Maximum connection degrees
    includeBlocked: boolean; // Whether to traverse blocked relationships
  }
): Promise<ConnectionPathNode[]>;
```

Implementation paths:
- Implement graph traversal algorithm in repository
- Add caching layer for common path queries
- Create visualization data for frontend display

### 3.2 Friend-of-Friend Discovery

```typescript
// Planned enhancement to UserDiscoveryService
async getSharedConnectionRecommendations(
  userId: string,
  options: {
    minSharedConnections: number;
    maxResults: number;
    excludeExistingConnections: boolean;
  }
): Promise<SharedConnectionRecommendation[]>;
```

Implementation paths:
- Create repository methods for mutual friend discovery
- Add scoring based on number of shared connections
- Implement privacy filters for connection visibility

## 4. Performance Optimizations

### 4.1 Caching Strategy

```typescript
// Planned caching implementation
interface UserDiscoveryCacheOptions {
  nearbyUsersTTL: number; // Cache TTL in seconds
  viewersCacheTTL: number;
  recommendationCacheTTL: number;
  invalidationEvents: string[]; // Events that invalidate cache
}
```

Implementation paths:
- Add Redis integration for distributed caching
- Implement cache invalidation on relationship changes
- Add performance metrics for cache hit rates

### 4.2 Pagination and Lazy Loading

Enhance existing pagination with cursor-based approach:

```typescript
// Planned enhancement to discovery endpoints
interface CursorPaginationOptions {
  cursor: string; // Encoded cursor for current position
  direction: 'forward' | 'backward';
  limit: number;
}
```

Implementation paths:
- Replace offset pagination with cursor-based approach
- Add response metadata for pagination state
- Implement frontend support for infinite scrolling

## Feature Flag Integration

All Phase 2 features will be integrated with a feature flag system:

```typescript
// Feature flag configuration
const SOCIAL_FEATURE_FLAGS = {
  ENHANCED_PRIVACY: 'social_enhanced_privacy',
  INTEREST_MATCHING: 'social_interest_matching',
  EVENT_SUGGESTIONS: 'social_event_suggestions',
  SOCIAL_GRAPH: 'social_graph_analytics',
  PERFORMANCE_OPTIMIZATIONS: 'social_perf_optimizations'
};
```

This will allow for gradual rollout and A/B testing of new features. 