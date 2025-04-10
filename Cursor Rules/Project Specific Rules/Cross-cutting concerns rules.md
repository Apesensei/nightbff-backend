# Rule Set 10: NightBFF Cross-cutting Concerns

## Accessibility Implementation Standards

### Visual Accessibility

1. **Contrast and Color Requirements**
   - Maintain minimum contrast ratios:
     - 4.5:1 for normal text
     - 3:1 for large text (18pt+)
     - 3:1 for UI components and graphical objects
   - Implement a dedicated "Night Mode" theme optimized for dark environments:
     - Use darker backgrounds with light text
     - Avoid pure white text on pure black backgrounds (use off-white/dark gray instead)
     - Maintain higher contrast for critical UI elements
   - Never rely solely on color to convey information:
     - Add icons or text labels alongside color indicators
     - Use patterns or shapes in addition to colors for map elements
     - Include text descriptions for status indicators

2. **Text Readability**
   - Support dynamic text sizing:
     - Use relative text sizing (em, rem) not absolute (px)
     - Test with system font size settings at 150% and 200%
     - Ensure layouts adapt to larger text without breaking
   - Implement proper text scaling:
     ```typescript
     // Text scaling utility
     import { PixelRatio, Dimensions } from 'react-native';
     
     const { width } = Dimensions.get('window');
     const baseWidth = 375; // Base width for design
     
     export function normalize(size: number): number {
       const scale = width / baseWidth;
       const newSize = size * scale;
       return Math.round(PixelRatio.roundToNearestPixel(newSize));
     }
     
     // Component usage
     const styles = StyleSheet.create({
       heading: {
         fontSize: normalize(24),
         lineHeight: normalize(32),
       },
     });
     ```
   - Use appropriate line height (1.5x font size) for better readability
   - Limit line length to improve readability (maximum 70-80 characters per line)

3. **Focus and Interactive Elements**
   - Implement visible focus indicators for all interactive elements:
     - Use distinct focus styles for keyboard navigation
     - Ensure focus indicators are clearly visible in both light and dark themes
   - Size touch targets appropriately:
     - Minimum 44×44 points for all touch targets
     - Provide adequate spacing between interactive elements (minimum 8px)
     - Make touch targets expand to fill their container when possible

### Screen Reader Support

1. **Semantic Structure**
   - Use proper semantic components:
     - Use `<Button>` for clickable actions, not `<TouchableOpacity>` with text
     - Use headings (`<Text accessibilityRole="header">`) for section titles
     - Use proper list markup for lists
   - Implement correct tab order that follows visual flow
   - Group related elements appropriately

2. **Accessibility Properties**
   - Add appropriate accessibility attributes to all UI elements:
     ```typescript
     <TouchableOpacity
       accessible={true}
       accessibilityLabel="Add a new event"
       accessibilityHint="Opens the event creation form"
       accessibilityRole="button"
       accessibilityState={{ disabled: isDisabled }}
       onPress={handlePress}
     >
       <Icon name="calendar-plus" />
     </TouchableOpacity>
     ```
   - Ensure images have meaningful alternative text:
     - Descriptive alt text for informational images
     - Empty alt text for decorative images
     - Context-specific descriptions for functional images
   - Announce dynamic content changes:
     ```typescript
     // Announce when new message arrives
     React.useEffect(() => {
       if (messages.length > 0 && previousMessageCount < messages.length) {
         const newMessage = messages[messages.length - 1];
         AccessibilityInfo.announceForAccessibility(
           `New message from ${newMessage.sender}: ${newMessage.text}`
         );
       }
       setPreviousMessageCount(messages.length);
     }, [messages, previousMessageCount]);
     ```

3. **Custom Components**
   - Implement custom component accessibility:
     ```typescript
     // Custom slider with accessibility
     const CustomSlider = ({ value, min, max, onChange, label }) => {
       return (
         <View>
           <Text>{label}</Text>
           <View
             accessible={true}
             accessibilityLabel={`${label}: ${value} of ${max}`}
             accessibilityRole="adjustable"
             accessibilityValue={{
               min,
               max,
               now: value,
             }}
             accessibilityActions={[
               { name: 'increment', label: 'increase' },
               { name: 'decrement', label: 'decrease' },
             ]}
             onAccessibilityAction={(event) => {
               switch (event.nativeEvent.actionName) {
                 case 'increment':
                   onChange(Math.min(value + 1, max));
                   break;
                 case 'decrement':
                   onChange(Math.max(value - 1, min));
                   break;
               }
             }}
           >
             {/* Slider implementation */}
           </View>
         </View>
       );
     };
     ```
   - Test custom components with screen readers (VoiceOver, TalkBack)
   - Ensure state changes are properly announced

### Input Modality Support

1. **Multiple Input Methods**
   - Support both touch and keyboard navigation:
     - Implement keyboard focus management
     - Ensure all interactive elements can be accessed via keyboard
     - Support standard keyboard shortcuts where appropriate
   - Implement custom gesture recognizers with alternatives:
     - Provide button alternatives for gesture actions
     - Ensure critical features aren't exclusively gesture-based
     - Include visible UI hints for available gestures

2. **Form Accessibility**
   - Implement accessible form controls:
     - Associate labels with inputs using `accessibilityLabelledBy`
     - Group related form fields
     - Provide clear error messages
     - Support autocomplete where appropriate
   - Validate inputs with clear feedback:
     - Show validation errors inline
     - Use both color and text/icons to indicate errors
     - Announce errors to screen readers

