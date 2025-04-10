# Project Structure Documentation

## System Architecture Overview

NightBFF implements a modern, scalable architecture designed to support real-time nightlife social experiences. The system is composed of distinct components that work together to deliver a cohesive user experience while maintaining separation of concerns.

### High-Level Architecture

The diagram below illustrates the high-level architecture of NightBFF:

```
┌─────────────────┐     ┌──────────────────────────────────────────┐     ┌─────────────────────┐
│                 │     │                                          │     │                     │
│  Mobile Client  │◄───►│            API Gateway Layer            │◄───►│  Third-Party APIs   │
│  (React Native) │     │                                          │     │                     │
│                 │     └──────────────┬───────────────────────────┘     └─────────────────────┘
└─────────────────┘                    │
                                       ▼
                            ┌─────────────────────────┐
                            │                         │
                            │    Backend Services     │
                            │       (NestJS)          │
                            │                         │
                            └───────────┬─────────────┘
                                        │
                                        ▼
                  ┌───────────────────────────────────────────────┐
                  │                                               │
                  │              Supabase Platform                │
                  │                                               │
                  │  ┌─────────────┐  ┌─────────────────────────┐ │
                  │  │             │  │                         │ │
                  │  │ PostgreSQL  │  │ Supabase Auth (GoTrue)  │ │
                  │  │  Database   │  │                         │ │
                  │  │             │  │                         │ │
                  │  └─────────────┘  └─────────────────────────┘ │
                  │                                               │
                  │  ┌─────────────┐  ┌─────────────────────────┐ │
                  │  │             │  │                         │ │
                  │  │ Real-time   │  │       Storage           │ │
                  │  │ Subscriptions│  │                         │ │
                  │  │             │  │                         │ │
                  │  └─────────────┘  └─────────────────────────┘ │
                  │                                               │
                  └───────────────────────────────────────────────┘
```

### Architecture Components

The NightBFF architecture consists of these primary components:

1. **Mobile Client**: React Native application for iOS and Android
2. **API Gateway**: Entry point for all client-server communication
3. **Backend Services**: NestJS microservices for business logic
4. **Supabase Platform**: Core infrastructure including database, auth, and real-time capabilities
5. **Third-Party Services**: External APIs and services integrated with the system

### Component Communication

Components communicate through defined interfaces:

- **Client-Server Communication**: REST APIs with JWT authentication
- **Real-time Updates**: WebSocket connections via Supabase's real-time subscriptions
- **Service-to-Service Communication**: Internal REST APIs and message queues
- **External Service Integration**: HTTP/HTTPS APIs with appropriate authentication

## Microservices Structure

NightBFF uses a domain-driven microservices architecture to ensure scalability and maintainability.

### Service Breakdown

```
┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│                │  │                │  │                │  │                │
│  Auth Service  │  │  User Service  │  │ Venue Service  │  │ Event Service  │
│                │  │                │  │                │  │                │
└────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘

┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│                │  │                │  │                │  │                │
│  Chat Service  │  │  Feed Service  │  │Notification Svc│  │Premium Service │
│                │  │                │  │                │  │                │
└────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘
```

Each service has a specific responsibility domain:

1. **Auth Service**: Handles authentication, token management, and user permissions
2. **User Service**: Manages user profiles, relationships, and preferences
3. **Venue Service**: Handles venue data, discovery, and geospatial queries
4. **Event Service**: Manages event creation, discovery, and attendance
5. **Chat Service**: Provides real-time messaging functionality
6. **Feed Service**: Manages the social feed and content
7. **Notification Service**: Handles push notifications and in-app alerts
8. **Premium Service**: Manages subscription status and premium features

### Service Responsibilities

Each service encapsulates specific domain functionality:

**Auth Service**
- User registration and login
- Social authentication (Google, Apple, Facebook)
- JWT token issuance and verification
- Age verification integration with Onfido
- Permission management

**User Service**
- Profile creation and management
- Friend/follow relationships
- User search and discovery
- Profile privacy settings
- Location tracking and sharing

