# 🎨 NightBFF Frontend Integration Guide

**FOR FRONTEND DEVELOPERS** - Everything you need to integrate with the NightBFF backend

---

## 🎯 **QUICK START FOR FRONTEND TEAMS**

### **What You Get**
- ✅ **Complete REST API** with 60+ endpoints
- ✅ **Interactive API Documentation** at `/api/docs`
- ✅ **Real-time WebSocket** for chat and notifications
- ✅ **JWT Authentication** system
- ✅ **File Upload** handling for images/media
- ✅ **Geolocation Services** for venues and events

### **Prerequisites**
- Backend running on `http://localhost:3000`
- Valid API credentials (JWT tokens)
- Understanding of REST API patterns

---

## 🔗 **API ENDPOINTS FOR FRONTEND**

### **🔐 Authentication (REQUIRED FIRST)**
```typescript
// 1. User Registration
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}

// 2. User Login
POST /api/auth/signin
{
  "email": "user@example.com", 
  "password": "password123"
}
// Returns: { access_token: "jwt_token_here" }

// 3. Use token in all requests
headers: {
  "Authorization": "Bearer jwt_token_here"
}
```

### **👤 User Management**
```typescript
// Get current user profile
GET /api/users/profile

// Update user profile
PATCH /api/users/profile
{
  "firstName": "Updated Name",
  "bio": "User bio here"
}

// Update user location (triggers venue discovery)
POST /api/users/location
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "cityName": "New York"
}
```

### **🎉 Events & Social Features**
```typescript
// Get events near user
GET /api/events?latitude=40.7128&longitude=-74.0060&radius=5000

// Create new event
POST /api/events
{
  "title": "Beach Party",
  "description": "Fun beach gathering",
  "startTime": "2025-01-10T20:00:00Z",
  "endTime": "2025-01-11T02:00:00Z",
  "venueId": "venue-uuid-here"
}

// Join event
POST /api/events/{eventId}/join

// Get trending events
GET /api/events/trending
```

### **🏢 Venues & Places**
```typescript
// Search venues by location
GET /api/venues/search?latitude=40.7128&longitude=-74.0060&radius=5000

// Get venue details
GET /api/venues/{venueId}

// Get trending venues
GET /api/venues/trending

// Get recently viewed venues
GET /api/venues/recently-viewed
```

### **💬 Real-time Chat**
```typescript
// Get user's chats
GET /api/chats/me

// Create new chat
POST /api/chats
{
  "participantIds": ["user-uuid-1", "user-uuid-2"],
  "type": "direct" // or "group"
}

// Send message
POST /api/chats/{chatId}/messages
{
  "content": "Hello everyone!",
  "type": "text"
}

// WebSocket connection for real-time
ws://localhost:3000/chat
```

### **🎯 Interests & Recommendations**
```typescript
// Get user's interests
GET /api/interests/user/me

// Update user interests
PUT /api/interests/user/me
{
  "interestIds": ["interest-uuid-1", "interest-uuid-2"]
}

// Get personalized recommendations
GET /api/interests/recommendations

// Get popular interests
GET /api/interests/popular
```

### **🗺️ Plans & Trip Planning**
```typescript
// Create a plan
POST /api/plans
{
  "destinationCity": "New York",
  "startDate": "2025-01-15",
  "endDate": "2025-01-17",
  "groupSize": 4
}

// Get trending cities
GET /api/cities/trending

// Get city details
GET /api/cities/{cityId}/details
```

---

## 🔌 **FRONTEND INTEGRATION PATTERNS**

### **React/React Native Example**
```typescript
// API Service Setup
const API_BASE = 'http://localhost:3000/api';

class NightBFFService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  // Authentication
  async signIn(email: string, password: string) {
    const response = await this.request('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(response.access_token);
    return response;
  }

  // Get nearby events
  async getNearbyEvents(lat: number, lng: number, radius = 5000) {
    return this.request(`/events?latitude=${lat}&longitude=${lng}&radius=${radius}`);
  }

  // Create event
  async createEvent(eventData: any) {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }
}

export const nightBFFService = new NightBFFService();
```

### **Vue.js Example**
```typescript
// composables/useNightBFF.ts
import { ref, computed } from 'vue';

export const useNightBFF = () => {
  const token = ref<string | null>(localStorage.getItem('nightbff_token'));
  const user = ref(null);
  const isAuthenticated = computed(() => !!token.value);

  const api = async (endpoint: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token.value && { Authorization: `Bearer ${token.value}` }),
      ...options.headers,
    };

    const response = await fetch(`http://localhost:3000/api${endpoint}`, {
      ...options,
      headers,
    });

    return response.json();
  };

  const signIn = async (email: string, password: string) => {
    const response = await api('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    token.value = response.access_token;
    localStorage.setItem('nightbff_token', response.access_token);
    return response;
  };

  return {
    token: readonly(token),
    user: readonly(user),
    isAuthenticated,
    api,
    signIn,
  };
};
```

### **Flutter/Dart Example**
```dart
// services/nightbff_service.dart
class NightBFFService {
  static const String baseUrl = 'http://localhost:3000/api';
  String? _token;

