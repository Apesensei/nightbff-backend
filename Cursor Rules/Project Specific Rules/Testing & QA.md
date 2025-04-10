# Rule Set 9: NightBFF Testing & Quality Assurance Standards

## Unit Testing Patterns

### NestJS Backend Testing

All NestJS services and controllers require thorough unit testing following these principles:

1. **Test Structure Organization**
   - Create test files with naming pattern `*.spec.ts` adjacent to implementation files
   - Organize tests using nested `describe` blocks that mirror class structure
   - Group tests for each method in their own `describe` block
   - Use clear, behavior-describing test names following the pattern: "should [expected behavior] when [condition]"

2. **Mock Dependencies**
   - Create mock factories for repositories and services:
     ```typescript
     type MockType<T> = {
       [P in keyof T]: jest.Mock<unknown>;
     };
     
     const mockRepositoryFactory: () => MockType<Repository<any>> = jest.fn(() => ({
       find: jest.fn(),
       findOne: jest.fn(),
       create: jest.fn(),
       save: jest.fn(),
       update: jest.fn(),
       delete: jest.fn()
     }));
     ```
   - Use Jest's module mocking system to isolate units under test
   - Reset mocks between tests to prevent state leakage

3. **Test Setup Pattern**
   - Use NestJS `Test.createTestingModule()` for dependency injection
   - Inject mocked dependencies with appropriate providers
   - Initialize service/controller before each test
   - Reset all mocks between tests

4. **Assertion Structure**
   - Follow the Arrange-Act-Assert pattern:
     ```typescript
     it('should create an event and schedule notifications', async () => {
       // Arrange
       const userId = 'user-123';
       const eventData = { title: 'Test Event', startTime: new Date() };
       const createdEvent = { id: 'event-123', ...eventData, creatorId: userId };
       
       mockEventRepository.create.mockResolvedValue(createdEvent);
       
       // Act
       const result = await service.createEvent(userId, eventData);
       
       // Assert
       expect(mockEventRepository.create).toHaveBeenCalledWith(expect.objectContaining({
         title: eventData.title,
         creatorId: userId
       }));
       expect(mockNotificationService.scheduleEventReminders).toHaveBeenCalledWith('event-123');
       expect(result).toEqual(createdEvent);
     });
     ```
   - Test both success and failure paths
   - Verify all side effects and interactions with dependencies

### React Native Component Testing

React Native components require testing with React Testing Library following these principles:

1. **Rendering Tests**
   - Test that components render without crashing
   - Verify the presence of key elements and content
   - Test conditional rendering logic
   - Validate accessibility properties are correctly applied

2. **User Interaction Testing**
   - Test all interactive elements using `fireEvent`:
     ```typescript
     it('should call onPress when button is pressed', () => {
       // Arrange
       const onPressMock = jest.fn();
       const { getByText } = render(<Button label="Press Me" onPress={onPressMock} />);
       
       // Act
       fireEvent.press(getByText('Press Me'));
       
       // Assert
       expect(onPressMock).toHaveBeenCalledTimes(1);
     });
     ```
   - Test form inputs and validation behavior
   - Verify visual feedback for user interactions

3. **State Management Testing**
   - Test initial state is correctly set
   - Verify state updates after user interactions
   - Test conditional rendering based on state changes
   - Validate complex state transitions

4. **Hook Testing**
   - Create dedicated tests for custom hooks
   - Use the `renderHook` utility from `@testing-library/react-hooks`
   - Test hook behavior with various inputs
   - Verify side effects and cleanup

## Integration Testing Requirements

### Microservice Integration Tests

1. **Service-to-Service Communication**
   - Test API contracts between services
   - Verify correct request/response data structures
   - Test error handling and service recovery
   - Ensure backward compatibility during changes

2. **Database Integration**
   - Test repository implementations against real database (in test environment)
   - Verify complex queries execute correctly
   - Test transaction support and rollback behavior
   - Validate database migration scripts

3. **External API Integration**
   - Test third-party API integrations with appropriate mocking
   - Verify error handling for API failures
   - Test retry logic and circuit breaker behavior
   - Validate response parsing and mapping

4. **End-to-End Flows**
   - Test complete business processes spanning multiple services
   - Verify data consistency across service boundaries
   - Test event-driven communication patterns
   - Ensure proper error propagation

### Integration Test Implementation