**Venue Service**
- Venue data ingestion from third-party APIs
- Geospatial venue search
- Venue metadata management
- Rating and review functionality
- Caching and data refresh strategies

**Event Service**
- Event creation and management
- Event discovery and search
- Attendance tracking
- Event recommendations
- Calendar integration

**Chat Service**
- One-on-one messaging
- Group chat functionality
- Message delivery status
- Media sharing in chats
- Chat history management

**Feed Service**
- Post creation and management
- Content discovery algorithm
- Content moderation
- Media handling
- User interactions (likes, comments)

**Notification Service**
- Push notification delivery
- Notification preferences
- Event reminders
- Chat alerts
- System announcements

**Premium Service**
- Subscription management
- Premium feature access control
- Payment verification
- Usage tracking
- A/B testing for conversion

## Database Architecture

NightBFF uses Supabase PostgreSQL for its primary data store, with a carefully designed schema to support the application's requirements.

### Entity Relationship Diagram

```
┌────────────┐       ┌───────────────┐       ┌────────────┐
│   Users    │       │ UserFriends   │       │   Venues   │
├────────────┤       ├───────────────┤       ├────────────┤
│ id         │◄──┐   │ id            │   ┌──►│ id         │
│ email      │   │   │ user_id       │◄──┘   │ name       │
│ username   │   └───┤ friend_id     │       │ description │
│ displayName│       │ status        │       │ address     │
│ photoURL   │       │ created_at    │       │ location    │
│ bio        │       └───────────────┘       │ category    │
│ interests  │                               │ photos      │
│ isVerified │       ┌───────────────┐       │ rating      │
│ isPremium  │       │   Events      │       │ price_level │
│ location   │       ├───────────────┤       │ hours       │
│ createdAt  │       │ id            │       │ contact     │
│ updatedAt  │       │ title         │       │ source_api  │
└────────────┘       │ description   │       │ updated_at  │
     │  ▲            │ creator_id    │────┐  └────────────┘
     │  │            │ venue_id      │────┘        ▲
     │  │            │ startTime     │             │
     │  │            │ endTime       │             │
     │  │            │ coverImage    │      ┌──────────────┐
     │  │            │ attendeeLimit │      │   Check-ins  │
     │  │            │ visibility    │      ├──────────────┤
     │  │            │ created_at    │      │ id           │
     │  │            │ updated_at    │      │ user_id      │──┐
     │  │            └───────────────┘      │ venue_id     │──┘
     │  │                    ▲              │ timestamp    │
     │  │                    │              │ status       │
     │  │            ┌───────────────┐      │ photos       │
     │  │            │EventAttendees │      └──────────────┘
     │  │            ├───────────────┤
     │  │            │ event_id      │
     │  │            │ user_id       │
     ▼  │            │ status        │
┌────────────┐       │ joined_at     │
│   Posts    │       └───────────────┘
├────────────┤
│ id         │       ┌───────────────┐
│ author_id  │────┐  │    Chats      │
│ content    │    │  ├───────────────┤
│ media      │    │  │ id            │
│ location   │    │  │ type          │
│ venue_id   │    │  │ title         │
│ event_id   │    │  │ created_at    │
│ visibility │    │  │ updated_at    │
│ created_at │    │  └───────────────┘
│ updated_at │    │         ▲
└────────────┘    │         │
     ▲            │  ┌───────────────┐
     │            │  │ChatParticipants│
     │            │  ├───────────────┤
     │            │  │ chat_id       │
┌────────────┐    │  │ user_id       │──┘
│  Comments  │    │  │ joined_at     │
├────────────┤    │  └───────────────┘
│ id         │    │
│ post_id    │◄───┘         ┌───────────────┐
│ author_id  │──────────────┤   Messages    │
│ content    │              ├───────────────┤
│ created_at │              │ id            │
│ updated_at │              │ chat_id       │
└────────────┘              │ sender_id     │──┘
                           │ content       │
                           │ media_url     │
                           │ location      │
                           │ status        │
                           │ reactions     │
                           │ created_at    │
                           └───────────────┘

┌────────────────┐          ┌────────────────┐
│ Subscriptions  │          │ UserLocations  │
├────────────────┤          ├────────────────┤
│ user_id        │◄─────────┤ user_id        │
│ status         │          │ location       │
│ plan           │          │ accuracy       │
│ start_date     │          │ timestamp      │
│ end_date       │          │ is_sharing     │
│ auto_renew     │          │ last_updated   │
│ platform       │          └────────────────┘
│ receipt        │
│ last_verified  │
└────────────────┘
```

