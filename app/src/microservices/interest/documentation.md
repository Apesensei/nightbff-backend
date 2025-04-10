# Interest Module API Documentation

This document describes the Interest API endpoints and provides integration guidelines for frontend developers.

## Overview

The Interest module manages user and event interests in the NightBFF application. It provides:

- Interest discovery (popular, trending, recommendations)
- User interest management
- Event interest association
- Admin-only interest management

## API Endpoints

### Public Endpoints

#### Get All Interests

```
GET /interests
```

Query Parameters:
- `page` (optional, default: 1): Page number for pagination
- `limit` (optional, default: 20): Number of items per page
- `search` (optional): Search term to filter interests by name
- `onlyActive` (optional, default: true): Whether to return only active interests

Response: `PaginatedInterestResponseDto`

#### Get Interest by ID

```
GET /interests/:id
```

Path Parameters:
- `id`: UUID of the interest

Response: `InterestResponseDto`

#### Get Popular Interests

```
GET /interests/popular
```

Query Parameters:
- `limit` (optional, default: 10): Number of interests to return

Response: Array of `InterestResponseDto`

#### Get Trending Interests

```
GET /interests/trending
```

Query Parameters:
- `limit` (optional, default: 10): Number of interests to return

Response: Array of `InterestResponseDto`

#### Get Current User's Interests

```
GET /interests/user/me
```

Response: Array of `InterestResponseDto`

#### Update Current User's Interests

```
PUT /interests/user/me
```

Request Body: `UserInterestsDto`
```json
{
  "interestIds": ["uuid1", "uuid2", "uuid3"]
}
```

Response:
```json
{
  "success": true,
  "message": "Updated interests for user ..."
}
```

#### Get Recommended Interests

```
GET /interests/recommendations
```

Query Parameters:
- `limit` (optional, default: 10): Number of recommendations to return

Response: Array of `InterestResponseDto`

### Admin Endpoints

#### Get All Interests (Admin)

```
GET /admin/interests
```

Query Parameters:
- `page` (optional, default: 1): Page number for pagination
- `limit` (optional, default: 20): Number of items per page
- `search` (optional): Search term to filter interests by name
- `includeInactive` (optional, default: false): Whether to include inactive interests

Response: `PaginatedInterestResponseDto`

#### Create Interest (Admin)

```
POST /admin/interests
```

Request Body: `CreateInterestDto`
```json
{
  "name": "Hiking",
  "icon": "🥾",
  "isIconEmoji": true,
  "description": "Activities related to hiking and outdoor trails",
  "isActive": true,
  "sortOrder": 10
}
```

Response: `InterestResponseDto`

#### Update Interest (Admin)

```
PUT /admin/interests/:id
```

Path Parameters:
- `id`: UUID of the interest

Request Body: `UpdateInterestDto` (all fields optional)
```json
{
  "name": "Hiking",
  "icon": "🥾",
  "isIconEmoji": true,
  "description": "Activities related to hiking and outdoor trails",
  "isActive": true,
  "sortOrder": 10
}
```

Response: `InterestResponseDto`

#### Delete Interest (Admin)

```
DELETE /admin/interests/:id
```

Path Parameters:
- `id`: UUID of the interest

Response:
```json
{
  "success": true,
  "message": "Interest deleted successfully"
}
```

#### Update Interest Sort Order (Admin)

```
PUT /admin/interests/sort-order
```

Request Body:
```json
{
  "interestIds": ["uuid1", "uuid2", "uuid3"]
}
```

Response:
```json
{
  "success": true,
  "message": "Sort order updated successfully"
}
```

#### Get Interest Analytics (Admin)

```
GET /admin/interests/analytics
```

Response:
```json
{
  "topInterests": [
    {
      "id": "uuid1",
      "name": "Hiking",
      "count": 120
    },
    ...
  ],
  "totalUsageCount": 500,
  "lastUpdated": "2023-01-01T00:00:00Z"
}
```

#### Run Migration (Admin)

```
POST /admin/interests/migrate
```

Request Body:
```json
{
  "predefinedInterests": [
    {
      "name": "Hiking",
      "icon": "🥾",
      "description": "Activities related to hiking",
      "isIconEmoji": true
    },
    ...
  ],
  "dryRun": false
}
```

Response:
```json
{
  "success": true,
  "message": "Migration completed successfully"
}
```

## Data Transfer Objects (DTOs)

### InterestResponseDto