```typescript
describe('Event Creation Integration', () => {
  let app: INestApplication;
  let userService: UserService;
  let eventRepository: Repository<Event>;
  let notificationService: NotificationService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        EventModule,
        UserModule,
        NotificationModule,
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5433,  // Test database port
          username: 'test',
          password: 'test',
          database: 'nightbff_test',
          entities: [Event, User, Notification],
          synchronize: true,
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    userService = moduleFixture.get<UserService>(UserService);
    eventRepository = moduleFixture.get<Repository<Event>>(getRepositoryToken(Event));
    notificationService = moduleFixture.get<NotificationService>(NotificationService);
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await eventRepository.clear();
    // Populate test data
  });

  it('should create event, update attendance, and send notifications', async () => {
    // Create test user
    const user = await userService.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });

    // Create event through API
    const response = await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${generateTestToken(user)}`)
      .send({
        title: 'Integration Test Event',
        description: 'Testing the full event creation flow',
        startTime: new Date(Date.now() + 86400000), // Tomorrow
        venue: 'Test Venue',
        isPrivate: false
      });

    expect(response.status).toBe(201);
    
    // Verify event in database
    const eventId = response.body.data.id;
    const savedEvent = await eventRepository.findOne({
      where: { id: eventId },
      relations: ['attendees']
    });
    
    expect(savedEvent).toBeDefined();
    expect(savedEvent.title).toBe('Integration Test Event');
    expect(savedEvent.attendees).toHaveLength(1);
    expect(savedEvent.attendees[0].userId).toBe(user.id);
    
    // Verify notification was sent
    const notifications = await notificationService.findForUser(user.id);
    expect(notifications.some(n => n.type === 'event_created' && n.entityId === eventId)).toBe(true);
  });
});
```

## End-to-End Testing Approach

### Testing Critical User Flows

The following user flows require comprehensive end-to-end testing:

1. **User Registration and Verification Flow**
   - New user registration
   - Email verification
   - Age verification process
   - Profile completion
   - Initial preference setup

2. **Nightlife Discovery Flow**
   - Map exploration
   - Venue discovery
   - Filtering and search
   - Venue details view
   - Check-in process

3. **Social Connection Flow**
   - User search and discovery
   - Connection request
   - Request acceptance
   - Privacy control verification
   - Content visibility based on relationship

4. **Event Creation and Participation Flow**
   - Event creation
   - Event discovery
   - RSVP process
   - Attendee management
   - Event updates and notifications

5. **Tonight Mode Experience Flow**
   - Tonight Mode activation
   - Enhanced location sharing
   - Real-time venue popularity
   - Friend location display
   - Mode deactivation and summary

### Mobile Testing with Detox

Implement end-to-end tests using Detox for React Native with these guidelines:

1. **Test Environment Setup**
   - Configure separate test environment with isolated database
   - Use test fixtures to pre-populate required data
   - Reset application state between test runs
   - Implement test-specific backend mocks for third-party services

2. **Test Structure**
   - Organize tests by user flows
   - Break flows into logical steps with descriptive names
   - Use the page object pattern to abstract UI interactions
   - Implement proper setup and teardown for each test

3. **Interaction Testing**
   - Test both tap and gesture interactions
   - Verify navigation between screens
   - Test form inputs and validation
   - Verify visual feedback and state changes

4. **Example Implementation**
   ```javascript
   describe('Venue Discovery Flow', () => {
     beforeAll(async () => {
       await device.launchApp({
         permissions: { location: 'always' },
         newInstance: true
       });
       await loginAsTestUser();
     });

     beforeEach(async () => {
       await device.reloadReactNative();
       await navigateToMapTab();
     });

     it('should show nearby venues on map', async () => {
       // Verify map loads with user location
       await expect(element(by.id('user-location-marker'))).toBeVisible();
       
       // Verify venue pins are visible
       await expect(element(by.id('venue-pin'))).toBeVisible();
       
       // Test map interaction
       await element(by.id('venue-pin')).tap();
       await expect(element(by.id('venue-preview-card'))).toBeVisible();
       
       // Test venue details navigation
       await element(by.id('venue-preview-card')).tap();
       await expect(element(by.id('venue-details-screen'))).toBeVisible();
       await expect(element(by.text('Test Venue'))).toBeVisible();
     });

     it('should filter venues by category', async () => {
       // Open filter modal
       await element(by.id('filter-button')).tap();
       await expect(element(by.id('filter-modal'))).toBeVisible();
       
       // Select category filter
       await element(by.text('Bars')).tap();
       await element(by.id('apply-filters-button')).tap();
       
       // Verify filtered results
       await expect(element(by.id('venue-pin-bar'))).toBeVisible();
       await expect(element(by.id('venue-pin-club'))).not.toBeVisible();
     });
   });
   ```

## Test-Driven Development Guidelines

### TDD Process for NightBFF Features

Follow this TDD cycle for all new feature development:

1. **Test Planning**
   - Analyze requirements from the PRD
   - Identify testable behaviors
   - Determine appropriate test levels (unit, integration, E2E)
   - Write test cases before implementation

2. **Test Implementation**
   - Write failing tests that validate required behavior
   - Ensure tests are readable and maintainable
   - Focus on behavior, not implementation details
   - Consider edge cases and error conditions

3. **Feature Implementation**
   - Implement minimum code to make tests pass
   - Refactor while maintaining passing tests
   - Add tests for new scenarios discovered during implementation
   - Maintain test coverage above 80% for business logic

4. **Test Coverage Requirements**
   - Core domain logic: 90%+ coverage
   - API controllers: 80%+ coverage
   - UI components: 70%+ coverage
   - Utility functions: 80%+ coverage
   - Data models: 50%+ coverage

### TDD Example Workflow

```typescript
// 1. Start with a test for the feature
describe('VenueService', () => {
  describe('getNearbyVenues', () => {
    it('should return venues within specified radius', async () => {
      // Arrange
      const userLocation = { latitude: 34.0522, longitude: -118.2437 };
      const radius = 1000; // 1km
      
      const mockVenues = [
        { id: 'v1', name: 'Venue 1', location: { latitude: 34.0525, longitude: -118.2430 } },
        { id: 'v2', name: 'Venue 2', location: { latitude: 34.0600, longitude: -118.2500 } }
      ];
      
      mockVenueRepository.findNearby.mockResolvedValue(mockVenues);
      
      // Act
      const result = await venueService.getNearbyVenues(userLocation, radius);
      
      // Assert
      expect(mockVenueRepository.findNearby).toHaveBeenCalledWith(
        userLocation.latitude,
        userLocation.longitude,
        radius
      );
      expect(result).toEqual(mockVenues);
    });
    
    it('should apply user preferences when available', async () => {
      // Test with user preferences
    });
    
    it('should handle empty results', async () => {
      // Test empty result case
    });
    
    it('should throw error when repository fails', async () => {
      // Test error handling
    });
  });
});