### Key Database Tables and Relationships

1. **Users Table**
   - Core user identity and profile data
   - Linked to all user-generated content
   - Contains subscription status flags

2. **UserFriends Table**
   - Many-to-many relationship for social connections
   - Bidirectional or unidirectional relationships
   - Status tracking for connection state

3. **Venues Table**
   - Nightlife establishment data
   - Geospatial location information
   - Sourced from third-party APIs initially

4. **Events Table**
   - User-created and official events
   - Linked to venues (optional)
   - Time-bound activities with attendance

5. **EventAttendees Table**
   - Junction table linking users to events
   - Tracks attendance status
   - Records join timestamp

6. **Posts Table**
   - Feed content created by users
   - Can be associated with venues or events
   - Supports various media types

7. **Comments Table**
   - Responses to posts
   - Maintains parent-child relationship

8. **Chats Table**
   - Conversation containers
   - Supports different chat types
   - Links participants

9. **Messages Table**
   - Individual communication units
   - Supports text, media, and location
   - Tracks delivery status

10. **UserLocations Table**
    - Tracks user location data
    - Privacy controls for sharing
    - Historical record for patterns

11. **Subscriptions Table**
    - Premium user subscription data
    - Payment tracking
    - Feature access control

### Database Indexes

Critical indexes to support application performance:

```sql
-- Geospatial indexes for location queries
CREATE INDEX idx_venues_location ON venues USING GIST (location);
CREATE INDEX idx_user_locations_location ON user_locations USING GIST (location);

-- Indexes for frequent queries
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_messages_chat_id_created_at ON messages(chat_id, created_at);

-- Composite indexes for relationship lookups
CREATE INDEX idx_user_friends_user_id_friend_id ON user_friends(user_id, friend_id);
CREATE INDEX idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX idx_event_attendees_user_id ON event_attendees(user_id);
```

## Data Flow Architecture

NightBFF's data flows are designed to support both request-response patterns and real-time updates.

### Key Data Flows

1. **User Authentication Flow**

```
┌──────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│          │     │           │     │           │     │           │
│  Mobile  │────►│    API    │────►│   Auth    │────►│  Supabase │
│  Client  │     │  Gateway  │     │  Service  │     │   Auth    │
│          │     │           │     │           │     │           │
└──────────┘     └───────────┘     └───────────┘     └───────────┘
     ▲                                                     │
     │                                                     │
     └─────────────────────────────────────────────────────┘
                     Return JWT Token
```

2. **Venue Discovery Flow**

```
┌──────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│          │     │           │     │           │     │           │
│  Mobile  │────►│    API    │────►│   Venue   │────►│ PostgreSQL│
│  Client  │     │  Gateway  │     │  Service  │     │ Geospatial│
│          │     │           │     │           │     │           │
└──────────┘     └───────────┘     └───────────┘     └───────────┘
     ▲                                  │                  │
     │                                  │                  │
     │                                  ▼                  │
     │                           ┌───────────┐             │
     │                           │           │             │
     │                           │Third-Party│◄────────────┘
     │                           │   APIs    │    Cache Miss
     │                           │           │
     │                           └───────────┘
     │                                  │
     └──────────────────────────────────┘
                 Return Venues
```

3. **Real-time Chat Flow**

