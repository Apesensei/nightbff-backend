# Social Connection System - User Flow Integration

This document details how the Social Connection System implementation supports specific aspects of the User Flow Journey.

## Map Experience (Section 5 of User Flow Journey)

### Nearby Nightlifers Panel

The Social Connection System enables the "Nearby Nightlifers Panel" described in the User Flow Journey through:

- **Geospatial Repository Methods**: The enhanced `UserRepository` includes `findNearbyUsers` and `findActiveNearbyUsers` methods to display users within proximity.

- **Distance Calculation**: Each nearby user includes their distance from the current user in kilometers, supporting the "Distance (e.g., '1 mi')" feature in the User Flow Journey.

- **Online Status**: The `findActiveNearbyUsers` method filters users based on activity timestamps, enabling the "Online status indicator (green dot when active)" feature.

```typescript
// Example API response for nearby users
{
  "users": [
    {
      "id": "user-123",
      "displayName": "Alex",
      "photoURL": "https://example.com/alex.jpg",
      "distance": 0.8, // in kilometers
      "lastActive": "2023-03-26T14:30:00Z"
    },
    // ... more users
  ],
  "total": 28
}
```

### User Discovery

The "User Discovery" feature in the Map Experience is implemented through:

- **Quick Profile Preview**: The API responses include essential user information to render the preview described as "Tapping profile circles on map reveals quick profile preview."

- **Messaging Integration**: The response data supports the "Message" button functionality by providing user IDs for establishing conversations.

- **Interest Filtering**: Future extensions in Phase 2 will support the "Filters available for specific interests or venues" feature.

### Safety Features

The Social Connection System implements the safety features described:

- **Ghost Mode**: The relationship filtering logic supports hiding user location information, aligning with "Ghost mode toggle to hide user's location temporarily."

- **Connection-Based Privacy**: The discovery endpoints filter out blocked users and provide different levels of detail based on relationship status, supporting "Precise location only shared with mutual connections."

## Chat & Messaging Experience (Section 6)

### Connection Requests

The Social Connection System facilitates the connection request features:

- **Pending Requests**: The `UserRelationship` entity and repository methods support the "Requests (X)" indicator for pending messages.

- **Request Management**: The relationship services allow accepting/declining connection requests as described in "Preview shows sender profile with accept/decline options."

```typescript
// Example of connection request data
{
  "id": "relationship-456",
  "requesterId": "user-123",
  "recipientId": "current-user",
  "type": "PENDING",
  "message": "We met at Club Downtown last night!",
  "createdAt": "2023-03-26T10:15:00Z"
}
```

### Direct Messaging (Integration Points)

While the Chat functionality is implemented in a separate module, the Social Connection System provides key integration points:

- **Pre-Chat Relationship Verification**: Before initiating chats, the system can verify relationship status.

- **Block Enforcement**: The blocking functionality ensures blocked users cannot initiate or continue conversations.

- **Safety Tips**: The first-time message request feature ("Safety tips shown with first-time message requests") uses relationship data to identify new connections.

## Profile & Settings (Section 7)

The Social Connection System supports these aspects of the Profile & Settings section:

### Profile Management

- **Relationship Statistics**: The system provides data about user relationships for the profile statistics display.

- **Connection Management**: Users can view and manage their connections through the relationship endpoints.

### User Stats Section

- **Upcoming Plans Preview**: Integrated with the Event module, the system allows sharing event participation with connections.

### Settings & Preferences

- **Privacy Settings**: The current and planned privacy controls align with the "Privacy settings" menu option.

## Premium Features (Section 8 of User Flow Journey)

The Social Connection System implements several premium features:

### Premium Capabilities 

- **Advanced Filters**: The Phase 2 extension points include advanced discovery options for premium users.

- **Unlimited Connections**: The system can enforce connection limits for free users while allowing unlimited connections for premium users.

- **Profile Boosts**: Phase 2 includes the "Spotlight" mode for enhanced visibility in discovery.

## Implementation Notes

- The current Social Connection System focuses on core functionality, with premium features and advanced options planned for Phase 2.

- The implementation allows for gradual feature enhancement while maintaining backward compatibility.

- All features align with the privacy and safety focus described throughout the User Flow Journey. 