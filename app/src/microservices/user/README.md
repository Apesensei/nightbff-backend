# User Microservice

This microservice handles user-related functionality for the NightBFF application, including:

- User management and profiles
- Authentication and identity
- Social connections and relationships
- User discovery and recommendations

## Core Components

### Entities

- **User**: Core user entity with identity and profile information
- **UserRelationship**: Handles connections between users (pending, accepted, following, blocked)
- **ProfileView**: Tracks user profile views with timestamps and privacy settings

### Repositories

- **UserRepository**: Core user data access with advanced geospatial queries
- **UserRelationshipRepository**: Handles relationship CRUD operations
- **ProfileViewRepository**: Manages profile view tracking and analytics

### Services

- **UserService**: Core user management functionality
- **UserDiscoveryService**: Location-based user discovery with filtering and recommendations
- **ProfileService**: User profile management and customization

### Controllers

- **UserController**: Core user API endpoints
- **UserDiscoveryController**: Endpoints for discovering and connecting with users

## Social Connection System

The Social Connection System is a core feature that allows users to:

1. **Discover nearby users**: Find other users based on geolocation with distance information
2. **Send/receive connection requests**: Establish mutual connections for enhanced interactions
3. **Track profile views**: See who has viewed their profile (premium feature)
4. **Block/report users**: Safety mechanisms for unwanted interactions

### API Endpoints

#### User Discovery

- `GET /users/discovery/nearby`: Find nearby users with customizable radius and filters
- `GET /users/discovery/recommended`: Get personalized user recommendations
- `GET /users/discovery/profile-viewers`: See who viewed your profile

#### Connection Management

- `POST /users/connections`: Send a connection request to another user
- `GET /users/connections`: Get all connections (friends)
- `GET /users/connections/pending`: Get all pending connection requests
- `PATCH /users/connections/:id`: Accept or decline a connection request
- `POST /users/connections/block`: Block a user
- `DELETE /users/connections/block/:userId`: Unblock a user
- `GET /users/connections/blocked`: Get all blocked users

### Premium Features

- Free users are limited to a maximum of 50 connections
- Premium users can have unlimited connections

### Privacy Controls

The system implements several privacy controls:

- Blocked users are excluded from all queries
- Different visibility levels based on relationship status
- Anonymous profile views for free users
- Location privacy options for enhanced security

## Documentation

For comprehensive documentation on the Social Connection System, see:

- [System Overview](/docs/modules/user/social-connection-system.md)
- [User Flow Integration](/docs/modules/user/user-flow-integration.md)
- [Technical Reference](/docs/modules/user/social-connection-technical.md)
- [Extension Points](/docs/modules/user/extension-points.md)

## Testing

Test files are organized in a hierarchical structure that mirrors the source code:

- `tests/controllers/`: Controller tests
- `tests/services/`: Service tests 
- `tests/repositories/`: Repository tests

Run tests with:

```bash
# Run all user module tests
npm test -- --testPathPattern=src/microservices/user

# Run only specific categories
npm test -- --testPathPattern=src/microservices/user/tests/controllers
npm test -- --testPathPattern=src/microservices/user/tests/services
npm test -- --testPathPattern=src/microservices/user/tests/repositories
``` 