```
┌──────────┐                              ┌───────────┐
│          │                              │           │
│  Mobile  │◄─────────────────────────────┤  Supabase │
│  Client  │  WebSocket (Subscribe)       │ Real-time │
│          │                              │           │
└──────────┘                              └───────────┘
     │                                          ▲
     │                                          │
     ▼                                          │
┌───────────┐     ┌───────────┐     ┌───────────┐
│           │     │           │     │           │
│    API    │────►│   Chat    │────►│ PostgreSQL│
│  Gateway  │     │  Service  │     │ NOTIFY    │
│           │     │           │     │           │
└───────────┘     └───────────┘     └───────────┘
```

4. **Feed Content Flow**

```
┌──────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│          │     │           │     │           │     │           │
│  Mobile  │────►│    API    │────►│   Feed    │────►│ PostgreSQL│
│  Client  │     │  Gateway  │     │  Service  │     │  Query    │
│          │     │           │     │           │     │           │
└──────────┘     └───────────┘     └───────────┘     └───────────┘
     ▲                                                     │
     │                                                     │
     └─────────────────────────────────────────────────────┘
                      Return Feed Items
```

### Critical Path Operations

1. **User Location Update**

```
Mobile Client
    │
    ▼
Calculate optimal update frequency
    │
    ▼
Send location update
    │
    ▼
API Gateway
    │
    ▼
User Service
    │
    ▼
Update UserLocations table
    │
    ▼
Apply privacy rules (fuzzing)
    │
    ▼
Trigger PostgreSQL NOTIFY
    │
    ▼
Supabase Real-time
    │
    ▼
Update subscribed clients
```

2. **Event Creation**

```
Mobile Client
    │
    ▼
Submit event details
    │
    ▼
API Gateway
    │
    ▼
Event Service
    │
    ▼
Validate inputs
    │
    ▼
Create event record
    │
    ▼
Add creator as attendee
    │
    ▼
Notification Service
    │
    ▼
Notify relevant users
    │
    ▼
Feed Service
    │
    ▼
Add to relevant feeds
```

## API Structure

NightBFF's API is organized around resources and follows RESTful principles.

### API Gateway

All client requests pass through the API gateway, which handles:

- Request routing to appropriate microservices
- Authentication verification
- Rate limiting
- Request logging
- Response caching (where appropriate)

### API Endpoints Overview

```
/api
├── /auth
│   ├── POST /register               # Create new account
│   ├── POST /login                  # Email/password login
│   ├── POST /refresh-token          # Refresh JWT token
│   ├── POST /social/:provider       # Social login
│   └── POST /verify-age             # Age verification
│
├── /users
│   ├── GET /                        # User search
│   ├── GET /:id                     # Get user profile
│   ├── PATCH /:id                   # Update profile
│   ├── GET /:id/friends             # List connections
│   ├── POST /:id/connect            # Request connection
│   ├── PATCH /connections/:id       # Update connection
│   └── PUT /location                # Update location
│
├── /venues
│   ├── GET /                        # Search venues
│   ├── GET /:id                     # Get venue details
│   ├── GET /nearby                  # Location-based search
│   ├── POST /:id/checkin            # Check in to venue
│   └── GET /:id/events              # Venue events
│
├── /events
│   ├── GET /                        # Search events
│   ├── POST /                       # Create event
│   ├── GET /:id                     # Get event details
│   ├── PATCH /:id                   # Update event
│   ├── DELETE /:id                  # Cancel event
│   ├── GET /:id/attendees           # List attendees
│   └── POST /:id/attend             # Join event
│
├── /feed
│   ├── GET /                        # Get personalized feed
│   ├── POST /posts                  # Create post
│   ├── GET /posts/:id               # Get post details
│   ├── PATCH /posts/:id             # Update post
│   ├── DELETE /posts/:id            # Delete post
│   ├── POST /posts/:id/like         # Like post
│   └── POST /posts/:id/comments     # Comment on post
│
├── /chats
│   ├── GET /                        # List user's chats
│   ├── POST /                       # Create new chat
│   ├── GET /:id                     # Get chat details
│   ├── GET /:id/messages            # Get chat messages
│   ├── POST /:id/messages           # Send message
│   └── PATCH /messages/:id/status   # Update message status
│
├── /subscriptions
│   ├── GET /                        # Get subscription status
│   ├── POST /verify                 # Verify purchase
│   └── GET /features                # List premium features
│
└── /notifications
    ├── GET /                        # List notifications
    ├── PATCH /:id                   # Mark as read
    └── PUT /settings                # Update preferences
```