## Security Implementation Standards

### Authentication and Authorization

1. **Token Management**
   - Implement secure JWT handling:
     - Store tokens in secure storage (Keychain for iOS, EncryptedSharedPreferences for Android)
     - Implement proper token refresh mechanisms
     - Include token rotation on suspicious activity
     - Set appropriate token expiration times (access: 15 minutes, refresh: 7 days)
   - Implement proper logout procedures:
     ```typescript
     async function logout() {
       try {
         // Clear tokens from secure storage
         await SecureStore.deleteItemAsync('accessToken');
         await SecureStore.deleteItemAsync('refreshToken');
         
         // Invalidate token on server
         await authService.revokeToken();
         
         // Clear local state
         dispatch({ type: 'LOGOUT' });
         
         // Clear sensitive cached data
         await AsyncStorage.multiRemove([
           'user_preferences',
           'recent_searches',
           'chat_drafts'
         ]);
         
         // Navigate to login
         navigation.reset({
           index: 0,
           routes: [{ name: 'Login' }],
         });
       } catch (error) {
         // Force logout even if server request fails
         dispatch({ type: 'LOGOUT' });
         navigation.reset({
           index: 0,
           routes: [{ name: 'Login' }],
         });
       }
     }
     ```

2. **Authorization Controls**
   - Implement row-level security (RLS) in Supabase:
     ```sql
     -- RLS policy for user profiles
     CREATE POLICY "Users can view their own profile"
       ON profiles
       FOR SELECT
       USING (auth.uid() = user_id);
     
     CREATE POLICY "Users can update their own profile"
       ON profiles
       FOR UPDATE
       USING (auth.uid() = user_id);
     ```
   - Implement proper permission checks in services:
     ```typescript
     async function updateEvent(userId: string, eventId: string, data: UpdateEventDto): Promise<Event> {
       // Fetch event with creator info
       const event = await this.eventRepository.findOne({
         where: { id: eventId },
       });
       
       if (!event) {
         throw new NotFoundException('Event not found');
       }
       
       // Check authorization
       if (event.creatorId !== userId) {
         throw new ForbiddenException('You can only update events you created');
       }
       
       // Proceed with update
       return this.eventRepository.update(eventId, data);
     }
     ```
   - Validate permissions on both client and server sides
   - Implement feature-based authorization for premium features
   
   ## Privacy Implementation Guidelines

### Location Data Privacy

1. **Location Fuzzing Algorithms**
   - Implement precise fuzzing based on relationship proximity:
     ```typescript
     export class LocationFuzzingService {
       /**
        * Applies appropriate location fuzzing based on privacy settings and relationship
        * @param rawLocation The user's actual location
        * @param privacyLevel The user's selected privacy level
        * @param relationship The relationship between the viewing user and the location owner
        * @returns Fuzzed location or null if location should be hidden
        */
       fuzzLocation(
         rawLocation: GeoPoint, 
         privacyLevel: PrivacyLevel,
         relationship: RelationshipType
       ): GeoPoint | null {
         // Apply privacy level checks
         switch (privacyLevel) {
           case PrivacyLevel.PRECISE:
             if (relationship === RelationshipType.CLOSE_FRIEND) {
               return rawLocation; // Provide exact location to close friends
             }
             return this.applyMinimalFuzzing(rawLocation, relationship);
             
           case PrivacyLevel.NEIGHBORHOOD:
             if (relationship === RelationshipType.BLOCKED) {
               return null; // No location for blocked users
             }
             return this.applyNeighborhoodFuzzing(rawLocation);
             
           case PrivacyLevel.CITY:
             if (relationship === RelationshipType.BLOCKED) {
               return null;
             }
             return this.applyCityLevelFuzzing(rawLocation);
             
           case PrivacyLevel.PRIVATE:
             return null; // Don't share location at all
             
           default:
             return this.applyMinimalFuzzing(rawLocation, relationship);
         }
       }
       
       /**
        * Applies minimal fuzzing (50-200m) for close relationships
        */
       private applyMinimalFuzzing(location: GeoPoint, relationship: RelationshipType): GeoPoint {
         // Determine fuzzing radius based on relationship
         const fuzzingRadius = this.getFuzzingRadiusByRelationship(relationship);
         
         // Generate random angle and distance within radius
         const angle = Math.random() * 2 * Math.PI;
         const distance = Math.random() * fuzzingRadius;
         
         // Convert meters to approximately degrees
         // 111,111 meters = 1 degree of latitude
         const latOffset = (distance * Math.cos(angle)) / 111111;
         // Longitude degrees vary based on latitude
         const lngOffset = (distance * Math.sin(angle)) / 
           (111111 * Math.cos(location.latitude * Math.PI / 180));
         
         return {
           latitude: location.latitude + latOffset,
           longitude: location.longitude + lngOffset
         };
       }
       
       /**
        * Applies neighborhood-level fuzzing (500-800m)
        */
       private applyNeighborhoodFuzzing(location: GeoPoint): GeoPoint {
         // Snap to neighborhood grid (approximately 800m)
         const gridSize = 0.007; // ~800m
         
         return {
           latitude: Math.floor(location.latitude / gridSize) * gridSize + (gridSize / 2),
           longitude: Math.floor(location.longitude / gridSize) * gridSize + (gridSize / 2)
         };
       }
       
       /**
        * Applies city-level fuzzing (several km)
        */
       private applyCityLevelFuzzing(location: GeoPoint): GeoPoint {
         // Snap to city grid (approximately 5km)
         const gridSize = 0.045; // ~5km
         
         return {
           latitude: Math.floor(location.latitude / gridSize) * gridSize + (gridSize / 2),
           longitude: Math.floor(location.longitude / gridSize) * gridSize + (gridSize / 2)
         };
       }
       
       /**
        * Determines appropriate fuzzing radius based on relationship type
        */
       private getFuzzingRadiusByRelationship(relationship: RelationshipType): number {
         switch (relationship) {
           case RelationshipType.CLOSE_FRIEND:
             return 50; // 50m for close friends
           case RelationshipType.FRIEND:
             return 200; // 200m for friends
           case RelationshipType.FOLLOWING:
             return 500; // 500m for following
           case RelationshipType.NONE:
             return 800; // 800m for no relationship
           default:
             return 500; // Default fuzzing
         }
       }
     }
     ```

