# Rule Set 7: NightBFF Domain-Specific Guidelines

## Tonight Mode Implementation

### Core Functionality
- Implement Tonight Mode as a special high-engagement state with enhanced real-time features:
  - More frequent location updates (every 1-2 minutes)
  - Live venue popularity indicators
  - Active friends' locations (with permission)
  - Enhanced real-time notifications
  - Quick-access controls for nightlife activities

### User Experience
- Transition the UI to a nightlife-optimized theme:
  - Dark theme with high contrast for nighttime visibility
  - Larger touch targets for easier interaction in social environments
  - Simplified navigation for potentially impaired coordination
  - Quick access to safety features

### Performance Optimization
- Implement battery-saving measures:
  - Adaptive location update frequency based on movement
  - Batch network requests to reduce radio usage
  - Efficient map rendering with limited area visibility
  - Background task prioritization

### Implementation Guidelines
```typescript
// Tonight Mode Activation
const activateTonightMode = () => {
  // UI theme change
  themeManager.setTheme('night');
  
  // Update location tracking frequency
  locationManager.setUpdateFrequency({
    foreground: 60000, // 1 minute
    background: 300000 // 5 minutes
  });
  
  // Enhance real-time subscriptions
  subscriptionManager.enableEnhancedSubscriptions();
  
  // Battery optimization settings
  performanceManager.setOptimizationLevel('balanced');
  
  // Notify relevant services
  notificationService.notifyTonightModeActive();
  friendService.notifyTonightModeActive();
  
  // Log analytics
  analyticsService.logEvent('tonight_mode_activated');
};
```

## Location Privacy Safeguards

### Location Fuzzing
- Implement location fuzzing algorithms to protect exact user locations:
  - Apply random offset within configurable radius (50-200m)
  - Use different precision levels based on relationship:
    - Precise for close friends (opt-in)
    - Neighborhood-level for connections
    - Venue-only for public sharing
  - Never reveal exact home/work locations

### Sharing Controls
- Implement granular location sharing permissions:
  - Global on/off toggle
  - Per-relationship type settings
  - Temporary sharing with expiration
  - "Tonight Only" mode that resets at end of night
  - Venue-only sharing option without precise location

### Data Handling
- Implement appropriate data retention policies:
  - Store precise locations for maximum 24 hours
  - Keep fuzzy location history for 30 days
  - Allow users to delete location history
  - Apply proper encryption for location data at rest
  - Include anonymization for analytics

### Implementation Example
```typescript
// Location privacy implementation
export class LocationPrivacyService {
  constructor(
    private userService: UserService,
    private privacySettingsRepository: PrivacySettingsRepository
  ) {}

  async getShareableLocation(userId: string, viewerId: string, rawLocation: GeoPoint): Promise<GeoPoint | null> {
    // Get relationship and privacy settings
    const relationship = await this.userService.getRelationship(userId, viewerId);
    const settings = await this.privacySettingsRepository.getLocationSettings(userId);
    
    // Check if sharing is enabled for this relationship
    if (!this.isSharingEnabledFor(relationship, settings)) {
      return null;
    }
    
    // Apply appropriate fuzzing based on relationship
    return this.applyFuzzing(rawLocation, relationship, settings);
  }
  
  private applyFuzzing(location: GeoPoint, relationship: RelationshipType, settings: PrivacySettings): GeoPoint {
    switch (relationship) {
      case 'close_friend':
        return settings.sharePreciseWithCloseFriends ? location : this.fuzzLocation(location, 200);
      case 'friend':
        return this.fuzzLocation(location, 400);
      case 'connection':
        return this.fuzzLocation(location, 800);
      default:
        return this.getAreaCentroid(location); // Return neighborhood center
    }
  }
  
  private fuzzLocation(location: GeoPoint, radiusMeters: number): GeoPoint {
    // Apply random offset within radius
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radiusMeters;
    
    // Calculate offset (simplified)
    const latOffset = distance * Math.cos(angle) / 111111;
    const lngOffset = distance * Math.sin(angle) / (111111 * Math.cos(location.latitude * Math.PI / 180));
    
    return {
      latitude: location.latitude + latOffset,
      longitude: location.longitude + lngOffset
    };
  }
}
```

## Age Verification Integration