  void setToken(String token) {
    _token = token;
  }

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_token != null) 'Authorization': 'Bearer $_token',
  };

  Future<Map<String, dynamic>> signIn(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/signin'),
      headers: _headers,
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      setToken(data['access_token']);
      return data;
    } else {
      throw Exception('Failed to sign in');
    }
  }

  Future<List<dynamic>> getNearbyEvents(double lat, double lng) async {
    final response = await http.get(
      Uri.parse('$baseUrl/events?latitude=$lat&longitude=$lng&radius=5000'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load events');
    }
  }
}
```

---

## 🌐 **WEBSOCKET INTEGRATION**

### **Real-time Chat Connection**
```typescript
// WebSocket setup for chat
class ChatWebSocket {
  private ws: WebSocket | null = null;
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  connect() {
    this.ws = new WebSocket(`ws://localhost:3000/chat?token=${this.token}`);
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('New message:', data);
      // Handle incoming messages
    };

    this.ws.onopen = () => {
      console.log('Connected to chat');
    };

    this.ws.onclose = () => {
      console.log('Disconnected from chat');
      // Implement reconnection logic
    };
  }

  sendMessage(chatId: string, content: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        event: 'sendMessage',
        data: { chatId, content }
      }));
    }
  }
}
```

---

## 📁 **FILE UPLOAD HANDLING**

### **Image Upload Example**
```typescript
// Upload user profile image
async function uploadProfileImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:3000/api/users/profile/image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type for FormData
    },
    body: formData,
  });

  return response.json();
}

// Upload event cover image
async function uploadEventImage(eventId: string, file: File) {
  const formData = new FormData();
  formData.append('coverImage', file);

  const response = await fetch(`http://localhost:3000/api/events/${eventId}/cover-image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  return response.json();
}
```

---

## ⚡ **PERFORMANCE CONSIDERATIONS**

### **Caching Strategy**
```typescript
// Implement caching for better performance
class CachedAPI {
  private cache = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  async getCachedData(key: string, fetcher: () => Promise<any>) {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const data = await fetcher();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  // Usage
  async getTrendingEvents() {
    return this.getCachedData('trending-events', () => 
      nightBFFService.api('/events/trending')
    );
  }
}
```

### **Pagination Handling**
```typescript
// Handle paginated responses
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function getAllEvents(page = 1, limit = 20): Promise<PaginatedResponse<Event>> {
  return nightBFFService.api(`/events?page=${page}&limit=${limit}`);
}
```

---

## 🚨 **ERROR HANDLING**

### **Standard Error Response**
```typescript
interface APIError {
  success: false;
  message: string;
  error?: string;
  statusCode: number;
}

// Error handling utility
function handleAPIError(error: any) {
  if (error.statusCode === 401) {
    // Redirect to login
    window.location.href = '/login';
  } else if (error.statusCode === 403) {
    // Show permission denied message
    alert('Permission denied');
  } else {
    // Show generic error
    alert(error.message || 'An error occurred');
  }
}
```

---

## 🔧 **DEVELOPMENT SETUP**

### **1. Backend Setup (Required)**
```bash
# Ensure backend is running
cd backend/
npm install --legacy-peer-deps
npm run start:dev

# Verify API is available
curl http://localhost:3000/api/performance/health
```

### **2. Environment Variables**
```typescript
// Frontend environment variables
REACT_APP_API_BASE_URL=http://localhost:3000/api
REACT_APP_WS_URL=ws://localhost:3000/chat
REACT_APP_UPLOAD_URL=http://localhost:3000/uploads
```

---

## 📚 **ADDITIONAL RESOURCES**

### **🔗 Essential Links**
- **Interactive API Docs**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/api/performance/health
- **Cache Status**: http://localhost:3000/api/performance/cache/status

### **📖 Documentation Files**
- `docs/FRONTEND_INTEGRATION_CHECKLIST.md` - Complete integration checklist
- `README.md` - Backend setup instructions
- `.env.example` - Environment configuration template

---

## 🎯 **NEXT STEPS**

1. **Start Backend**: Ensure NightBFF backend is running locally
2. **Test API**: Visit http://localhost:3000/api/docs to explore endpoints
3. **Implement Auth**: Start with user registration/login flow
4. **Add Features**: Integrate events, venues, chat as needed
5. **Optimize**: Add caching, error handling, and performance optimizations

---

**🚀 Happy Coding! Your backend is production-ready and waiting for your amazing frontend!** 