### API Request-Response Format

Standard API responses follow this format:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2023-10-30T15:30:00Z",
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 85,
      "hasMore": true
    }
  }
}
```

Error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource was not found",
    "details": {
      // Additional error context
    }
  },
  "meta": {
    "timestamp": "2023-10-30T15:30:00Z",
    "requestId": "req-12345-abcde"
  }
}
```

## Frontend Architecture

The mobile client uses a structured approach for maintainability and performance.

### Application Structure

```
/src
├── /assets                  # Static assets (images, fonts)
├── /components              # UI components
│   ├── /atoms               # Base UI elements
│   ├── /molecules           # Composite components
│   ├── /organisms           # Complex UI sections
│   └── /templates           # Screen layouts
├── /hooks                   # Custom React hooks
├── /navigation              # React Navigation setup
├── /screens                 # App screens
├── /services                # API clients and integrations
├── /store                   # State management
├── /theme                   # Design tokens and styling
└── /utils                   # Utility functions
```

### State Management

The frontend implements a layered state management approach:

1. **Local Component State**: For UI-specific state
2. **Context API**: For shared state across component trees
3. **React Query**: For server state management
4. **AsyncStorage**: For persistent client-side storage

### Navigation Structure

```
App
├── AuthStack
│   ├── Login
│   ├── Register
│   └── AgeVerification
├── MainTabs
│   ├── MapTab
│   │   ├── MapScreen
│   │   ├── VenueDetails
│   │   └── CheckIn
│   ├── EventsTab
│   │   ├── EventsListScreen
│   │   ├── EventDetails
│   │   └── CreateEvent
│   ├── FeedTab
│   │   ├── FeedScreen
│   │   ├── PostDetails
│   │   └── CreatePost
│   ├── ChatsTab
│   │   ├── ChatsList
│   │   ├── ChatScreen
│   │   └── NewChat
│   └── ProfileTab
│       ├── ProfileScreen
│       ├── EditProfile
│       ├── Friends
│       └── Settings
└── Modals
    ├── LocationPermission
    ├── NotificationPermission
    └── PremiumUpgrade
```

## External Service Integration

NightBFF integrates with multiple external services to enhance functionality.

### Third-Party Service Integration

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│                  │     │                     │     │                  │
│  Google Places   │◄───►│                     │     │    Foursquare    │
│       API        │     │                     │     │       API        │
│                  │     │                     │     │                  │
└──────────────────┘     │                     │     └──────────────────┘
                         │                     │
┌──────────────────┐     │                     │     ┌──────────────────┐
│                  │     │                     │     │                  │
│     Onfido       │◄───►│    NightBFF Core    │◄───►│    RevenueCat    │
│       API        │     │                     │     │                  │
│                  │     │                     │     │                  │
└──────────────────┘     │                     │     └──────────────────┘
                         │                     │
