
# Feature Specifications

## Core Features

### 1. User Profiles & Authentication

The user profile system serves as the foundation for personalized nightlife experiences. Using Supabase Auth (GoTrue) for authentication and secure data management, it establishes user identity and preferences.

Profile Management Features:
- Multi-method authentication (Email/password, Apple, Google, Facebook)
- Secure JWT token-based authorization
- Age verification integration with Onfido
- Social profile connections
- Privacy controls and settings

Profile Customization Capabilities:
- Username and display name configuration
- Profile photos and optional gallery
- Bio and personal interests selection
- Nightlife preferences (venue types, music genres)
- Privacy level settings

Onboarding System:
- Step-by-step guided registration flow
- Age verification process with fallback options
- Preference and interest selection
- Location permissions setup
- Initial tutorial/guidance

### 2. Map & Venue Discovery

The location-based venue discovery system provides the core functionality for finding and exploring nightlife options around the user.

Map Interface Features:
- Interactive map with venue pins
- Current location display (with permission)
- Free user radius limitation (5-mile)
- Premium user full map access
- Customizable map filters

Venue Discovery System:
- Third-party API integration (Google Places, Foursquare)
- Cached venue data with TTL management
- Structured venue information display
- Category-based filtering options
- Rating and popularity indicators

Location Management:
- Opt-in GPS location sharing
- Fuzzy location algorithms for privacy
- Geohash-based location indexing
- Battery-optimized location updates
- "Tonight Mode" for active nightlife sessions

### 3. Community Feed & Social Engagement

The social feed system enables users to share experiences, discover events, and connect with the nightlife community.

Feed Components:
- Location-based timeline of posts
- Event announcements and updates
- User-generated photos and content
- Venue check-ins and tags
- Interactive comment threads

Content Creation Tools:
- Multimedia post composer
- Venue tagging functionality
- Time-limited "Night Stories"
- Photo gallery with privacy controls
- Location tagging options

Engagement Features:
- Post reactions and comments
- Content sharing capabilities
- User tagging in posts
- Post visibility controls
- Notification system for interactions

### 4. Real-time Chat & Messaging

The messaging system facilitates connections between users and groups, enabling real-time communication about nightlife plans.

Chat System Architecture:
- One-on-one private messaging
- Group chat functionality
- Venue-specific chat channels
- Real-time message delivery
- Typing indicators and read receipts

Message Features:
- Text message support
- Media sharing capabilities
- Location sharing in chats
- Message reactions
- User presence indicators

Technical Implementation:
- Supabase real-time subscriptions
- PostgreSQL LISTEN/NOTIFY mechanism
- Optimized for mobile bandwidth
- Message delivery status tracking
- Chat history synchronization

### 5. Event Planning & Management

The event system allows users to discover, create, and join nightlife events, providing structure to social gatherings.

Event Creation Tools:
- Event details editor (title, description, time)
- Venue selection and mapping
- Privacy settings (public, friends-only, invite-only)
- Attendee limit configuration
- Event image upload

Event Discovery:
- Personalized event recommendations
- Location-based event search
- Friend activity highlighting
- Calendar integration
- Categorized event browsing

Attendance Management:
- RSVP functionality
- Attendee list management
- Event reminders and notifications
- Status updates for participants
- Event chat integration

### 6. Premium Subscription Features

The subscription system provides enhanced features for paying users while maintaining core functionality for free users.

Premium Benefits:
- Full map access (unlimited radius)
- AI-powered nightlife itinerary generation
- Premium profile badge and customization
- Ad-free experience
- Priority access to popular events

Subscription Management:
- In-app purchase integration via RevenueCat
- Subscription status validation
- Cross-platform subscription syncing
- Grace period management
- Subscription renewal notifications

Free vs. Premium Thresholds:
- Map radius limitations (5-mile for free)
- AI itinerary generation limits (3/month for free)
- Profile customization restrictions
- Event creation quantity limits
- Feature-specific usage quotas