2. **Storage and Retention**
   - Implement tiered storage and retention policy:
     ```typescript
     @Injectable()
     export class LocationRetentionService {
       constructor(
         private readonly locationRepository: LocationRepository,
         private readonly configService: ConfigService,
         private readonly loggerService: LoggerService
       ) {}
       
       /**
        * Stores location with appropriate retention metadata
        */
       async storeLocation(userId: string, location: GeoPoint, metadata: LocationMetadata): Promise<void> {
         // Determine retention period based on location type
         const retentionPeriod = this.getRetentionPeriod(metadata.locationType);
         
         // Calculate expiration time
         const expiresAt = new Date();
         expiresAt.setSeconds(expiresAt.getSeconds() + retentionPeriod);
         
         // Store precise location with expiration
         await this.locationRepository.savePreciseLocation({
           userId,
           latitude: location.latitude,
           longitude: location.longitude,
           accuracy: metadata.accuracy,
           source: metadata.source,
           timestamp: new Date(),
           expiresAt
         });
         
         // Also store fuzzy location for longer-term analytics
         await this.locationRepository.saveFuzzyLocation({
           userId,
           gridId: this.calculateGridId(location, 5000), // 5km grid
           timestamp: new Date()
         });
       }
       
       /**
        * Purges expired location data
        */
       @Cron('0 0 * * * *') // Run hourly
       async purgeExpiredLocations(): Promise<void> {
         try {
           const now = new Date();
           const result = await this.locationRepository.deleteExpiredLocations(now);
           
           this.loggerService.info(`Purged ${result.count} expired location records`);
         } catch (error) {
           this.loggerService.error('Failed to purge expired locations', {
             error: error.message,
             stack: error.stack
           });
         }
       }
       
       /**
        * Determines retention period based on location type
        */
       private getRetentionPeriod(locationType: LocationType): number {
         switch (locationType) {
           case LocationType.PRECISE_REALTIME:
             return 3600; // 1 hour for real-time precise locations
           case LocationType.CHECK_IN:
             return 86400 * 7; // 7 days for check-ins
           case LocationType.BACKGROUND:
             return 43200; // 12 hours for background locations
           default:
             return 86400; // 24 hours default
         }
       }
       
       /**
        * Calculates grid ID for given location and grid size
        */
       private calculateGridId(location: GeoPoint, gridSizeMeters: number): string {
         // Convert grid size from meters to approximate degrees
         const gridSize = gridSizeMeters / 111111;
         
         // Calculate grid coordinates
         const latGrid = Math.floor(location.latitude / gridSize);
         const lngGrid = Math.floor(location.longitude / gridSize);
         
         // Return grid ID as string
         return `${latGrid}:${lngGrid}`;
       }
     }
     ```

### Data Anonymization

1. **Analytics Anonymization**
   - Implement data anonymization for analytics:
     ```typescript
     @Injectable()
     export class AnalyticsAnonymizationService {
       constructor(
         private readonly configService: ConfigService,
         private readonly cryptoService: CryptoService
       ) {}
       
       /**
        * Anonymizes user data for analytics
        */
       anonymizeForAnalytics(userData: UserAnalyticsData): AnonymizedAnalyticsData {
         const { userId, email, deviceId, ipAddress, ...safeData } = userData;
         
         // Generate consistent anonymous ID using HMAC
         const anonymousId = this.generateAnonymousId(userId);
         
         // Generate session ID that changes daily
         const sessionId = this.generateSessionId(userId, deviceId);
         
         // Anonymize location data if present
         const location = userData.location ? this.anonymizeLocation(userData.location) : undefined;
         
         // Generate coarse age bucket if birth date present
         const ageBucket = userData.birthDate ? this.getAgeBucket(userData.birthDate) : undefined;
         
         return {
           anonymousId,
           sessionId,
           location,
           ageBucket,
           ...safeData
         };
       }
       
       /**
        * Generates consistent anonymous ID for a user
        */
       private generateAnonymousId(userId: string): string {
         // Use HMAC with secret key for consistent hashing
         const secret = this.configService.get('ANALYTICS_ANONYMIZATION_KEY');
         return this.cryptoService.hmac(userId, secret);
       }
       
       /**
        * Generates session ID that changes daily to prevent long-term tracking
        */
       private generateSessionId(userId: string, deviceId: string): string {
         // Use date string for daily rotation
         const dateString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
         const input = `${userId}:${deviceId}:${dateString}`;
         
         // Hash with session-specific key
         const sessionKey = this.configService.get('SESSION_ANONYMIZATION_KEY');
         return this.cryptoService.hmac(input, sessionKey);
       }
       
       /**
        * Anonymizes location to city level
        */
       private anonymizeLocation(location: GeoPoint): AnonymizedLocation {
         // Truncate to ~10km precision (remove last two decimal places)
         const truncatedLat = Math.floor(location.latitude * 100) / 100;
         const truncatedLng = Math.floor(location.longitude * 100) / 100;
         
         return {
           latitude: truncatedLat,
           longitude: truncatedLng,
           precision: '10km'
         };
       }
       
       /**
        * Converts birth date to age bucket
        */
       private getAgeBucket(birthDate: string): string {
         const today = new Date();
         const birth = new Date(birthDate);
         
         const age = today.getFullYear() - birth.getFullYear();
         
         // Create age buckets: 21-25, 26-30, 31-35, etc.
         const bucketSize = 5;
         const bucketStart = Math.floor(age / bucketSize) * bucketSize;
         const bucketEnd = bucketStart + bucketSize - 1;
         
         return `${bucketStart}-${bucketEnd}`;
       }
     }
     ```