┌──────────────────┐     │                     │     ┌──────────────────┐
│                  │     │                     │     │                  │
│      OpenAI      │◄───►│                     │     │     OneSignal    │
│       API        │     │                     │     │                  │
│                  │     │                     │     │                  │
└──────────────────┘     └─────────────────────┘     └──────────────────┘
```

### Integration Patterns

Each external service uses appropriate integration patterns:

1. **Venue Data APIs** (Google Places, Foursquare)
   - Periodic scheduled data refresh
   - On-demand queries for specific searches
   - Results caching and merging

2. **Age Verification** (Onfido)
   - One-time verification during onboarding
   - Secure document and selfie submission
   - Webhook for verification results

3. **Payments** (RevenueCat)
   - In-app purchase management
   - Subscription status verification
   - Cross-platform receipt validation

4. **AI Features** (OpenAI)
   - Asynchronous request processing
   - Result caching for popular queries
   - Fallback mechanisms for service unavailability

5. **Push Notifications** (OneSignal)
   - Batch processing for high-volume notifications
   - Template-based notification creation
   - Delivery tracking and analytics

## Deployment Architecture

NightBFF uses a cloud-native deployment architecture for scalability and reliability.

### Infrastructure Overview

```
                         ┌─────────────────┐
                         │                 │
                         │  CDN (CloudFront)│
                         │                 │
                         └────────┬────────┘
                                  │
┌─────────────────┐               ▼               ┌─────────────────┐
│                 │      ┌─────────────────┐      │                 │
│  iOS App Store  │      │                 │      │ Android Play    │
│                 │      │  API Gateway    │      │ Store           │
│                 │      │                 │      │                 │
└─────────────────┘      └────────┬────────┘      └─────────────────┘
                                  │
               ┌─────────────────┐│┌─────────────────┐
               │                 ││                 │
               │  Auth Service   │││  User Service  │
               │  Cloud Run      │││  Cloud Run     │
               │                 ││                 │
               └─────────────────┘│└─────────────────┘
                                  │
               ┌─────────────────┐│┌─────────────────┐
               │                 ││                 │
               │  Venue Service  │││  Event Service  │
               │  Cloud Run      │││  Cloud Run     │
               │                 ││                 │
               └─────────────────┘│└─────────────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │                 │
                         │    Supabase     │
                         │                 │
                         └────────┬────────┘
                                  │
                         ┌────────┴────────┐
                         │                 │
                         │    S3 Storage   │
                         │                 │
                         └─────────────────┘
```

### Deployment Strategy

Each component has a specific deployment approach:

1. **Mobile Apps**
   - Deployed through respective app stores
   - CI/CD pipeline for automated builds
   - Phased rollout for major updates

2. **Backend Services**
   - Containerized microservices deployed on Cloud Run
   - Automatic scaling based on demand
   - Blue-green deployment for zero downtime

3. **Database**
   - Managed Supabase instance
   - Regular automated backups
   - Point-in-time recovery capabilities

4. **Media Storage**
   - AWS S3 for media assets
   - CloudFront CDN for edge caching
   - Content moderation workflows

5. **Monitoring & Observability**
   - Centralized logging system
   - Performance monitoring dashboards
   - Automated alerting for anomalies

## System Interactions

### Authentication Flow Sequence

```
Client                API Gateway             Auth Service            Supabase Auth
  │                        │                       │                       │
  │ 1. Login Request       │                       │                       │
  │───────────────────────►│                       │                       │
  │                        │ 2. Forward Request    │                       │
  │                        │──────────────────────►│                       │
  │                        │                       │ 3. Authenticate User  │
  │                        │                       │──────────────────────►│
  │                        │                       │                       │
  │                        │                       │◄──────────────────────│
  │                        │                       │ 4. User Data          │
  │                        │                       │                       │
  │                        │                       │ 5. Generate JWT       │
  │                        │                       │───────────────────────┐
  │                        │                       │                       │
  │                        │◄──────────────────────│                       │
  │                        │ 6. Return Token       │                       │
  │◄───────────────────────│                       │                       │
  │ 7. Store Token         │                       │                       │
  │───────────────────────┐│                       │                       │
  │                       ││                       │                       │
  │◄──────────────────────┘│                       │                       │