### Verification Flow
- Implement a robust age verification flow:
  1. Initial self-declaration of birth date
  2. Explanation of why verification is required
  3. Document verification through Onfido:
     - ID document capture (passport, driver's license)
     - Selfie for biometric matching
     - Processing and verification
  4. Fallback options for verification failures
  5. Limited access during verification pending state

### Technical Implementation
- Integrate with Onfido API for document and face verification:
  ```typescript
  async function initiateVerification(userId: string): Promise<{ url: string }> {
    try {
      // Create an applicant in Onfido
      const applicant = await onfido.applicant.create({
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email
      });
      
      // Create a verification check
      const check = await onfido.check.create({
        applicant_id: applicant.id,
        report_names: ['document', 'facial_similarity']
      });
      
      // Create an SDK token
      const sdkToken = await onfido.sdkToken.generate({
        applicant_id: applicant.id,
        referrer: config.appDomains
      });
      
      // Store verification info
      await verificationRepository.create({
        userId,
        onfidoApplicantId: applicant.id,
        checkId: check.id,
        status: 'pending',
        createdAt: new Date()
      });
      
      return { url: sdkToken.url };
    } catch (error) {
      logger.error('Age verification initialization failed', error);
      throw new Error('Unable to start verification process');
    }
  }
  ```

### Privacy and Compliance
- Implement proper data handling for verification documents:
  - Transmit documents securely (TLS 1.2+)
  - Do not store raw document images
  - Delete verification data after successful verification
  - Maintain audit logs of verification processes
  - Comply with relevant data protection regulations

### User Experience
- Design verification UI to be clear and reassuring:
  - Explain privacy protections
  - Show verification status prominently
  - Provide help resources for common issues
  - Include clear failure recovery paths
  - Set appropriate expectations for processing time

## Social Connection Patterns

### Relationship Model
- Implement the social connection system with these relationship types:
  - Connection requests (pending)
  - Mutual connections (accepted)
  - Following relationships (one-way)
  - Blocked users (negative)
  - Close friends (enhanced privileges)

### Privacy Controls
- Associate appropriate visibility levels with relationship types:
  - Public profile information
  - Connection-only content
  - Close friend privileged content
  - Venue-specific temporary visibility
  - "Tonight Mode" enhanced visibility

### Implementation Guidelines
```typescript
// Social connection implementation
export class ConnectionService {
  constructor(
    private connectionRepository: ConnectionRepository,
    private notificationService: NotificationService,
    private activityService: ActivityService
  ) {}

  async requestConnection(userId: string, targetId: string, message?: string): Promise<Connection> {
    // Validate users exist and no blocking relationship
    await this.validateConnectionRequest(userId, targetId);
    
    // Check for existing connection
    const existing = await this.connectionRepository.findBetween(userId, targetId);
    if (existing) {
      throw new ConflictException('Connection already exists');
    }
    
    // Create connection request
    const connection = await this.connectionRepository.create({
      requesterId: userId,
      recipientId: targetId,
      status: 'pending',
      message,
      createdAt: new Date()
    });
    
    // Notify recipient
    await this.notificationService.notifyConnectionRequest(connection);
    
    // Log activity
    await this.activityService.logConnectionRequest(userId, targetId);
    
    return connection;
  }
  
  async acceptConnection(userId: string, connectionId: string): Promise<Connection> {
    const connection = await this.connectionRepository.findById(connectionId);
    
    // Validate connection exists and user is recipient
    if (!connection || connection.recipientId !== userId) {
      throw new NotFoundException('Connection request not found');
    }
    
    if (connection.status !== 'pending') {
      throw new BadRequestException('Connection already processed');
    }
    
    // Update connection status
    const updated = await this.connectionRepository.update(connectionId, {
      status: 'accepted',
      updatedAt: new Date()
    });
    
    // Notify requester
    await this.notificationService.notifyConnectionAccepted(updated);
    
    // Log activity
    await this.activityService.logConnectionAccepted(userId, connection.requesterId);
    
    return updated;
  }
}
```

### Content Visibility Rules
- Apply consistent content visibility rules across features:
  - Default to most restrictive visibility
  - Respect user privacy settings for all content
  - Implement visibility checking on both client and server
  - Cache permission results for performance
  - Update visibility when relationships change