### 7. Content Moderation & Safety

The moderation system ensures platform safety and appropriate content while respecting user expression.

Automated Moderation:
- Keyword filtering for inappropriate content
- Rate limiting to prevent spam
- Pattern recognition for prohibited content
- Threshold-based content flagging
- Machine learning toxicity detection

Reporting System:
- User-initiated content reporting
- Standardized reporting categories
- Reporter feedback loop
- Appeal mechanism for flagged content
- Escalation paths for serious issues

Privacy Protection:
- Location data fuzzing algorithms
- Configurable profile visibility
- Content sharing restrictions
- Block and mute functionality
- Data retention policies

## Role-Based Access Control

The NightBFF platform implements a phase-appropriate role and permission system that evolves with the application's development lifecycle.

### User Role Definitions

| Role | Description | Available From |
|------|-------------|----------------|
| `USER` | Standard authenticated user | Phase 1 |
| `PREMIUM_USER` | Subscribed user with access to enhanced features | Phase 2 |
| `EVENT_ORGANIZER` | User with elevated event management capabilities | Phase 2 |
| `CONTENT_CREATOR` | User with enhanced content creation permissions | Phase 2 |
| `MODERATOR` | User with community moderation capabilities | Phase 2 |
| `VENUE_OWNER` | Authorized venue representative with venue management capabilities | Phase 3 |
| `EVENT_PROMOTER` | Professional event promoter with enhanced event tools | Phase 3 |
| `ADMIN` | Platform administrator with system-wide access | Phase 1 (internal only) |

### Permission Matrix by Phase

#### Phase 1 Permissions

| Permission | USER | ADMIN |
|------------|------|-------|
| Create personal profile | ✅ | ✅ |
| Discover venues | ✅ | ✅ |
| View venue details | ✅ | ✅ |
| Create/join events | ✅ | ✅ |
| Send/receive messages | ✅ | ✅ |
| Create social connections | ✅ | ✅ |
| Share location (opt-in) | ✅ | ✅ |
| Access system administration | ❌ | ✅ |
| View premium feature previews | ✅ | ✅ |

#### Phase 2 Permissions (Includes all Phase 1 permissions)

| Permission | USER | PREMIUM_USER | EVENT_ORGANIZER | CONTENT_CREATOR | MODERATOR | ADMIN |
|------------|------|--------------|-----------------|-----------------|-----------|-------|
| Unlimited map radius | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| AI itinerary generation | Limited | Unlimited | Limited | Limited | Unlimited | Unlimited |
| Enhanced profile customization | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ad-free experience | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Create featured events | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Enhanced content reach | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Content moderation tools | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Analytics dashboard | ❌ | Basic | Basic | Basic | Advanced | Full |

#### Phase 3 Permissions (Includes all Phase 2 permissions)

| Permission | USER | PREMIUM_USER | EVENT_ORGANIZER | CONTENT_CREATOR | MODERATOR | VENUE_OWNER | EVENT_PROMOTER | ADMIN |
|------------|------|--------------|-----------------|-----------------|-----------|-------------|----------------|-------|
| Venue profile management | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Venue event management | ❌ | ❌ | Limited | ❌ | ❌ | ✅ | ✅ | ✅ |
| Venue analytics | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Limited | ✅ |
| Venue promotions | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Professional event tools | ❌ | ❌ | Limited | ❌ | ❌ | Limited | ✅ | ✅ |
| Verified venue chat | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |

### Implementation Guidelines

1. **Role Storage**
   - Store user roles in the User model:
     ```typescript
     interface User {
       // Existing fields
       roles: UserRole[];  // Array of assigned roles
     }
     
     enum UserRole {
       USER = 'USER',
       PREMIUM_USER = 'PREMIUM_USER',
       EVENT_ORGANIZER = 'EVENT_ORGANIZER',
       CONTENT_CREATOR = 'CONTENT_CREATOR',
       MODERATOR = 'MODERATOR',
       VENUE_OWNER = 'VENUE_OWNER',
       EVENT_PROMOTER = 'EVENT_PROMOTER',
       ADMIN = 'ADMIN'
     }
     ```

