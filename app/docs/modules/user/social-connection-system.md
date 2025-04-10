# Social Connection System

## Overview

The Social Connection System enables users to establish and manage social relationships within the NightBFF application, supporting the discovery and connection features described in the User Flow Journey document.

## Key Components

### Data Models

1. **UserRelationship**
   - Tracks relationships between users (pending, accepted, following, blocked)
   - Includes reporting functionality for safety
   - Maintains audit trail with timestamps

2. **ProfileView**
   - Records profile views with timestamps
   - Supports anonymous viewing for free users
   - Connects viewer and viewed users

### Repositories

1. **UserRelationshipRepository**
   - Core CRUD operations for relationships
   - Methods for finding, updating, and managing relationships
   - Support for blocking and reporting functionality

2. **ProfileViewRepository**
   - Tracking and retrieval of profile views
   - Methods for counting and analyzing view patterns
   - Support for notification management

3. **UserRepository** (Enhanced)
   - Geospatial query methods for nearby user discovery
   - Support for active user filtering
   - Distance calculation and sorting

### Services

1. **UserDiscoveryService**
   - Find nearby users based on location
   - Get recommended users based on various factors
   - Access profile viewers with privacy controls

### Controllers

1. **UserDiscoveryController**
   - REST API endpoints for user discovery features
   - Support for filtering and pagination
   - Authentication and authorization controls

## API Endpoints

### User Discovery

1. **GET /users/discovery/nearby**
   - Finds users based on proximity to current user
   - Parameters:
     - `latitude` (required): Current latitude
     - `longitude` (required): Current longitude
     - `radiusInKm`: Search radius (default: 5km)
     - `limit`: Results per page (default: 20)
     - `offset`: Pagination offset (default: 0)
     - `activeOnly`: Only show active users (default: false)
     - `activeWithinMinutes`: Activity threshold (default: 30)

2. **GET /users/discovery/recommended**
   - Returns personalized user recommendations
   - Parameters:
     - `limit`: Results per page (default: 20)
     - `offset`: Pagination offset (default: 0)

3. **GET /users/discovery/profile-viewers**
   - Shows users who viewed the current user's profile
   - Parameters:
     - `limit`: Results per page (default: 20)
     - `offset`: Pagination offset (default: 0)
     - `daysBack`: Time window in days (default: 30)

## Privacy Controls

The Social Connection System implements several privacy features:

1. **Relationship-based Visibility**
   - Blocked users are excluded from all queries
   - Different visibility levels based on relationship status

2. **Location Privacy**
   - Users can hide their location from non-connections
   - Distance calculations with privacy controls

3. **Profile View Privacy**
   - Free users see anonymous views
   - Premium users can see full viewer information

## Integration Points

The Social Connection System integrates with:

1. **Authentication System**
   - JWT-based authentication for secure access
   - User identity validation

2. **Notification System**
   - Alerts for new connection requests
   - Notifications for profile views (based on settings)

## User Flow Integration

This system supports the following aspects of the User Flow Journey:

1. **Map Experience (Section 5)**
   - Nearby Nightlifers Panel: Shows users in proximity
   - User Discovery: Finding and connecting with other users
   - Safety Features: Blocking and reporting capabilities

2. **Chat & Messaging (Section 6)**
   - Connection Requests: Initiating and responding to requests
   - Direct Messaging: Establishing communication channels

## Phase 2 Extension Points

The following areas are planned for expansion in Phase 2:

1. **Enhanced Privacy Controls**
   - Granular visibility settings
   - Temporary visibility modes

2. **Advanced User Recommendations**
   - Interest-based matching
   - Event-based suggestions

3. **Social Graph Analytics**
   - Connection path visualization
   - Friend-of-friend discovery

## Implementation Notes

- All user discovery queries filter out blocked users
- Geospatial queries use PostgreSQL's ST_Distance_Sphere for accurate distance calculation
- Profile views trigger notifications based on user settings and premium status 