```

### Event Creation Sequence

```
Client                API Gateway             Event Service            User Service
  │                        │                       │                       │
  │ 1. Create Event        │                       │                       │
  │───────────────────────►│                       │                       │
  │                        │ 2. Forward Request    │                       │
  │                        │──────────────────────►│                       │
  │                        │                       │ 3. Validate Data      │
  │                        │                       │───────────────────────┐
  │                        │                       │                       │
  │                        │                       │◄──────────────────────┘
  │                        │                       │                       │
  │                        │                       │ 4. Create Event       │
  │                        │                       │───────────────────────┐
  │                        │                       │                       │
  │                        │                       │◄──────────────────────┘
  │                        │                       │                       │
                                                   │                       │
  Client              Notification Service         │       Feed Service    │
    │                       │                      │            │          │
    │                       │◄─────────────────────┼────────────┘          │
    │                       │ 5. Notify Users      │                       │
    │                       │                      │                       │
    │◄──────────────────────│                      │                       │
    │ 6. Push Notification  │                      │                       │
    │                       │                      │                       │
    │                       │                      │                       │
    │◄──────────────────────┼──────────────────────┘                       │
    │ 7. Return Event Data  │                                              │
    │                       │                                              │
```

### Real-time Location Sharing

```
Client A               API Gateway             User Service        Supabase Realtime
  │                        │                       │                      │
  │ 1. Update Location     │                       │                      │
  │───────────────────────►│                       │                      │
  │                        │ 2. Forward Request    │                      │
  │                        │──────────────────────►│                      │
  │                        │                       │ 3. Update Location   │
  │                        │                       │──────────────────────┐
  │                        │                       │                      │
  │                        │                       │◄─────────────────────┘
  │                        │                       │                      │
  │                        │                       │ 4. Apply Privacy     │
  │                        │                       │ Rules & Trigger      │
  │                        │                       │ NOTIFY               │
  │                        │                       │──────────────────────►
  │                        │                       │                      │
  │                        │◄──────────────────────│                      │
  │◄───────────────────────│ 5. Success Response   │                      │
  │                        │                       │                      │
                                                                          │
Client B                                                                  │
  │                                                                       │
  │◄──────────────────────────────────────────────────────────────────────┘
  │ 6. Location Update Event                                              │
  │                                                                       │
  │ 7. Update Map                                                         │
  │─────────────────────┐                                                 │
  │                     │                                                 │
  │◄────────────────────┘                                                 │
```

## Mobile-Specific Architecture

The mobile architecture addresses platform-specific considerations.

### Native Module Integration

```
┌────────────────┐     ┌─────────────────────────────┐     ┌────────────────┐
│                │     │                             │     │                │
│ React Native   │     │ JavaScript Core Application │     │   Native UI    │
│    Bridge      │◄───►│                             │◄───►│  Components    │
│                │     │                             │     │                │
└────────────────┘     └─────────────────────────────┘     └────────────────┘
        ▲                             ▲                              ▲
        │                             │                              │
        ▼                             ▼                              ▼
┌────────────────┐     ┌────────────────┐               ┌─────────────────────┐
│                │     │                │               │                     │
│   Geolocation  │     │  Notifications │               │ Camera/Photo Access │
│     Module     │     │     Module     │               │       Module        │
│                │     │                │               │                     │
└────────────────┘     └────────────────┘               └─────────────────────┘
```

### Offline Capabilities

The app implements a structured approach to offline functionality:

1. **Data Persistence**
   - SQLite for structured data
   - AsyncStorage for simple key-value pairs
   - Custom sync adapters for each data type

2. **Offline Actions**
   - Action queue for pending operations
   - Conflict resolution strategies
   - Background synchronization

3. **Asset Management**
   - Preloading of critical assets
   - Progressive loading of images
   - Cache management with size limits

### Battery Optimization

Location services are optimized to minimize battery consumption:

1. **Adaptive Location Updates**
   - High frequency in "Tonight Mode"
   - Reduced frequency in background
   - Geofencing for important areas

2. **Batched Network Requests**
   - Combining multiple API calls
   - Scheduled synchronization
   - Compression of payloads

3. **Efficient Rendering**
   - Map tile caching
   - List virtualization
   - Image optimizations