### GDPR/CCPA Compliance

1. **Consent Management Implementation**
   - Implement granular consent tracking:
     ```typescript
     @Injectable()
     export class ConsentManagementService {
       constructor(
         private readonly consentRepository: ConsentRepository,
         private readonly userRepository: UserRepository,
         private readonly loggerService: LoggerService
       ) {}
       
       /**
        * Records user consent for specific purpose
        */
       async recordConsent(
         userId: string, 
         purpose: ConsentPurpose,
         granted: boolean,
         metadata: ConsentMetadata
       ): Promise<void> {
         try {
           // Record consent with audit trail
           await this.consentRepository.saveConsent({
             userId,
             purpose,
             granted,
             ipAddress: metadata.ipAddress,
             userAgent: metadata.userAgent,
             consentVersion: metadata.consentVersion,
             timestamp: new Date()
           });
           
           // Update user profile flags if needed
           if (purpose === ConsentPurpose.MARKETING) {
             await this.userRepository.updateMarketingPreferences(userId, { 
               email: granted 
             });
           }
           
           this.loggerService.info('User consent recorded', {
             userId,
             purpose,
             granted,
             consentVersion: metadata.consentVersion
           });
         } catch (error) {
           this.loggerService.error('Failed to record user consent', {
             userId,
             purpose,
             error: error.message
           });
           throw error;
         }
       }
       
       /**
        * Checks if user has consented to specific purpose
        */
       async hasConsented(userId: string, purpose: ConsentPurpose): Promise<boolean> {
         try {
           // Get latest consent record for purpose
           const latestConsent = await this.consentRepository.getLatestConsent(userId, purpose);
           
           if (!latestConsent) {
             return false; // No consent record found
           }
           
           return latestConsent.granted;
         } catch (error) {
           this.loggerService.error('Failed to check user consent', {
             userId,
             purpose,
             error: error.message
           });
           return false; // Fail closed (assume no consent on error)
         }
       }
       
       /**
        * Processes data subject access request
        */
       async processDataSubjectRequest(
         userId: string,
         requestType: DataSubjectRequestType
       ): Promise<DataSubjectRequestResult> {
         try {
           switch (requestType) {
             case DataSubjectRequestType.ACCESS:
               return this.processAccessRequest(userId);
               
             case DataSubjectRequestType.DELETION:
               return this.processDeletionRequest(userId);
               
             case DataSubjectRequestType.PORTABILITY:
               return this.processPortabilityRequest(userId);
               
             default:
               throw new Error(`Unsupported request type: ${requestType}`);
           }
         } catch (error) {
           this.loggerService.error('Failed to process data subject request', {
             userId,
             requestType,
             error: error.message
           });
           throw error;
         }
       }
       
       // Implementation of the request processing methods...
     }
     ```

2. **Data Export Implementation**
   - Implement comprehensive data export:
     ```typescript
     @Injectable()
     export class DataExportService {
       constructor(
         private readonly userRepository: UserRepository,
         private readonly postRepository: PostRepository,
         private readonly eventRepository: EventRepository,
         private readonly messageRepository: MessageRepository,
         private readonly locationRepository: LocationRepository,
         private readonly loggerService: LoggerService
       ) {}
       
       /**
        * Generates complete data export for user
        */
       async generateUserDataExport(userId: string): Promise<UserDataExport> {
         this.loggerService.info('Starting user data export', { userId });
         
         try {
           // Collect all user data in parallel
           const [
             user,
             posts,
             events,
             messages,
             locations,
             connections
           ] = await Promise.all([
             this.userRepository.findById(userId),
             this.postRepository.findByAuthor(userId),
             this.eventRepository.findByCreator(userId),
             this.messageRepository.findBySender(userId),
             this.locationRepository.findByUser(userId),
             this.userRepository.getUserConnections(userId)
           ]);
           
           // Format export with metadata
           const export: UserDataExport = {
             metadata: {
               exportDate: new Date().toISOString(),
               userId,
               exportVersion: '1.0'
             },
             personalData: this.formatPersonalData(user),
             content: this.formatUserContent(posts, events),
             communications: this.formatCommunications(messages, connections),
             locationHistory: this.formatLocationHistory(locations)
           };
           
           this.loggerService.info('User data export completed', { userId });
           
           return export;
         } catch (error) {
           this.loggerService.error('Failed to generate user data export', {
             userId,
             error: error.message
           });
           throw error;
         }
       }
       
       /**
        * Format personal data for export
        */
       private formatPersonalData(user: User): PersonalDataExport {
         return {
           profile: {
             username: user.username,
             email: user.email,
             displayName: user.displayName,
             bio: user.bio,
             birthDate: user.birthDate,
             phoneNumber: user.phoneNumber,
             createdAt: user.createdAt.toISOString()
           },
           settings: {
             privacy: user.privacySettings,
             notifications: user.notificationSettings,
             preferences: user.preferences
           },
           subscription: user.subscription ? {
             plan: user.subscription.plan,
             status: user.subscription.status,
             startDate: user.subscription.startDate.toISOString(),
             endDate: user.subscription.endDate?.toISOString()
           } : undefined
         };
       }
       
       // Other formatting methods...
     }
     ```

