# Rule Set 5: NightBFF Architectural Foundation Rules

## Microservice Boundaries

### Service Separation
- Maintain strict separation between the 8 core microservices defined in the architecture:
  - Auth Service
  - User Service
  - Venue Service
  - Event Service
  - Chat Service
  - Feed Service
  - Notification Service
  - Premium Service
- Never implement business logic from one service domain in another service
- Cross-service communication must occur only through defined API contracts

### Domain Responsibility
- Auth Service: Handle all authentication, token management, and user permissions
- User Service: Manage user profiles, relationships, and preferences
- Venue Service: Handle venue data, discovery, and geospatial queries
- Event Service: Manage event creation, discovery, and attendance
- Chat Service: Provide real-time messaging functionality
- Feed Service: Manage the social feed and content
- Notification Service: Handle push notifications and in-app alerts
- Premium Service: Manage subscription status and premium features

### Implementation Guidelines
- Each service must have its own dedicated directory in the codebase
- Services should have minimal dependencies on shared libraries
- Shared types should be defined in a common types package
- All service-to-service communication must be traceable and documented
- Implement circuit breakers for cross-service calls to prevent cascading failures

## Database Schema Standards

### Entity Relationship Compliance
- Strictly adhere to the entity relationship diagram defined in the architecture
- Any schema changes must maintain backward compatibility
- New entities must fit into the existing relationship model
- Include appropriate foreign key relationships as defined in the ERD

### Key Database Tables
- Users: Core user identity and profile data
- UserFriends: Social connections between users
- Venues: Nightlife establishment data
- Events: User-created and official nightlife events
- EventAttendees: Junction table for event participation
- Posts: User-generated feed content
- Chats: Conversation containers (direct, group, event)
- Messages: Individual communication units
- UserLocations: Real-time and historical location data
- Subscriptions: Premium user subscription status

### Database Indexing
- Implement required geospatial indexes:
  ```sql
  CREATE INDEX idx_venues_location ON venues USING GIST (location);
  CREATE INDEX idx_user_locations_location ON user_locations USING GIST (location);
  ```
- Ensure performance-critical indexes for social features:
  ```sql
  CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
  CREATE INDEX idx_events_start_time ON events(start_time);
  CREATE INDEX idx_messages_chat_id_created_at ON messages(chat_id, created_at);
  ```
- Implement relationship lookup indexes:
  ```sql
  CREATE INDEX idx_user_friends_user_id_friend_id ON user_friends(user_id, friend_id);
  CREATE INDEX idx_event_attendees_event_id ON event_attendees(event_id);
  CREATE INDEX idx_event_attendees_user_id ON event_attendees(user_id);
  ```

## API Contract Principles

### RESTful Endpoint Structure
- Follow the established API structure:
  - `/api/auth/*` - Authentication operations
  - `/api/users/*` - User management
  - `/api/venues/*` - Venue discovery and management
  - `/api/events/*` - Event operations
  - `/api/feed/*` - Content and posts
  - `/api/chats/*` - Messaging operations
  - `/api/subscriptions/*` - Premium features
  - `/api/notifications/*` - Notification management
- Maintain resource-oriented naming (plural nouns)
- Use HTTP methods semantically (GET, POST, PATCH, DELETE)
- Support query parameters for filtering, pagination, and sorting

### Response Formatting
- All API responses must follow the standard format:
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
- Error responses must follow:
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

### Versioning and Documentation
- Each endpoint must be documented using OpenAPI/Swagger
- Implement explicit versioning for all endpoints
- Use standard status codes appropriately (200, 201, 400, 401, 403, 404, 500)
- Include rate limiting headers in all responses

## Real-time Implementation Patterns

### Supabase Real-time Integration
- Use Supabase real-time subscriptions for all real-time features:
  - Chat messages
  - Location updates
  - Live venue popularity
  - Notification delivery
- Implement proper channel design to minimize unnecessary data transfer
- Include reconnection logic with exponential backoff

### Data Flow Architecture
- Follow the established real-time data flows:
  1. Client subscribes to relevant channels
  2. Backend makes database changes
  3. Supabase's NOTIFY/LISTEN mechanism triggers updates
  4. Client receives updates via WebSocket
