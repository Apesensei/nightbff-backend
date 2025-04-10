# Rule Set 6: NightBFF Technology Implementation Standards

## NestJS Service Patterns

### Module Organization
- Organize services into domain-aligned modules
- Each module should include:
  - Module definition (*.module.ts)
  - Controller (*.controller.ts)
  - Service (*.service.ts)
  - Repository/data access layer (*.repository.ts)
  - DTOs and interfaces (*.dto.ts, *.interface.ts)
  - Entity definitions (*.entity.ts)

### Service Implementation
- Implement constructor-based dependency injection
- Services should follow the repository pattern for data access
- Use asynchronous methods that return Promises
- Implement structured error handling with try/catch blocks:
  ```typescript
  async createEvent(userId: string, eventData: CreateEventDto): Promise<Event> {
    try {
      // Validate input data
      this.validateEventData(eventData);
      
      // Business logic implementation
      const event = await this.eventsRepository.create({
        ...eventData,
        creatorId: userId,
        attendees: [{ 
          userId, 
          status: 'going',
          joinedAt: new Date()
        }]
      });

      // Side effects after main operation
      await this.notificationsService.scheduleEventReminders(event.id);
      
      // Logging for observability
      this.logger.log(`Event created: ${event.id} by user ${userId}`);

      return event;
    } catch (error) {
      // Standardized error handling
      this.logger.error(`Error creating event: ${error.message}`, error.stack);
      throw this.mapToAppropriateException(error);
    }
  }
  ```

### Controller Structure
- Use appropriate decorators for request handling
- Implement DTOs for all request and response objects
- Apply validation pipes for request validation
- Implement consistent method naming:
  - create* - POST operations
  - get* - GET operations
  - update* - PATCH operations
  - delete* - DELETE operations
- Include proper response status codes

## React Native Component Architecture

### Component Hierarchy
- Follow the established component structure:
  ```
  /src
  ├── /components
  │   ├── /atoms        # Base UI elements
  │   ├── /molecules    # Composite components
  │   ├── /organisms    # Complex UI sections
  │   └── /templates    # Screen layouts
  ├── /screens          # Full app screens
  ├── /navigation       # Navigation configuration
  ```
- Extract reusable UI elements into appropriate component levels
- Maintain proper separation of concerns between presentation and logic

### Component Implementation
- Use functional components with hooks
- Group state declarations at the top of components
- Use useCallback for event handlers to prevent unnecessary re-renders
- Implement consistent naming:
  - handle* for event handlers
  - Components use PascalCase
  - Files use kebab-case
- Example structure:
  ```jsx
  import React, { useState, useCallback, useEffect } from 'react';
  import { View, StyleSheet } from 'react-native';
  import { useNavigation } from '@react-navigation/native';
  import { EventItem, LoadingIndicator, ErrorView } from '@/components';
  import { useEvents } from '@/hooks';
  import { palette, spacing } from '@/theme';

  export const EventListScreen = () => {
    // State declarations at the top
    const [refreshing, setRefreshing] = useState(false);
    
    // Custom hooks for data and navigation
    const navigation = useNavigation();
    const { events, loading, error, fetchEvents } = useEvents();
    
    // Effects separated by concern
    useEffect(() => {
      fetchEvents();
    }, [fetchEvents]);
    
    // Event handlers using useCallback
    const handleRefresh = useCallback(async () => {
      setRefreshing(true);
      await fetchEvents();
      setRefreshing(false);
    }, [fetchEvents]);
    
    const handleEventPress = useCallback((eventId) => {
      navigation.navigate('EventDetails', { eventId });
    }, [navigation]);
    
    // Conditional rendering
    if (loading && !refreshing) {
      return <LoadingIndicator />;
    }
    
    // Main component render
    return (
      <View style={styles.container}>
        <EventList
          events={events}
          onEventPress={handleEventPress}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      </View>
    );
  };

  // Styles at the bottom
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
      padding: spacing.medium
    }
  });
  ```

### State Management
- Use React Query for server state management
- Use React Context for shared application state
- Use local component state for UI-specific state
- Implement AsyncStorage for persistent client-side storage

## Supabase Integration Approaches

### Authentication Implementation
- Use Supabase Auth (GoTrue) for all authentication flows:
  - Email/password
  - Social providers (Apple, Google, Facebook)
- Store JWT tokens securely in device storage
- Implement token refresh mechanisms
- Apply proper error handling for auth state changes

### Database Access
- Implement Row-Level Security (RLS) policies for all tables
- Use typed Supabase queries with proper error handling:
  ```typescript
  async function getVenuesNearby(lat: number, lng: number, radius: number): Promise<Venue[]> {
    try {
      const { data, error } = await supabase
        .rpc('venues_within_radius', { 
          latitude: lat, 
          longitude: lng, 
          radius_meters: radius 
        });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching nearby venues:', error);
      throw new Error('Failed to fetch nearby venues');
    }
  }
  ```
- Implement proper caching strategies for frequently accessed data
- Use optimistic updates for better user experience

### Real-time Subscriptions
- Create dedicated subscription handlers for each real-time feature
- Implement proper channel management:
  ```typescript
  // Subscribe to chat messages
  const subscription = supabase
    .channel(`chat:${chatId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `chat_id=eq.${chatId}`
    }, (payload) => {
      // Handle new message
      handleNewMessage(payload.new);
    })
    .subscribe();
    
  // Cleanup on unmount
  return () => {
    supabase.removeChannel(subscription);
  };
  ```
- Handle subscription errors and reconnection
- Implement proper cleanup when components unmount

## Geospatial Feature Implementation

### Location Data Management
- Use PostGIS for all geospatial operations
- Store coordinates in PostgreSQL geography type
- Implement appropriate spatial indexes
- Use efficient query patterns for proximity searches:
  ```sql
  CREATE OR REPLACE FUNCTION venues_within_radius(
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION
  )
  RETURNS SETOF venues AS $$
    SELECT *
    FROM venues
    WHERE ST_DWithin(
      geography(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)),
      geography(location),
      radius_meters
    )
    ORDER BY ST_Distance(
      geography(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)),
      geography(location)
    );
  $$ LANGUAGE SQL;
  ```

### Mobile Location Integration
- Implement adaptive location tracking frequency:
  - High frequency in "Tonight Mode"
  - Reduced frequency in normal mode
  - Background updates optimized for battery life
- Implement appropriate permission handling for location access
- Apply location fuzzing for privacy when sharing user locations
- Include efficient caching of location data for offline use

### Map Interface
- Implement interactive map using Google Maps integration
- Apply clustering for venue pins in dense areas
- Implement proper map region management for performance
- Handle different zoom levels appropriately
- Include custom styling for nightlife-themed map appearance