### Privacy Testing Guidelines

1. **Privacy Test Implementation**
   - Implement specific privacy tests:
     ```typescript
     describe('Location Privacy', () => {
       let locationPrivacyService: LocationPrivacyService;
       let userService: UserService;
       
       beforeEach(async () => {
         // Setup test module with mocks
       });
       
       describe('fuzzLocation', () => {
         it('should return exact location for close friends with precise privacy', async () => {
           // Arrange
           const userLocation = { latitude: 40.7128, longitude: -74.0060 };
           const relationship = RelationshipType.CLOSE_FRIEND;
           const privacyLevel = PrivacyLevel.PRECISE;
           
           // Act
           const result = locationPrivacyService.fuzzLocation(userLocation, privacyLevel, relationship);
           
           // Assert
           expect(result).toEqual(userLocation);
         });
         
         it('should apply minimal fuzzing for friends with precise privacy', async () => {
           // Arrange
           const userLocation = { latitude: 40.7128, longitude: -74.0060 };
           const relationship = RelationshipType.FRIEND;
           const privacyLevel = PrivacyLevel.PRECISE;
           
           // Act
           const result = locationPrivacyService.fuzzLocation(userLocation, privacyLevel, relationship);
           
           // Assert - location should be fuzzed but within 200m
           const distance = calculateDistance(userLocation, result);
           expect(distance).toBeLessThanOrEqual(200);
           expect(distance).toBeGreaterThan(0);
         });
         
         it('should return null location for blocked users regardless of privacy setting', async () => {
           // Arrange
           const userLocation = { latitude: 40.7128, longitude: -74.0060 };
           const relationship = RelationshipType.BLOCKED;
           
           // Test with different privacy levels
           const privacyLevels = [
             PrivacyLevel.PRECISE,
             PrivacyLevel.NEIGHBORHOOD,
             PrivacyLevel.CITY,
             PrivacyLevel.PRIVATE
           ];
           
           // Act & Assert
           for (const level of privacyLevels) {
             const result = locationPrivacyService.fuzzLocation(userLocation, level, relationship);
             expect(result).toBeNull();
           }
         });
         
         it('should enforce neighborhood-level fuzzing for NEIGHBORHOOD privacy level', async () => {
           // Arrange
           const userLocation = { latitude: 40.7128, longitude: -74.0060 };
           const privacyLevel = PrivacyLevel.NEIGHBORHOOD;
           
           // Test with different relationships
           const validRelationships = [
             RelationshipType.CLOSE_FRIEND,
             RelationshipType.FRIEND,
             RelationshipType.FOLLOWING,
             RelationshipType.NONE
           ];
           
           // Act & Assert
           for (const relationship of validRelationships) {
             const result = locationPrivacyService.fuzzLocation(userLocation, privacyLevel, relationship);
             
             // Verify result is not null
             expect(result).not.toBeNull();
             
             // Verify result is fuzzed to neighborhood level (should be on consistent grid)
             const gridSize = 0.007; // ~800m
             
             expect(result.latitude % gridSize).toBeCloseTo(gridSize / 2, 10);
             expect(result.longitude % gridSize).toBeCloseTo(gridSize / 2, 10);
           }
         });
       });
       
       describe('Location Retention', () => {
         it('should expire precise locations after appropriate retention period', async () => {
           // Test code for retention periods...
         });
       });
     });
     
     // Privacy penetration tests
     describe('Privacy Penetration Tests', () => {
       // Attempt to bypass privacy controls
       it('should not allow URL parameter pollution to access private data', async () => {
         // Test code...
       });
       
       // Test for information leakage
       it('should not leak user location through error messages', async () => {
         // Test code...
       });
       
       // Test third-party data sharing
       it('should anonymize data before sending to analytics', async () => {
         // Test code...
       });
     });
     ```

2. **Consent Flow Testing**
   - Validate consent flows:
     ```typescript
     describe('Consent Management', () => {
       let consentService: ConsentManagementService;
       
       beforeEach(async () => {
         // Setup test module with mocks
       });
       
       describe('recordConsent', () => {
         it('should properly record affirmative consent with audit metadata', async () => {
           // Arrange
           const userId = 'test-user';
           const purpose = ConsentPurpose.LOCATION_SHARING;
           const granted = true;
           const metadata = {
             ipAddress: '192.168.1.1',
             userAgent: 'Test Browser 1.0',
             consentVersion: '2023-10-01'
           };
           
           const saveSpy = jest.spyOn(consentRepository, 'saveConsent');
           
           // Act
           await consentService.recordConsent(userId, purpose, granted, metadata);
           
           // Assert
           expect(saveSpy).toHaveBeenCalledWith({
             userId,
             purpose,
             granted,
             ipAddress: metadata.ipAddress,
             userAgent: metadata.userAgent,
             consentVersion: metadata.consentVersion,
             timestamp: expect.any(Date)
           });
         });
         
         it('should update user preferences when marketing consent is changed', async () => {
           // Test code for marketing preferences update...
         });
       });
       
       describe('hasConsented', () => {
         it('should return false when no consent record exists', async () => {
           // Test code...
         });
         
         it('should return the most recent consent value when multiple records exist', async () => {
           // Test code...
         });
       });
     });
     ```

