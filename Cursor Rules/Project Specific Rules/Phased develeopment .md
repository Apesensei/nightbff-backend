# Rule Set 8: NightBFF Phased Development Priorities

## MVP Feature Prioritization

### Phase 1 Core Features
Focus implementation efforts on these MVP features first:

1. **User Authentication & Basic Profiles**
   - Email/password and social authentication
   - Basic profile creation
   - Age verification integration
   - Profile editing functionality

2. **Venue Discovery with Map Interface**
   - Map-based venue exploration
   - Basic venue information display
   - Simple filtering capabilities
   - Location permission handling

3. **Basic Event Creation & Browsing**
   - Event creation form
   - Simple event discovery
   - RSVP functionality
   - Event details view

4. **Core Chat Functionality**
   - One-on-one messaging
   - Message delivery status
   - Basic media sharing
   - Conversation list view

5. **Social Connection System**
   - Friend/follow requests
   - Connection acceptance
   - User search/discovery
   - Basic privacy controls

6. **Location Sharing (Opt-in)**
   - Permission handling
   - Basic location display on map
   - Privacy controls
   - Battery optimization

7. **Basic Monetization UI Elements**
   - Premium feature previews
   - Subscription screen mockups
   - Feature gate indicators
   - No actual payment processing yet

### Implementation Sequence
- First implement authentication and profiles as foundation
- Next develop map and venue discovery (core value proposition)
- Then add social connections and basic chat
- Follow with event functionality
- Finally implement location sharing with proper privacy controls

### Feature Refinement Logic
- Initially implement 70% of each feature's capability
- Focus on core functionality over edge cases
- Prioritize user safety and data privacy features
- Leave complex optimizations for Phase 2

## Feature Flag Implementation
## Feature Flag Specification

NightBFF implements a comprehensive feature flagging system to control feature visibility and behavior across development phases. This allows for gradual rollout of functionality, A/B testing, and operating environment-specific configurations.

### Feature Flag Inventory

#### Phase 1 Core Feature Flags

| Flag Name | Description | Default Values by Environment |
|-----------|-------------|-----------------------------|
| `auth_social_login` | Controls social login options | Dev: true, Staging: true, Prod: true |
| `auth_age_verification` | Controls age verification requirement | Dev: false, Staging: true, Prod: true |
| `map_venue_discovery` | Controls map-based venue exploration | Dev: true, Staging: true, Prod: true |
| `event_creation` | Controls event creation functionality | Dev: true, Staging: true, Prod: true |
| `chat_messaging` | Controls messaging functionality | Dev: true, Staging: true, Prod: true |
| `social_connections` | Controls friend/follow functionality | Dev: true, Staging: true, Prod: true |
| `location_sharing` | Controls location sharing capability | Dev: true, Staging: true, Prod: true |
| `premium_preview` | Controls premium feature previews | Dev: true, Staging: true, Prod: true |

#### Phase 2 Feature Flags

| Flag Name | Description | Default Values by Environment |
|-----------|-------------|-----------------------------|
| `enhanced_feed` | Controls advanced social feed features | Dev: true, Staging: false, Prod: false |
| `gamification` | Controls points and badges system | Dev: true, Staging: false, Prod: false |
| `premium_subscription` | Controls paid subscription features | Dev: true, Staging: false, Prod: false |
| `enhanced_notifications` | Controls advanced notification system | Dev: true, Staging: false, Prod: false |
| `enhanced_venue_info` | Controls expanded venue information | Dev: true, Staging: false, Prod: false |
| `advanced_moderation` | Controls enhanced content moderation | Dev: true, Staging: false, Prod: false |
| `performance_optimizations` | Controls advanced performance features | Dev: true, Staging: true, Prod: false |

#### Phase 3 Feature Flags

| Flag Name | Description | Default Values by Environment |
|-----------|-------------|-----------------------------|
| `venue_owner_portal` | Controls venue management features | Dev: true, Staging: false, Prod: false |
| `analytics_dashboard` | Controls analytics reporting features | Dev: true, Staging: false, Prod: false |
| `in_app_purchasing` | Controls venue service purchases | Dev: true, Staging: false, Prod: false |
| `ai_recommendations` | Controls AI recommendation system | Dev: true, Staging: false, Prod: false |
| `multi_city_expansion` | Controls international features | Dev: true, Staging: false, Prod: false |
| `partner_api` | Controls external API access | Dev: true, Staging: false, Prod: false |

#### Cross-Phase Operational Flags

| Flag Name | Description | Default Values by Environment |
|-----------|-------------|-----------------------------|
| `maintenance_mode` | Enables system maintenance mode | Dev: false, Staging: false, Prod: false |
| `error_reporting_level` | Controls error reporting detail | Dev: 'verbose', Staging: 'normal', Prod: 'minimal' |
| `log_level` | Controls logging verbosity | Dev: 'debug', Staging: 'info', Prod: 'warn' |
| `analytics_sampling_rate` | Controls analytics data collection | Dev: 100, Staging: 50, Prod: 10 |

### Database Schema for Feature Flags

Feature flags are stored in the database using the following schema:

```sql
CREATE TABLE feature_flags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  phase INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_feature_flags (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  flag_name VARCHAR(100) REFERENCES feature_flags(name) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, flag_name)
);

CREATE INDEX idx_feature_flags_name ON feature_flags(name);
CREATE INDEX idx_user_feature_flags_user_id ON user_feature_flags(user_id);

Feature Flag Management Interface
The admin interface for managing feature flags should include:

Flag Overview Dashboard

List of all feature flags with current status
Filtering by phase, status, and category
Quick toggle capability for emergency changes


Flag Detail Management

Edit flag description and phase association
Configure environment-specific defaults
Set gradual rollout percentages
View flag change history


User Override Management

Assign flag overrides to specific users
Manage test groups for A/B testing
Bulk enable/disable for user segments


Monitoring & Analytics

Usage metrics per feature flag
Error rates associated with flags
Performance impact analysis
Conversion impact for premium features



Implementation Guidelines

1. Flag Consistency

Always check flags at service level, not in UI components
Cache flag values with appropriate TTL (1-5 minutes)
Implement flag change notification for critical flags
Handle flag changes gracefully without requiring refresh

2. Gradual Rollout
Use this algorithm for percentage-based rollout:

function shouldEnableForUser(flagName: string, userId: string, percentage: number): boolean {
  // Create a deterministic hash from flag name and user ID
  const hashInput = `${flagName}:${userId}`;
  const hashValue = createHash('md5').update(hashInput).digest('hex');
  
  // Convert first 4 bytes of hash to a number between 0-100
  const hashNumber = parseInt(hashValue.substring(0, 8), 16) % 100;
  
  // Enable if hash falls within the rollout percentage
  return hashNumber < percentage;
}

3.Flag Governance

Document approval process for flag changes in production
Require testing evidence for enabling flags in staging
Implement automatic reversion for problematic flags
Schedule regular flag cleanup for obsolete flags




## Technical Debt Management

### Debt Tracking
- Create and maintain a technical debt register in `TECH_DEBT.md`:
  ```markdown
  # Technical Debt Register

  ## Current Items

  | ID | Description | Impact | Difficulty | Created | Target Phase |
  |----|-------------|--------|------------|---------|--------------|
  | TD-1 | Location update batching not implemented | Battery drain | Medium | 2023-07-15 | Phase 2 |
  | TD-2 | Chat service lacks proper error recovery | Message loss | High | 2023-07-20 | Phase 1 |
  
  ## Resolved Items

  | ID | Description | Resolution | Resolved Date |
  |----|-------------|------------|--------------|
  | TD-0 | Temporary auth token storage | Implemented secure storage | 2023-07-10 |
  ```

### Acceptable Debt Guidelines
- Technical debt is acceptable when:
  - It unblocks delivery of high-priority features
  - It exists in non-critical paths
  - It has a clear remediation plan
  - It doesn't compromise security or data privacy
  - It's properly documented

### Debt Resolution Strategy
- Allocate 20% of each sprint to debt reduction
- Prioritize debt items that:
  1. Block important new features
  2. Affect user experience
  3. Create security or privacy risks
  4. Increase ongoing maintenance costs
- Document debt resolutions thoroughly

## Feature Extension Patterns

### Progressive Enhancement
- Design Phase 1 features with extension points for Phase 2:
  ```typescript
  // Phase 1 implementation with extension points
  export class VenueDiscoveryService {
    constructor(
      private readonly venueRepository: VenueRepository,
      private readonly featureFlagService: FeatureFlagService,
      private readonly cacheService: CacheService,
      // Extension point: Additional services can be injected here in Phase 2
    ) {}
    
    async findNearbyVenues(params: NearbyVenueParams): Promise<Venue[]> {
      // Core implementation
      const venues = await this.venueRepository.findNearby(params);
      
      // Extension point: Apply additional filtering
      return this.applyFilters(venues, params);
    }
    
    // Extension point: Method designed for override in Phase 2
    protected async applyFilters(venues: Venue[], params: NearbyVenueParams): Promise<Venue[]> {
      // Basic filtering in Phase 1
      return venues.filter(venue => this.matchesBasicCriteria(venue, params));
    }
  }
  
  // Phase 2 extension
  export class EnhancedVenueDiscoveryService extends VenueDiscoveryService {
    constructor(
      venueRepository: VenueRepository,
      featureFlagService: FeatureFlagService,
      cacheService: CacheService,
      private readonly userPreferenceService: UserPreferenceService,
      private readonly popularityService: VenuePopularityService
    ) {
      super(venueRepository, featureFlagService, cacheService);
    }
    
    // Override extension point with enhanced implementation
    protected async applyFilters(venues: Venue[], params: NearbyVenueParams): Promise<Venue[]> {
      // Get basic filtered venues
      const basicFiltered = await super.applyFilters(venues, params);
      
      // Apply enhanced filtering
      const userPreferences = await this.userPreferenceService.getVenuePreferences(params.userId);
      const popularityData = await this.popularityService.getRealtimePopularity(
        basicFiltered.map(v => v.id)
      );
      
      return this.applyEnhancedRanking(basicFiltered, userPreferences, popularityData);
    }
  }
  ```

### Phase Transition Planning
- For each Phase 1 feature, document planned Phase 2 enhancements
- Design database schemas to support future requirements
- Use interface contracts that anticipate future capabilities
- Include extension hooks in core components
- Document transition dependencies between features

### Implementation Guidelines
- Maintain backward compatibility during enhancements
- Implement feature versioning for breaking changes
- Use adapter patterns for significant refactorings
- Provide migration paths for user data
- Implement gradual rollout for significant changes