// 2. Implement the feature to make the test pass
export class VenueService {
  constructor(private venueRepository: VenueRepository) {}
  
  async getNearbyVenues(userLocation: GeoPoint, radius: number): Promise<Venue[]> {
    return this.venueRepository.findNearby(
      userLocation.latitude,
      userLocation.longitude,
      radius
    );
  }
}

// 3. Add more tests and refactor as needed
```

## Performance Testing Protocols

### Performance Test Requirements

Implement performance testing for these critical areas:

1. **API Response Times**
   - 90% of API requests must complete within 300ms
   - 99% of requests must complete within 1 second
   - No requests should exceed 3 seconds
   - Test with simulated load of 100 concurrent users

2. **Map Performance**
   - Map rendering must complete within 300ms on target devices
   - Venue pin clustering must process 1000+ venues within 500ms
   - Location updates must be processed within 100ms
   - Test with 100+ venue pins visible simultaneously

3. **Real-time Feature Performance**
   - Chat message delivery must occur within 500ms
   - Location updates must propagate within 1 second
   - Notifications must deliver within 2 seconds
   - Test with 20+ simultaneous active users

4. **Battery Consumption**
   - Location tracking must consume less than 5% battery per hour
   - Background operations must use less than 1% battery per hour
   - Tonight Mode must operate for 6+ hours on a single charge
   - Test on reference iOS and Android devices

### Performance Test Implementation

Use Jest with performance measurement hooks:

```typescript
describe('Venue Discovery Performance', () => {
  let startTime: number;
  let endTime: number;
  
  beforeEach(() => {
    startTime = performance.now();
  });
  
  afterEach(() => {
    endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`Test duration: ${duration}ms`);
  });
  
  it('should find nearby venues within performance budget', async () => {
    // Arrange
    const userLocation = { latitude: 34.0522, longitude: -118.2437 };
    const radius = 1000;
    
    // Act
    const result = await venueService.getNearbyVenues(userLocation, radius);
    
    // Assert
    expect(performance.now() - startTime).toBeLessThan(300); // Response time < 300ms
    expect(result.length).toBeGreaterThan(0);
  });
  
  it('should handle 1000 venues within performance budget', async () => {
    // Generate 1000 test venues
    const testVenues = Array.from({ length: 1000 }, (_, i) => ({
      id: `v${i}`,
      name: `Venue ${i}`,
      location: {
        latitude: 34.0522 + (Math.random() * 0.02 - 0.01),
        longitude: -118.2437 + (Math.random() * 0.02 - 0.01)
      }
    }));
    
    mockVenueRepository.findAll.mockResolvedValue(testVenues);
    
    // Act
    const result = await venueService.filterAndRankVenues(testVenues, userPreferences);
    
    // Assert
    expect(performance.now() - startTime).toBeLessThan(500); // Processing time < 500ms
  });
});
```

## Continuous Integration Testing

### CI Testing Pipeline

Implement a CI testing pipeline with these stages:

1. **Static Analysis**
   - ESLint for code style and potential issues
   - TypeScript compilation check
   - Dependency scanning for vulnerabilities
   - File size and complexity analysis

2. **Unit Testing**
   - Run all unit tests with coverage reporting
   - Fail build if coverage drops below thresholds
   - Report detailed test results and timing

3. **Integration Testing**
   - Deploy test environment with isolated database
   - Run service integration tests
   - Test external API integrations with mocks
   - Clean up test resources after completion

4. **End-to-End Testing**
   - Deploy complete test environment
   - Run Detox tests on emulators/simulators
   - Capture screenshots/videos of failures
   - Generate detailed test reports

5. **Performance Testing**
   - Run performance tests on critical paths
   - Compare results against established baselines
   - Alert on performance regressions
   - Generate performance trend reports

### Test Report Requirements

All tests must generate standardized reports with:

1. Test coverage metrics by service and component
2. Execution time for each test suite
3. Detailed failure information with context
4. Historical trends for test performance
5. Integration with issue tracking for failed tests