### Data Protection

1. **Sensitive Data Handling**
   - Encrypt sensitive data at rest:
     - Use PostgreSQL column-level encryption for PII
     - Use client-side encryption for draft messages
     - Hash sensitive values where full value storage isn't needed
   - Implement proper data sanitization:
     - Sanitize all user input to prevent injection attacks
     - Use parameterized queries for all database operations
     - Implement proper output encoding to prevent XSS
   - Apply data minimization:
     - Only collect necessary information
     - Implement appropriate data retention policies
     - Provide data export and deletion functionality

2. **Secure Communication**
   - Enforce TLS for all API communication:
     - Require minimum TLS 1.2
     - Implement certificate pinning in mobile app
     - Implement proper certificate validation
   - Protect websocket connections:
     - Implement authentication for websocket connections
     - Apply message-level encryption for sensitive data
     - Include anti-replay protection

3. **Mobile-specific Protections**
   - Implement app security features:
     - Enable App Transport Security (iOS)
     - Block screenshots of sensitive screens
     - Implement secure clipboard handling
     - Prevent screen recording of sensitive content
   - Protect local data:
     ```typescript
     // Secure data storage utility
     import * as SecureStore from 'expo-secure-store';
     import * as Crypto from 'expo-crypto';
     
     export async function secureStore(key: string, value: string): Promise<void> {
       await SecureStore.setItemAsync(key, value, {
         keychainAccessible: SecureStore.WHEN_UNLOCKED,
       });
     }
     
     export async function secureRetrieve(key: string): Promise<string | null> {
       return SecureStore.getItemAsync(key);
     }
     
     export async function secureHash(value: string): Promise<string> {
       return Crypto.digestStringAsync(
         Crypto.CryptoDigestAlgorithm.SHA256,
         value
       );
     }
     ```

### Vulnerability Prevention

1. **Input Validation**
   - Implement consistent validation:
     - Validate all inputs on both client and server
     - Use DTOs with class-validator for backend validation
     - Implement form validation in React components
   - Apply strict type checking:
     - Use TypeScript's strict mode
     - Avoid type assertions (`as` keyword)
     - Validate data structure from external sources

2. **Rate Limiting and Abuse Prevention**
   - Implement rate limiting for sensitive operations:
     - Login attempts (max 5 per 15 minutes)
     - Password reset requests (max 3 per hour)
     - Account creation (max 3 per day per IP)
     - API requests (tier-based limits)
   - Implement protection against common attacks:
     - CSRF protection for all state-changing operations
     - Prevent parameter tampering with signed requests
     - Implement monitoring for suspicious activity

## Performance Optimization Guidelines

### Mobile Application Performance

1. **React Native Optimization**
   - Optimize render performance:
     - Use `React.memo()` for functional components
     - Implement `shouldComponentUpdate` for class components
     - Use the `useCallback` hook for event handlers
     - Use the `useMemo` hook for expensive computations
   - Manage component re-renders:
     ```typescript
     // Optimized component with memoization
     const VenueItem = React.memo(({ venue, onPress }) => {
       const handlePress = useCallback(() => {
         onPress(venue.id);
       }, [venue.id, onPress]);
       
       return (
         <TouchableOpacity onPress={handlePress}>
           <Text>{venue.name}</Text>
           <Text>{venue.distance} km away</Text>
         </TouchableOpacity>
       );
     });
     ```
   - Implement efficient list rendering:
     - Use `FlatList` instead of mapping arrays to components
     - Implement proper `keyExtractor` function
     - Use `getItemLayout` for fixed-size items
     - Implement list item recycling

2. **Asset Optimization**
   - Optimize images and media:
     - Use appropriate image formats (WebP for photos, SVG for icons)
     - Implement responsive image loading based on screen size
     - Compress and optimize all assets
     - Implement lazy loading for off-screen content
   - Manage asset loading:
     - Preload critical assets during app startup
     - Use asset caching with proper cache invalidation
     - Implement progressive loading for large assets

3. **Network Performance**
   - Optimize API requests:
     - Batch multiple requests where possible
     - Implement request deduplication
     - Use compression for request/response data
     - Implement proper caching headers
   - Implement efficient data synchronization:
     - Use delta updates instead of full data transfers
     - Implement background synchronization
     - Prioritize critical data during initial load
     - Implement offline-first architecture

4. **Memory Management**
   - Implement proper memory handling:
     - Clear large objects when not needed
     - Avoid memory leaks in event listeners
     - Implement proper cleanup in `useEffect` hooks
     - Monitor and optimize memory usage for large screens
   - Manage component lifecycle:
     ```typescript
     useEffect(() => {
       // Set up resources
       const subscription = someEventEmitter.addListener('event', handleEvent);
       
       // Clean up when component unmounts or dependencies change
       return () => {
         subscription.remove();
         // Clear any cached data no longer needed
         imageCache.clear();
       };
     }, [dependencies]);
     ```

### Backend Performance