```typescript
interface InterestResponseDto {
  id: string;
  name: string;
  icon: string;
  isIconEmoji: boolean;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  usageCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### PaginatedInterestResponseDto

```typescript
interface PaginatedInterestResponseDto {
  interests: InterestResponseDto[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

### CreateInterestDto

```typescript
interface CreateInterestDto {
  name: string;
  icon: string;
  isIconEmoji?: boolean;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
}
```

### UpdateInterestDto

```typescript
// Same as CreateInterestDto, but all fields are optional
interface UpdateInterestDto {
  name?: string;
  icon?: string;
  isIconEmoji?: boolean;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
  usageCount?: number;
}
```

### UserInterestsDto

```typescript
interface UserInterestsDto {
  interestIds: string[]; // Array of interest UUIDs, max 20
}
```

### EventInterestsDto

```typescript
interface EventInterestsDto {
  interestIds: string[]; // Array of interest UUIDs, max 5
}
```

## Frontend Integration Guidelines

### Interest Display

The Interest module supports context-aware display of interests based on where they appear in the UI:

```typescript
enum InterestDisplayContext {
  PROFILE = 'PROFILE',    // Small size, emoji only
  POST = 'POST',          // Small size, emoji only
  PLAN = 'PLAN',          // Medium size, emoji only
  EXPLORE = 'EXPLORE',    // Large size, image preferred
  SELECTION = 'SELECTION' // Medium size, emoji only
}
```

### Context-Specific Display Properties

For each context, display interests based on these guidelines:

1. **Profile Context**: 
   - Use small emoji icons
   - Compact display
   - Example: User profile details section

2. **Post Context**:
   - Use small emoji icons
   - Single interest tag per post
   - Example: Interest tag on a post

3. **Plan/Event Context**:
   - Use medium emoji icons
   - Show up to 5 interests
   - Example: Interests associated with an event

4. **Explore Context**:
   - Use larger images when available
   - Fall back to emoji for interests without images
   - Example: Interest discovery section

5. **Selection Context**:
   - Use medium emoji icons
   - Allow multi-selection
   - Example: Interest selection during onboarding

### Interest Selection Flow

When implementing interest selection:

1. Use `GET /interests` to fetch available interests
2. Display interests with their icons in a selectable grid/list
3. For users, limit selection to 20 interests max
4. For events, limit selection to 5 interests max
5. Use `PUT /user/interests` or `PUT /event/:eventId/interests` to update selections

### Icon Handling

The interest system supports both emoji and image icons:

1. Check the `isIconEmoji` flag to determine display type
2. If `isIconEmoji` is true, render the `icon` field (string containing emoji)
3. If `isIconEmoji` is false:
   - Use the `imageUrl` if provided
   - Otherwise, fall back to a generated path: `/assets/interests/{normalized-name}.jpg`

### Interest Discovery

The API provides three methods for interest discovery:

1. **Popular Interests**: Interests with highest overall usage
2. **Trending Interests**: Interests with recent activity spikes
3. **Recommended Interests**: Personalized based on user's existing interests

Use these endpoints to power different sections of the interest discovery UI.

## Example Usage

### Fetching Interests for Display

```typescript
// Get popular interests for the discover section
async function fetchPopularInterests() {
  const response = await fetch('/interests/popular?limit=10');
  const interests = await response.json();
  return interests;
}

// Get a user's interests for their profile
async function fetchUserInterests() {
  const response = await fetch('/interests/user/me');
  const interests = await response.json();
  return interests;
}
```

### Updating User Interests

```typescript
async function updateUserInterests(selectedInterestIds) {
  const response = await fetch('/interests/user/me', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      interestIds: selectedInterestIds
    }),
  });
  return response.json();
}
```

### Rendering Interests Based on Context

```typescript
function renderInterest(interest, context) {
  const className = getInterestClassName(interest, context);
  const displayProps = getInterestDisplayProps(interest, context);
  
  return `
    <div class="${className}">
      ${displayProps.useEmoji 
        ? `<span class="interest__icon">${interest.icon}</span>` 
        : `<img src="${interest.imageUrl || `/assets/interests/${interest.name.toLowerCase().replace(/\s+/g, '-')}.jpg`}" class="interest__image" />`
      }
      <span class="interest__name">${interest.name}</span>
    </div>
  `;
}

function getInterestClassName(interest, context) {
  const baseClass = 'interest';
  const contextClass = `interest--${context.toLowerCase()}`;
  const sizeClass = `interest--${getInterestDisplayProps(interest, context).size}`;
  const typeClass = interest.isIconEmoji ? 'interest--emoji' : 'interest--image';
  
  return `${baseClass} ${contextClass} ${sizeClass} ${typeClass}`;
}

function getInterestDisplayProps(interest, context) {
  // Default display properties
  const props = {
    name: interest.name,
    useEmoji: true,
    displayIcon: interest.icon,
    size: 'medium'
  };
  
  // Override properties based on context
  switch (context) {
    case 'PROFILE':
    case 'POST':
      props.useEmoji = true;
      props.size = 'small';
      break;
    case 'PLAN':
      props.useEmoji = true;
      props.size = 'medium';
      break;
    case 'EXPLORE':
      if (!interest.isIconEmoji && interest.imageUrl) {
        props.useEmoji = false;
        props.displayIcon = interest.imageUrl;
      }
      props.size = 'large';
      break;
    case 'SELECTION':
      props.useEmoji = true;
      props.size = 'medium';
      break;
  }
  
  return props;
}
``` 