- Add appropriate database triggers to handle real-time updates

### Performance Considerations
- Limit subscription payload size through careful projection
- Implement client-side throttling for frequent updates (e.g., location)
- Design real-time features with offline recovery in mind
- Ensure WebSocket connections are properly closed when not needed

## Service Interaction Patterns

### Communication Protocols

Service-to-service communication follows these standardized patterns:

1. **Synchronous Communication**
   - Use HTTP/REST for request-response patterns:
     ```typescript
     // Example HTTP client in a service
     @Injectable()
     export class VenueService {
       constructor(
         private readonly httpService: HttpService,
         private readonly configService: ConfigService,
         private readonly circuitBreakerService: CircuitBreakerService
       ) {}
       
       async getVenueEvents(venueId: string): Promise<Event[]> {
         const url = `${this.configService.get('EVENT_SERVICE_URL')}/api/events`;
         
         return this.circuitBreakerService.executeWithBreaker(
           'event_service',
           async () => {
             const response = await this.httpService.get(url, {
               params: { venueId },
               headers: this.getServiceHeaders()
             }).toPromise();
             
             return response.data.data;
           }
         );
       }
       
       private getServiceHeaders(): Record<string, string> {
         return {
           'X-Service-Name': 'venue-service',
           'X-Request-ID': this.requestContextService.getRequestId(),
           'Authorization': `Bearer ${this.configService.get('SERVICE_API_KEY')}`
         };
       }
     }
     ```

2. **Asynchronous Communication**
   - Use message queues for event-based communication:
     ```typescript
     // Example message producer
     @Injectable()
     export class EventNotificationService {
       constructor(
         private readonly messageQueue: MessageQueueService
       ) {}
       
       async notifyEventCreated(event: Event): Promise<void> {
         await this.messageQueue.publish(
           'event.created',
           {
             eventId: event.id,
             title: event.title,
             creatorId: event.creatorId,
             startTime: event.startTime,
             venueId: event.venueId
           },
           {
             priority: 'high',
             deduplicationId: `event-created-${event.id}`,
             messageGroupId: `events-${event.venueId || 'no-venue'}`
           }
         );
       }
     }
     
     // Example message consumer
     @Injectable()
     export class EventConsumer {
       @MessagePattern('event.created')
       async handleEventCreated(data: EventCreatedMessage): Promise<void> {
         try {
           // Process the event
           await this.notificationService.sendEventNotifications(data);
           await this.analyticsService.trackEventCreation(data);
           await this.feedService.addEventToFeed(data);
         } catch (error) {
           // Error handling
           this.logger.error('Failed to process event.created message', {
             error: error.message,
             eventId: data.eventId
           });
           
           // Decide whether to retry or discard
           if (this.isRetryableError(error)) {
             throw error; // Will trigger requeue
           }
         }
       }
     }
     ```

### Error Handling Between Services

Implement standardized error handling across service boundaries:

1. **Circuit Breaker Pattern**
   - Prevent cascading failures with circuit breakers:
     ```typescript
     @Injectable()
     export class CircuitBreakerService {
       private readonly breakers: Map<string, CircuitBreaker> = new Map();
       
       constructor(
         private readonly configService: ConfigService,
         private readonly loggerService: LoggerService
       ) {
         // Initialize circuit breakers for known services
         const services = ['user', 'event', 'venue', 'chat', 'notification'];
         
         for (const service of services) {
           this.breakers.set(service, new CircuitBreaker({
             name: `${service}_service`,
             failureThreshold: 3,
             resetTimeout: 30000, // 30 seconds
             fallback: async () => this.handleServiceUnavailable(service),
             onOpen: () => this.logCircuitOpen(service),
             onClose: () => this.logCircuitClose(service)
           }));
         }
       }
       
       async executeWithBreaker<T>(service: string, fn: () => Promise<T>): Promise<T> {
         const breaker = this.breakers.get(service);
         
         if (!breaker) {
           throw new Error(`No circuit breaker configured for ${service}`);
         }
         
         return breaker.fire(fn);
       }
       
       private async handleServiceUnavailable(service: string): Promise<any> {
         this.loggerService.warn(`Circuit open for ${service}, using fallback`);
         throw new ServiceUnavailableException(`${service} is currently unavailable`);
       }
       
       private logCircuitOpen(service: string): void {
         this.loggerService.warn(`Circuit breaker opened for ${service}`);
         // Send alert to monitoring system
       }
       
       private logCircuitClose(service: string): void {
         this.loggerService.info(`Circuit breaker closed for ${service}`);
       }
     }
     ```