1. **Database Optimization**
   - Optimize database queries:
     - Use appropriate indexes for common queries
     - Implement query optimization for complex operations
     - Use database-level filtering instead of application filtering
     - Implement efficient pagination
   - Manage database connections:
     - Use connection pooling with appropriate pool size
     - Implement proper connection cleanup
     - Monitor connection usage and timeout settings
     - Implement query timeout protection

2. **API Performance**
   - Optimize API responses:
     - Implement response compression (gzip/brotli)
     - Return only required fields (projection)
     - Use appropriate data serialization
     - Implement versioned API responses
   - Manage API request processing:
     ```typescript
     @Get('venues/nearby')
     @UseInterceptors(CacheInterceptor)
     @CacheTTL(300) // 5 minutes cache
     async getNearbyVenues(
       @Query('lat') latitude: number,
       @Query('lng') longitude: number,
       @Query('radius') radius: number
     ): Promise<VenueDto[]> {
       const startTime = performance.now();
       
       try {
         const results = await this.venueService.getNearbyVenues(latitude, longitude, radius);
         
         const processingTime = performance.now() - startTime;
         this.logger.log(`getNearbyVenues processing time: ${processingTime}ms`);
         
         if (processingTime > 300) {
           this.metricsService.recordSlowQuery('getNearbyVenues', processingTime);
         }
         
         return results;
       } catch (error) {
         this.logger.error(`Error in getNearbyVenues: ${error.message}`);
         throw error;
       }
     }
     ```

3. **Caching Strategy**
   - Implement multi-level caching:
     - In-memory caching for frequently accessed data
     - Redis caching for shared data across instances
     - CDN caching for static assets
     - Browser/client caching for application resources
   - Implement cache invalidation:
     - Use cache-busting for versioned assets
     - Implement TTL (time-to-live) for time-sensitive data
     - Implement cache dependencies for related data
     - Use cache tags for selective invalidation

4. **Real-time Optimization**
   - Optimize websocket connections:
     - Implement connection sharing across features
     - Use appropriate message compression
     - Implement batch updates for frequent changes
     - Optimize subscription payload size

## Error Handling and Logging Standards

### Error Handling Strategy

1. **Global Error Handling**
   - Implement consistent error handling:
     ```typescript
     // Backend global exception filter
     @Catch()
     export class GlobalExceptionFilter implements ExceptionFilter {
       constructor(private logger: LoggerService) {}
       
       catch(exception: unknown, host: ArgumentsHost) {
         const ctx = host.switchToHttp();
         const response = ctx.getResponse<Response>();
         const request = ctx.getRequest<Request>();
         
         // Determine status code and error details
         const status = this.getStatus(exception);
         const errorResponse = this.createErrorResponse(exception, request);
         
         // Log error with context
         this.logger.error({
           message: `Request failed: ${errorResponse.error.message}`,
           path: request.url,
           method: request.method,
           statusCode: status,
           userId: request.user?.id,
           timestamp: new Date().toISOString(),
           stack: exception instanceof Error ? exception.stack : undefined
         });
         
         // Send error response
         response.status(status).json(errorResponse);
       }
       
       private getStatus(exception: unknown): number {
         if (exception instanceof HttpException) {
           return exception.getStatus();
         }
         
         if (exception instanceof QueryFailedError) {
           return HttpStatus.BAD_REQUEST;
         }
         
         if (exception instanceof EntityNotFoundError) {
           return HttpStatus.NOT_FOUND;
         }
         
         return HttpStatus.INTERNAL_SERVER_ERROR;
       }
       
       private createErrorResponse(exception: unknown, request: Request): ErrorResponse {
         // Create structured error response
       }
     }
     ```
   - Mobile global error boundary:
     ```typescript
     class ErrorBoundary extends React.Component {
       state = { hasError: false, error: null, errorInfo: null };
       
       componentDidCatch(error, errorInfo) {
         this.setState({ hasError: true, error, errorInfo });
         
         // Log error to monitoring service
         errorMonitoringService.captureException(error, {
           extra: {
             componentStack: errorInfo.componentStack,
             currentScreen: this.props.currentScreen,
             userId: this.props.userId
           }
         });
       }
       
       render() {
         if (this.state.hasError) {
           return <ErrorFallback onReset={() => this.setState({ hasError: false })} />;
         }
         
         return this.props.children;
       }
     }
     ```