2. **Permission Checks**
   - Implement role-based authorization with phase awareness:
     ```typescript
     async function hasPermission(userId: string, permission: string): Promise<boolean> {
       // Get user with roles
       const user = await userService.findById(userId);
       
       // Get current phase
       const currentPhase = await featureFlagService.getCurrentPhase();
       
       // Check if permission is available in current phase
       if (!isPermissionAvailableInPhase(permission, currentPhase)) {
         return false;
       }
       
       // Check role-based permissions
       return user.roles.some(role => 
         hasRolePermission(role, permission, currentPhase)
       );
     }
     ```

3. **Phase-Specific Role Management**
   - Always check feature flag before permission check:
     ```typescript
     // In a controller or service
     async updateVenue(userId: string, venueId: string, data: UpdateVenueDto): Promise<Venue> {
       // First check if venue owner features are enabled
       const venueOwnerFeaturesEnabled = await featureFlagService.isEnabled('venue_owner_features');
       
       if (!venueOwnerFeaturesEnabled) {
         throw new ForbiddenException('Venue management is not yet available');
       }
       
       // Then check specific permission
       const canManageVenue = await permissionService.hasPermission(userId, 'venue:update');
       
       if (!canManageVenue) {
         throw new ForbiddenException('You do not have permission to update venues');
       }
       
       // Proceed with update
       return this.venueService.update(venueId, data);
     }
     ```

4. **Role Assignment Flow**
   - System roles (PREMIUM_USER): Automatically assigned based on subscription status
   - Special roles (VENUE_OWNER, EVENT_PROMOTER): Require verification and admin approval
   - Content-based roles (EVENT_ORGANIZER, CONTENT_CREATOR): Earned through platform activity
   - Moderation roles (MODERATOR): Assigned by administrators only

## Technical Implementation Details

### API Structure & Data Models

The backend API is structured around core resources with standardized endpoints:

User Profile API:
- `GET /api/users/:id` - Retrieve user profile
- `PATCH /api/users/:id` - Update user profile
- `GET /api/users/:id/friends` - List user connections
- `POST /api/users/:id/follow` - Follow another user

Venue API:
- `GET /api/venues` - List venues with filters
- `GET /api/venues/:id` - Get venue details
- `GET /api/venues/:id/events` - List venue events
- `POST /api/venues/:id/checkin` - Register user presence

Event API:
- `GET /api/events` - List events with filters
- `POST /api/events` - Create new event
- `PATCH /api/events/:id` - Update event details
- `POST /api/events/:id/join` - Join an event
- `GET /api/events/:id/attendees` - List attendees

