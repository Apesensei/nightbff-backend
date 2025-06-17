# 🌃 NightBFF Backend API

**Your complete guide to integrating with the NightBFF backend services**

## 🚀 Quick Start for Frontend Development

### API Documentation
- **📚 Interactive API Docs:** `http://localhost:3000/api/docs`
- **Base URL (Development):** `http://localhost:3000/api`
- **Base URL (Production):** `https://api.nightbff.com/api`

### Authentication Flow
```javascript
// 1. Register new user
const signupResponse = await fetch('/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    username: 'cooluser',
    displayName: 'Cool User',
    password: 'SecurePass123!'
  })
});

// 2. Sign in user
const signinResponse = await fetch('/api/auth/signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!'
  })
});

const { data } = await signinResponse.json();
const accessToken = data.session.accessToken;

// 3. Use token for authenticated requests
const profileResponse = await fetch('/api/users/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

## 🏗️ Service Architecture

| Service | Port | Purpose | Key Endpoints |
|---------|------|---------|---------------|
| **Auth** | 3012 | Authentication & Authorization | `/api/auth/*` |
| **User** | 3011 | User profiles & discovery | `/api/users/*` |
| **Chat** | 3013 | Real-time messaging | `/api/chat/*` + WebSocket |
| **Event** | 3014 | Event management | `/api/events/*` |
| **Venue** | 3017 | Venue discovery | `/api/venues/*` |
| **Plan** | 3010 | Trip planning | `/api/plans/*`, `/api/cities/*` |
| **Interest** | 3015 | User interests & matching | `/api/interests/*` |
| **Notification** | 3016 | Push notifications | `/api/notifications/*` |

## 🔐 Authentication & Security

### JWT Token Usage
All protected endpoints require the JWT token in the Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Management
- **Token Expiration:** 7 days (configurable)
- **Storage:** Store securely in your app (AsyncStorage, SecureStore, etc.)
- **Refresh:** Currently no refresh token - user must re-authenticate when expired

## 📱 Key Features & Endpoints

### 🔐 Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Authenticate user  
- `POST /api/auth/signout` - Sign out user

### 👤 User Management
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/location` - Update user location
- `GET /api/users/recommendations` - Get user recommendations

### 💬 Real-time Chat
- `GET /api/chat` - Get user's chats
- `POST /api/chat` - Create new chat
- `POST /api/chat/:id/messages` - Send message
- **WebSocket:** `ws://localhost:3000` for real-time messaging

### 🎉 Events & Plans
- `GET /api/events` - Discover events
- `POST /api/events` - Create event
- `POST /api/plans` - Create travel plan
- `GET /api/cities/trending` - Get trending cities

### �� Venues & Discovery
- `GET /api/venues/trending` - Get trending venues
- `GET /api/venues/discover` - Discover nearby venues
- `GET /api/venues/search` - Search venues

### 🎯 Interests & Matching
- `GET /api/interests` - Get available interests
- `POST /api/interests/user` - Set user interests
- `GET /api/interests/recommendations` - Get personalized recommendations

## 📁 File Upload Support

### Image Upload Endpoints
- `POST /api/users/upload` - Upload profile image
- `POST /api/events/:id/upload` - Upload event image
- `POST /api/chat/:id/media` - Upload chat media

### Upload Format
```javascript
const formData = new FormData();
formData.append('file', imageFile);

const response = await fetch('/api/users/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
  body: formData
});
```

## 🌐 WebSocket Integration

### Chat WebSocket Connection
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: accessToken
  }
});

// Listen for messages
socket.on('message', (data) => {
  console.log('New message:', data);
});

// Send message
socket.emit('sendMessage', {
  chatId: 'chat-uuid',
  content: 'Hello world!'
});
```

## ⚡ Performance & Optimization

### Response Times (Tested)
- **Authentication:** < 30ms P95
- **User Operations:** < 55ms P95  
- **Event Discovery:** < 250ms P95
- **Interest Algorithms:** < 20ms P95
- **Plan Creation:** < 350ms P95

### Caching
- **Redis caching** enabled for frequently accessed data
- **Static file caching** with CDN-optimized headers
- **Database connection pooling** for optimal performance

## 🛠️ Development Setup

### Running the Backend
```bash
# Install dependencies
npm install

# Start development server
npm run start:dev

# View API documentation
open http://localhost:3000/api/docs
```

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/nightbff
REDIS_URL=redis://localhost:6379

# Authentication  
JWT_SECRET=your-jwt-secret
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-key

# Development
NODE_ENV=development
PORT=3000
```

## 🧪 Testing & Validation

### Performance Testing Available
- **Database:** Optimized connection pooling
- **Authentication:** 100% success rate under load
- **Plan Creation:** 100% success rate
- **Cache Performance:** 50%+ hit rates
- **Service Reliability:** < 2% error rate

### Test Data Available
- Pre-seeded users for testing
- Sample events and venues
- Mock geolocation data

## 🚨 Error Handling

### Standard Error Response
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### Common HTTP Status Codes
- **200/201:** Success
- **400:** Bad Request (validation failed)
- **401:** Unauthorized (invalid/missing token)
- **403:** Forbidden (insufficient permissions)
- **404:** Not Found
- **500:** Internal Server Error

## 📞 Support & Resources

### API Documentation
- **Swagger UI:** `/api/docs` - Interactive API testing
- **RPC Documentation:** `/docs/api/rpc-and-events.md`
- **Deployment Guide:** `/docs/deployment/deployment-guide.md`

### Development
- **Performance Testing:** Available in `/performance-testing/`
- **Database Migrations:** `npm run typeorm:run-migrations`
- **Linting:** `npm run lint`
- **Testing:** `npm run test`

---

**🎯 Ready for Integration!** Your backend is fully operational with comprehensive API documentation, performance optimization, and frontend-friendly endpoints. Start building your amazing nightlife social app! 🌟 