2. **Error Categorization**
   - Categorize errors for appropriate handling:
     - Validation errors (400): User input problems
     - Authentication errors (401): Missing or invalid credentials
     - Authorization errors (403): Permission issues
     - Resource errors (404): Missing resources
     - Conflict errors (409): Resource conflicts
     - Server errors (500): Internal system failures
   - Implement specific error classes:
     ```typescript
     // Domain-specific error classes
     export class VenueNotFoundError extends Error {
       constructor(venueId: string) {
         super(`Venue with ID ${venueId} not found`);
         this.name = 'VenueNotFoundError';
       }
     }
     
     export class InsufficientPermissionError extends Error {
       constructor(resource: string, action: string) {
         super(`You don't have permission to ${action} this ${resource}`);
         this.name = 'InsufficientPermissionError';
       }
     }
     ```

3. **User-Facing Error Handling**
   - Implement appropriate error presentation:
     - Use toast messages for non-critical errors
     - Use modal dialogs for blocking errors
     - Implement inline error messages for form validation
     - Provide clear error recovery paths
   - Include appropriate detail level:
     - Show user-friendly error messages
     - Include error codes for support references
     - Hide technical details in production
     - Provide troubleshooting guidance where appropriate

### Logging Strategy

1. **Structured Logging**
   - Implement JSON-structured logging:
     ```typescript
     // Backend logger service
     @Injectable()
     export class LoggerService {
       private logger = createLogger({
         format: format.combine(
           format.timestamp(),
           format.json()
         ),
         transports: [
           new transports.Console(),
           new transports.File({ filename: 'error.log', level: 'error' }),
           new transports.File({ filename: 'combined.log' })
         ]
       });
       
       log(message: string | Record<string, any>, context?: string): void {
         this.logger.info(this.formatMessage(message, context));
       }
       
       error(message: string | Record<string, any>, trace?: string, context?: string): void {
         this.logger.error(this.formatMessage(message, context, trace));
       }
       
       warn(message: string | Record<string, any>, context?: string): void {
         this.logger.warn(this.formatMessage(message, context));
       }
       
       private formatMessage(message: string | Record<string, any>, context?: string, trace?: string): any {
         if (typeof message === 'object') {
           return {
             ...message,
             context,
             trace,
             timestamp: new Date().toISOString()
           };
         }
         
         return {
           message,
           context,
           trace,
           timestamp: new Date().toISOString()
         };
       }
     }
     ```
   - Include consistent context with all logs:
     - Request ID for correlation
     - User ID (when authenticated)
     - Service/component name
     - Environment information
     - Timestamp in ISO 8601 format

2. **Log Levels and Usage**
   - Implement appropriate log levels:
     - ERROR: Application errors and exceptions
     - WARN: Potential issues that don't prevent operation
     - INFO: Important application events
     - DEBUG: Detailed information for debugging
     - TRACE: Highly detailed debugging information
   - Apply consistent usage patterns:
     ```typescript
     // Service method with proper logging
     async createEvent(userId: string, eventData: CreateEventDto): Promise<Event> {
       this.logger.debug('Creating event', { userId, eventTitle: eventData.title });
       
       try {
         // Validate input data
         this.validateEventData(eventData);
         
         // Business logic implementation
         const event = await this.eventsRepository.create({
           ...eventData,
           creatorId: userId,
           attendees: [{ userId, status: 'going', joinedAt: new Date() }]
         });
         
         this.logger.info('Event created', { 
           userId, 
           eventId: event.id, 
           eventTitle: event.title 
         });
         
         // Side effects after main operation
         await this.notificationsService.scheduleEventReminders(event.id);
         
         return event;
       } catch (error) {
         this.logger.error('Error creating event', { 
           userId, 
           eventTitle: eventData.title,
           error: error.message,
           stack: error.stack
         });
         
         throw this.mapToAppropriateException(error);
       }
     }
     ```

3. **Privacy and Security in Logs**
   - Implement logging data protection:
     - Never log passwords or authentication tokens
     - Mask sensitive data (e.g., phone numbers, emails)
     - Use data minimization in logs
     - Implement appropriate log retention policies
   - Use log field sanitization:
     ```typescript
     // Log sanitization utility
     function sanitizeLogData(data: Record<string, any>): Record<string, any> {
       const sensitiveFields = ['password', 'token', 'creditCard', 'ssn'];
       const result = { ...data };
       
       for (const key of Object.keys(result)) {
         if (sensitiveFields.includes(key.toLowerCase())) {
           result[key] = '[REDACTED]';
           continue;
         }
         
         if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
           result[key] = '[REDACTED]';
           continue;
         }
         
         if (typeof result[key] === 'object' && result[key] !== null) {
           result[key] = sanitizeLogData(result[key]);
         }
       }
       
       return result;
     }
     ```

4. **Log Analysis and Monitoring**
   - Implement log aggregation:
     - Centralize logs from all services
     - Implement log correlation across services
     - Enable search and filtering capabilities
     - Set up log-based alerts for critical issues
   - Implement log-based metrics:
     - Track error rates by service and endpoint
     - Monitor performance through timing logs
     - Track user journeys through application logs
     - Identify patterns in system behavior

### Telemetry and Monitoring

1. **Application Performance Monitoring**
   - Implement service instrumentation:
     - Track API response times
     - Monitor database query performance
     - Track external service call latency
     - Measure resource utilization (CPU, memory)
   - Implement client-side performance tracking:
     ```typescript
     // Performance monitoring for key user interactions
     function trackInteraction(name: string, operation: () => Promise<any>): Promise<any> {
       const startTime = performance.now();
       
       return operation()
         .then(result => {
           const duration = performance.now() - startTime;
           analyticsService.trackPerformance(name, duration);
           
           if (duration > PERFORMANCE_THRESHOLDS[name]) {
             analyticsService.trackEvent('slow_interaction', {
               name,
               duration,
               threshold: PERFORMANCE_THRESHOLDS[name]
             });
           }
           
           return result;
         })
         .catch(error => {
           analyticsService.trackError(name, error);
           throw error;
         });
     }
     
     // Usage
     async function loadVenueDetails(venueId: string): Promise<Venue> {
       return trackInteraction('venue_details_load', () => 
         venueService.getVenueDetails(venueId)
       );
     }
     ```

2. **Business Metrics**
   - Track key performance indicators:
     - User engagement metrics
     - Feature adoption rates
     - Conversion metrics for premium features
     - Social connection metrics
   - Implement funnel analysis:
     - Track user journey steps
     - Identify drop-off points
     - Measure conversion rates between steps
     - Track A/B test performance