Feed API:
- `GET /api/feed` - Get personalized feed
- `POST /api/posts` - Create new post
- `PATCH /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Remove post
- `POST /api/posts/:id/like` - React to post

Chat API:
- `GET /api/chats` - List user's chats
- `POST /api/chats` - Create new chat
- `GET /api/chats/:id/messages` - Get chat messages
- `POST /api/chats/:id/messages` - Send message
- `PATCH /api/messages/:id` - Update message

Subscription API:
- `GET /api/subscriptions` - Get subscription status
- `POST /api/subscriptions/verify` - Verify purchase
- `GET /api/subscriptions/features` - List premium features

### Data Model Specifications

Key data models and their relationships:

User Model:
```typescript
interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  photoURL: string;
  bio: string;
  interests: string[];
  isVerified: boolean;
  isPremium: boolean;
  location?: GeoPoint;
  createdAt: Date;
  updatedAt: Date;
}
```

Venue Model:
```typescript
interface Venue {
  id: string;
  name: string;
  description: string;
  address: string;
  location: GeoPoint;
  category: string[];
  photos: string[];
  rating: number;
  operatingHours: Record<string, string>;
  priceLevel: number;
  contactInfo: {
    phone?: string;
    website?: string;
    socialLinks?: Record<string, string>;
  };
  sourceAPI: 'google' | 'foursquare' | 'manual';
  lastUpdated: Date;
}
```

Event Model:
```typescript
interface Event {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  venueId?: string;
  customLocation?: string;
  startTime: Date;
  endTime?: Date;
  coverImage?: string;
  attendeeLimit?: number;
  visibility: 'public' | 'friends' | 'private';
  attendees: {
    userId: string;
    status: 'going' | 'maybe' | 'invited';
    joinedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}
```

Post Model:
```typescript
interface Post {
  id: string;
  authorId: string;
  content: string;
  media: string[];
  location?: GeoPoint;
  venueId?: string;
  eventId?: string;
  mentions: string[];
  visibility: 'public' | 'friends' | 'private';
  reactions: {
    type: string;
    count: number;
    userIds: string[];
  }[];
  createdAt: Date;
  updatedAt: Date;
}
```

Chat Model:
```typescript
interface Chat {
  id: string;
  type: 'direct' | 'group' | 'event' | 'venue';
  participants: string[];
  title?: string;
  lastMessage?: {
    senderId: string;
    content: string;
    timestamp: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

Message Model:
```typescript
interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  mediaUrl?: string;
  location?: GeoPoint;
  status: 'sent' | 'delivered' | 'read';
  reactions?: Record<string, string[]>;
  createdAt: Date;
  updatedAt: Date;
}
```

Subscription Model:
```typescript
interface Subscription {
  userId: string;
  status: 'active' | 'expired' | 'trial';
  plan: 'monthly' | 'annual';
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  platform: 'ios' | 'android' | 'web';
  receipt?: string;
  lastVerified: Date;
}
```

## Feature Dependencies

### Critical Path Dependencies

1. Authentication & Profile Creation:
   - Supabase Auth integration
   - JWT token management
   - User profile data schema implementation
   - Age verification API integration

2. Location & Map System:
   - Google Maps API integration
   - Geolocation permission handling
   - Geospatial database queries
   - Venue data caching mechanism

3. Social Connections:
   - Friend/follow relationship management
   - Privacy-aware data access controls
   - Real-time notification system
   - Data synchronization across devices

4. Real-time Communication:
   - Supabase real-time subscription setup
   - Message delivery tracking
   - Media upload and storage integration
   - Chat history synchronization

### Feature-Specific Technical Requirements

Location Services:
- Native geolocation API access
- Background location updates (with appropriate permissions)
- Location caching for offline availability
- Geospatial indexes for efficient proximity queries
- Location data privacy protections

Real-time Features:
- Supabase subscription optimization
- Connection state management
- Reconnection handling
- Offline queueing of actions
- Data synchronization between devices

Media Handling:
- Image compression before upload
- Multi-resolution image storage
- Progressive image loading
- Media caching for performance
- Content delivery network integration

Data Persistence:
- Offline-first architecture
- Local data caching (SQLite/AsyncStorage)
- Conflict resolution for concurrent changes
- Background synchronization
- Cache invalidation strategies

Authentication Flow:
- Session management
- Token refresh mechanism
- Multi-device support
- Secure credential storage
- Account recovery process

## Feature Implementation Priorities

### MVP Features (Phase 1)
1. User authentication & basic profiles
2. Venue discovery with map interface
3. Basic event creation & browsing
4. Core chat functionality
5. Social connection system
6. Location sharing (opt-in)
7. Basic monetization UI elements

### Secondary Features (Phase 2)
1. Advanced social feed capabilities
2. Gamification system
3. Full premium subscription implementation
4. Enhanced notification system
5. Improved content moderation tools
6. Performance optimizations

### Future Considerations (Phase 3+)
1. Venue owner portal & management
2. Advanced analytics & reporting
3. In-app purchases for venue services
4. Enhanced AI recommendation systems
5. Multi-city/international expansion features
