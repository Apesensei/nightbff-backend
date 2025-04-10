# NightBFF Backend

Backend services for the NightBFF nightlife social platform built with NestJS and Supabase.

## Architecture

This project follows a microservices architecture with the following core services:

- **Auth Service**: Handles authentication, token management, and user permissions
- **User Service**: Manages user profiles, relationships, and preferences
- **Venue Service**: Handles venue data, discovery, and geospatial queries
- **Event Service**: Manages event creation, discovery, and attendance
- **Chat Service**: Provides real-time messaging functionality
- **Feed Service**: Manages the social feed and content
- **Notification Service**: Handles push notifications and in-app alerts
- **Premium Service**: Manages subscription status and premium features

## Prerequisites

- Node.js (v16+)
- npm or yarn
- Supabase account and project
- Google Maps API key
- Foursquare API key
- Onfido API key (for age verification)

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy the `.env.development` file to `.env.development.local` and update with your actual API keys:
   ```
   cp .env.development .env.development.local
   ```
4. Update the environment variables in `.env.development.local` with your API keys

## Database Setup

1. Create a Supabase project
2. Run the SQL scripts in the `database` directory to set up the required tables and functions

## Running the application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## API Documentation

Once the application is running, you can access the API documentation at:
http://localhost:3000/api/docs

## Project Structure

```
src/
  ├── common/               # Shared utilities and modules
  ├── config/               # Application configuration
  ├── microservices/        # Core microservices
  │   ├── auth/             # Authentication service
  │   ├── user/             # User profile service
  │   ├── venue/            # Venue discovery service
  │   ├── event/            # Event management service
  │   ├── chat/             # Real-time chat service
  │   ├── feed/             # Social feed service
  │   ├── notification/     # Notification service
  │   └── premium/          # Premium subscription service
  ├── app.module.ts         # Main application module
  └── main.ts               # Application entry point
```

## Development Guidelines

1. Follow the established coding standards
2. Maintain strict separation between microservices
3. Use the repository pattern for database operations
4. Handle errors consistently and provide helpful error messages
5. Write tests for all functionality
6. Document all public methods with JSDoc comments 