2. **Retry Strategy**
   - Implement exponential backoff for retries:
     ```typescript
     @Injectable()
     export class RetryService {
       async executeWithRetry<T>(
         operation: () => Promise<T>,
         options: {
           maxRetries?: number,
           baseDelay?: number,
           maxDelay?: number,
           retryCondition?: (error: any) => boolean
         } = {}
       ): Promise<T> {
         const {
           maxRetries = 3,
           baseDelay = 300,
           maxDelay = 5000,
           retryCondition = (error) => this.isRetryableError(error)
         } = options;
         
         let lastError: any;
         
         for (let attempt = 0; attempt <= maxRetries; attempt++) {
           try {
             return await operation();
           } catch (error) {
             lastError = error;
             
             if (attempt === maxRetries || !retryCondition(error)) {
               throw error;
             }
             
             const delay = Math.min(
               maxDelay,
               baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5)
             );
             
             this.logger.debug(`Retrying operation after error: ${error.message}`, {
               attempt,
               delay,
               nextAttempt: attempt + 1,
               maxRetries
             });
             
             await this.sleep(delay);
           }
         }
         
         throw lastError;
       }
       
       private isRetryableError(error: any): boolean {
         // Network errors
         if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
           return true;
         }
         
         // Rate limiting
         if (error.status === 429) {
           return true;
         }
         
         // Server errors
         if (error.status >= 500 && error.status < 600) {
           return true;
         }
         
         return false;
       }
       
       private sleep(ms: number): Promise<void> {
         return new Promise(resolve => setTimeout(resolve, ms));
       }
     }
     ```

### Service Discovery

Implement service discovery to enable dynamic service-to-service communication:

1. **Service Registry**
   - Register and discover services:
     ```typescript
     @Injectable()
     export class ServiceRegistryClient {
       private cachedServiceUrls: Map<string, string> = new Map();
       private cacheExpiration: Map<string, number> = new Map();
       
       constructor(
         private readonly httpService: HttpService,
         private readonly configService: ConfigService,
         private readonly loggerService: LoggerService
       ) {}
       
       async getServiceUrl(serviceName: string): Promise<string> {
         const now = Date.now();
         const cachedUrl = this.cachedServiceUrls.get(serviceName);
         const expiration = this.cacheExpiration.get(serviceName) || 0;
         
         // Return cached URL if valid
         if (cachedUrl && now < expiration) {
           return cachedUrl;
         }
         
         try {
           // Get service URL from registry
           const registryUrl = this.configService.get('SERVICE_REGISTRY_URL');
           const response = await this.httpService.get(
             `${registryUrl}/services/${serviceName}`
           ).toPromise();
           
           const serviceUrl = response.data.url;
           
           // Cache the URL with 60-second TTL
           this.cachedServiceUrls.set(serviceName, serviceUrl);
           this.cacheExpiration.set(serviceName, now + 60000);
           
           return serviceUrl;
         } catch (error) {
           // Fall back to configuration if registry fails
           this.loggerService.warn(
             `Failed to get service URL from registry: ${error.message}`,
             { serviceName }
           );
           
           const fallbackUrl = this.configService.get(`${serviceName.toUpperCase()}_SERVICE_URL`);
           
           if (!fallbackUrl) {
             throw new Error(`Unable to determine URL for service ${serviceName}`);
           }
           
           return fallbackUrl;
         }
       }
     }
     ```

### Cross-Service Authentication

Implement secure service-to-service authentication:

1. **Service Identity**
   - Use service API keys for authentication:
     ```typescript
     @Injectable()
     export class ServiceAuthInterceptor implements NestInterceptor {
       constructor(
         private readonly configService: ConfigService,
         private readonly loggerService: LoggerService
       ) {}
       
       intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
         const request = context.switchToHttp().getRequest();
         const serviceApiKey = request.headers['x-service-api-key'];
         const serviceName = request.headers['x-service-name'];
         
         if (!serviceApiKey || !serviceName) {
           throw new UnauthorizedException('Missing service authentication');
         }
         
         // Validate service API key
         const expectedApiKey = this.configService.get(`${serviceName.toUpperCase()}_API_KEY`);
         
         if (serviceApiKey !== expectedApiKey) {
           this.loggerService.warn('Invalid service API key', { serviceName });
           throw new UnauthorizedException('Invalid service authentication');
         }
         
         // Set authenticated service in request
         request.authenticatedService = serviceName;
         
         // Continue with request
         return next.handle();
       }
     }
     ```

2. **User Context Propagation**
   - Propagate user context across service boundaries:
     ```typescript
     @Injectable()
     export class UserContextPropagationService {
       constructor(
         private readonly jwtService: JwtService,
         private readonly configService: ConfigService
       ) {}
       
       createServiceToken(userId: string): string {
         // Create short-lived token for service-to-service calls
         return this.jwtService.sign(
           { 
             sub: userId,
             type: 'service',
             iat: Math.floor(Date.now() / 1000)
           },
           {
             secret: this.configService.get('SERVICE_JWT_SECRET'),
             expiresIn: '1m' // Very short expiration for service calls
           }
         );
       }
       
       validateServiceToken(token: string): { userId: string } | null {
         try {
           const payload = this.jwtService.verify(token, {
             secret: this.configService.get('SERVICE_JWT_SECRET')
           });
           
           if (payload.type !== 'service') {
             return null;
           }
           
           return { userId: payload.sub };
         } catch (error) {
           return null;
         }
       }
       
       propagateUserContext(headers: Record<string, string>, userId: string): Record<string, string> {
         return {
           ...headers,
           'X-User-Context': this.createServiceToken(userId)
         };
       }
     }
     ```

### Distributed Tracing

Implement distributed tracing for observability across services:

1. **Trace Propagation**
   - Propagate trace context across service boundaries:
     ```typescript
     @Injectable()
     export class TraceInterceptor implements NestInterceptor {
       constructor(
         private readonly tracer: TracerService,
         private readonly configService: ConfigService
       ) {}
       
       intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
         const request = context.switchToHttp().getRequest();
         const traceId = request.headers['x-trace-id'] || this.generateTraceId();
         const spanId = this.generateSpanId();
         const parentSpanId = request.headers['x-span-id'];
         
         // Set trace context
         request.traceContext = {
           traceId,
           spanId,
           parentSpanId
         };
         
         // Add trace context to response headers
         const response = context.switchToHttp().getResponse();
         response.setHeader('x-trace-id', traceId);
         
         // Create span for this request
         const span = this.tracer.startSpan(request.path, {
           traceId,
           spanId,
           parentSpanId
         });
         
         // Add request metadata to span
         span.addTags({
           'http.method': request.method,
           'http.url': request.url,
           'http.route': request.route?.path,
           'service.name': this.configService.get('SERVICE_NAME')
         });
         
         return next.handle().pipe(
           tap(
             // Success case
             () => {
               span.finish({ status: 'success' });
             },
             // Error case
             (error) => {
               span.addTags({
                 'error': true,
                 'error.message': error.message,
                 'error.type': error.constructor.name
               });
               span.finish({ status: 'error' });
             }
           )
         );
       }
       
       private generateTraceId(): string {
         return randomUUID();
       }
       
       private generateSpanId(): string {
         return randomBytes(8).toString('hex');
       }
     }
     ```

2. **Outgoing Request Tracing**
   - Add trace context to outgoing requests:
     ```typescript
     @Injectable()
     export class TracedHttpService {
       constructor(
         private readonly httpService: HttpService,
         private readonly requestContext: RequestContextService
       ) {}
       
       async get<T>(url: string, options: AxiosRequestConfig = {}): Promise<AxiosResponse<T>> {
         const traceContext = this.requestContext.getTraceContext();
         
         const headers = {
           ...options.headers,
           'x-trace-id': traceContext.traceId,
           'x-span-id': traceContext.spanId
         };
         
         return this.httpService.get(url, { ...options, headers }).toPromise();
       }
       
       // Similar methods for post, put, delete, etc.
     }
     ```
