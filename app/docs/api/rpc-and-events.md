# NightBFF RPC Patterns and Event Contracts

This document describes the RPC (Remote Procedure Call) patterns and event contracts used in the NightBFF microservices architecture.

## Overview

The NightBFF system uses Redis as the transport layer for both:
- **RPC Communication**: Request-response patterns between services
- **Event Communication**: Publish-subscribe patterns for asynchronous processing

## RPC Patterns

### 1. City Management (Plan Service)

#### `city.findOrCreate`

**Description**: Finds an existing city by name and country, or creates a new one if not found.

**Request Pattern**: `"city.findOrCreate"`

**Request Payload**:
```typescript
interface FindOrCreateCityRpcRequestPayload {
  name: string;
  countryCode: string;
  location?: {
    type: "Point";
    coordinates: number[]; // [longitude, latitude]
  };
}
```

**Response Payload**:
```typescript
type FindOrCreateCityRpcResponsePayload = City | null;

interface City {
  id: string;
  name: string;
  countryCode: string;
  location?: string; // WKT format: "POINT(lng lat)"
  flagEmoji?: string;
  trendingScore: number;
  planCount: number;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Usage Example**:
```typescript
const cityResult = await firstValueFrom(
  this.planClient.send<City | null>("city.findOrCreate", {
    name: "San Francisco",
    countryCode: "US",
    location: { type: "Point", coordinates: [-122.4194, 37.7749] }
  })
);
```

**Error Handling**:
- Returns `null` if city creation fails
- Throws `RpcException` for validation errors (missing name/countryCode)

---

### 2. Venue Management (Venue Service)

#### `venue.triggerScanIfStale`

**Description**: Triggers a venue scan for a geographic area if it hasn't been scanned recently.

**Request Pattern**: `"venue.triggerScanIfStale"`

**Request Payload**:
```typescript
interface TriggerScanIfStaleRpcRequestPayload {
  latitude: number;
  longitude: number;
}
```

**Response Payload**:
```typescript
type TriggerScanIfStaleRpcResponsePayload = void;
```

**Usage Example**:
```typescript
await firstValueFrom(
  this.venueClient.send("venue.triggerScanIfStale", {
    latitude: 37.7749,
    longitude: -122.4194
  })
);
```

**Behavior**:
- Checks if the geohash area has been scanned within the staleness threshold (default: 72 hours)
- If stale, enqueues a background scan job for the area
- Fire-and-forget operation - errors are logged but not thrown

---

### 3. Venue Backfill Operations (Venue Service)

#### `venue.getWithoutCityId`

**Request Pattern**: `"venue.getWithoutCityId"`

**Request Payload**:
```typescript
interface GetVenuesWithoutCityIdRequestDto {
  limit: number;
  offset: number;
}
```

**Response Payload**:
```typescript
interface GetVenuesWithoutCityIdResponseDto {
  venues: Venue[];
}
```

#### `venue.updateCityId`

**Request Pattern**: `"venue.updateCityId"`

**Request Payload**:
```typescript
interface UpdateVenueCityIdRequestDto {
  venueId: string;
  cityId: string;
}
```

---

### 4. Event Backfill Operations (Event Service)

#### `event.getWithoutCityId`

**Request Pattern**: `"event.getWithoutCityId"`

**Request Payload**:
```typescript
interface GetEventsWithoutCityIdRequestDto {
  limit: number;
  offset: number;
}
```

#### `event.updateCityId`

**Request Pattern**: `"event.updateCityId"`

**Request Payload**:
```typescript
interface UpdateEventCityIdRequestDto {
  eventId: string;
  cityId: string;
}
```

---

## Event Patterns

### 1. Plan Events

#### `plan.created`

**Description**: Emitted when a new plan is successfully created.

**Event Pattern**: `"plan.created"`

**Payload**:
```typescript
interface PlanCreatedPayload extends BaseEventPayload {
  planId: string;
  cityId: string;
  creatorId: string;
  eventId: string; // For idempotency
}
```

**Listeners**:
- **City Service**: Increments plan count for the associated city

#### `plan.deleted`

**Description**: Emitted when a plan is deleted.

**Event Pattern**: `"plan.deleted"`

**Payload**:
```typescript
interface PlanDeletedPayload extends BaseEventPayload {
  planId: string;
  cityId: string;
  eventId: string; // For idempotency
}
```

**Listeners**:
- **City Service**: Decrements plan count for the associated city

#### `plan.saved`

**Description**: Emitted when a user saves/unsaves a plan.

**Event Pattern**: `"plan.saved"`

**Payload**:
```typescript
interface PlanSavedPayload extends BaseEventPayload {
  planId: string;
  userId: string;
  action: 'saved' | 'unsaved';
  eventId: string; // For idempotency
}
```

**Listeners**:
- **Plan Service**: Updates save count for the plan

---

### 2. City Events

#### `city.created`

**Description**: Emitted when a new city is successfully created.

**Event Pattern**: `"city.created"`

**Payload**:
```typescript
interface CityCreatedPayload extends BaseEventPayload {
  cityId: string;
  name: string;
  countryCode: string;
  latitude?: number;
  longitude?: number;
  eventId: string; // For idempotency
}
```

**Listeners**:
- **City Image Service**: Fetches city image from Google Places API asynchronously

---

### 3. Base Event Structure

All events extend the base event payload:

```typescript
interface BaseEventPayload {
  eventId: string; // UUID for idempotency
  timestamp: Date;
}
```

---

## Idempotency Handling

All event listeners implement idempotency using Redis:

```typescript
async handleEvent(@Payload() data: EventPayload) {
  // Check if event has been processed
  const lockKey = `event:${data.eventId}`;
  const lockAcquired = await this.redis.set(lockKey, '1', 'NX', 'EX', 3600);
  
  if (!lockAcquired) {
    this.logger.warn(`Event ${data.eventId} already processed`);
    return;
  }

  try {
    // Process event
    await this.processEvent(data);
  } catch (error) {
    // Release lock on error for retry
    await this.redis.del(lockKey);
    throw error;
  }
}
```

---

## Configuration

### Redis Transport Configuration

All services use Redis for RPC and event communication:

```typescript
ClientsModule.registerAsync([
  {
    name: "SERVICE_NAME_RPC",
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      transport: Transport.REDIS,
      options: {
        host: configService.get<string>("REDIS_HOST"),
        port: configService.get<number>("REDIS_PORT"),
        password: configService.get<string>("REDIS_PASSWORD"),
      },
    }),
    inject: [ConfigService],
  },
]);
```

### Environment Variables

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

---

## Error Handling Best Practices

### RPC Calls
```typescript
try {
  const result = await firstValueFrom(
    this.client.send<ResponseType>("pattern", payload)
  );
  return result;
} catch (error) {
  this.logger.error(`RPC call failed: ${error.message}`, error.stack);
  // Handle gracefully - don't throw unless critical
  return null;
}
```

### Event Emission
```typescript
try {
  this.eventClient.emit("event.pattern", payload);
} catch (error) {
  this.logger.error(`Event emission failed: ${error.message}`, error.stack);
  // Continue execution - events are fire-and-forget
}
```

---

## Testing RPC and Events

### Unit Testing RPC Calls
```typescript
const mockClient = {
  send: jest.fn().mockReturnValue(of(mockResponse)),
};

// Test RPC call
const result = await service.callRpc(data);
expect(mockClient.send).toHaveBeenCalledWith("pattern", expectedPayload);
```

### Integration Testing Events
```typescript
// Listen for event emission
const eventSpy = jest.spyOn(eventClient, 'emit');
await service.performAction();
expect(eventSpy).toHaveBeenCalledWith("event.pattern", expectedPayload);
```

---

This documentation ensures all developers understand the RPC patterns and event contracts used throughout the NightBFF microservices architecture. 