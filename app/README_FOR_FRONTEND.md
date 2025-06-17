# 🎨 NightBFF Backend - For Frontend Developers

**Complete backend API ready for your frontend integration**

---

## 🎯 **FOR FRONTEND TEAMS - START HERE**

### **📁 Essential Files for Frontend Integration**

| File | Purpose | When to Use |
|------|---------|-------------|
| **`FRONTEND_INTEGRATION_GUIDE.md`** | 📱 Complete API integration examples | Start here - API patterns, code examples |
| **`FRONTEND_ENV_SETUP.md`** | 🔧 Quick backend setup | Need to run backend locally |
| **`docs/FRONTEND_INTEGRATION_CHECKLIST.md`** | ✅ Step-by-step integration | Systematic integration approach |
| **`.env.example`** | 🔐 Environment configuration | Setting up backend environment |

### **🚀 Quick Start (5 Minutes)**
1. **Setup Backend**: Follow `FRONTEND_ENV_SETUP.md`
2. **Explore API**: Visit http://localhost:3000/api/docs
3. **Integration**: Use `FRONTEND_INTEGRATION_GUIDE.md`
4. **Build**: Start connecting your frontend!

---

## 🔗 **API OVERVIEW**

### **Base URL**: `http://localhost:3000/api`

### **Key Endpoints for Frontend**
```typescript
// Authentication
POST /api/auth/signup        // User registration
POST /api/auth/signin        // User login
GET  /api/users/profile      // Get current user

// Social Features  
GET  /api/events             // Events near user
GET  /api/venues/trending    // Popular venues
GET  /api/chats/me          // User's conversations

// Real-time
WebSocket: ws://localhost:3000/chat
```

### **What You Get**
- ✅ **60+ REST API endpoints** 
- ✅ **JWT authentication** system
- ✅ **Real-time WebSocket** for chat
- ✅ **File upload** handling
- ✅ **Geolocation** services
- ✅ **Interactive documentation** at `/api/docs`

---

## 🏗️ **Backend Architecture**

```
NightBFF Backend Services:
├── 🔐 Auth Service       - User authentication & authorization
├── 👤 User Service       - Profiles, preferences, social features  
├── 🎉 Event Service      - Event creation, discovery, management
├── 🏢 Venue Service      - Venue search, trending, recommendations
├── 💬 Chat Service       - Real-time messaging & notifications
├── 🗺️ Plan Service       - Trip planning & city recommendations
└── 🎯 Interest Service   - User preferences & recommendations
```

---

## 📱 **Frontend Integration Examples**

### **React/React Native**
```typescript
// Authentication flow
const signIn = async (email: string, password: string) => {
  const response = await fetch('http://localhost:3000/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  const token = data.access_token;
  
  // Use token in subsequent requests
  localStorage.setItem('token', token);
  return data;
};
```

### **Vue.js**
```typescript
// Composable for API integration
export const useNightBFF = () => {
  const token = ref(localStorage.getItem('token'));
  
  const api = async (endpoint: string, options = {}) => {
    return fetch(`http://localhost:3000/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token.value && { Authorization: `Bearer ${token.value}` }),
        ...options.headers,
      },
    });
  };
  
  return { api, token };
};
```

### **Flutter**
```dart
class NightBFFService {
  static const baseUrl = 'http://localhost:3000/api';
  
  Future<Map<String, dynamic>> signIn(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/signin'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    
    return jsonDecode(response.body);
  }
}
```

---

## 🔧 **Development Setup**

### **Prerequisites**
- Node.js v18+
- PostgreSQL 14+ with PostGIS  
- Redis 6+

### **Quick Setup**
```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Setup environment
cp .env.example .env
# Edit .env with your database/redis credentials

# 3. Setup database
createdb nightbff_dev
npm run migration:run

# 4. Start backend
npm run start:dev

# 5. Verify
curl http://localhost:3000/api/performance/health
```

---

## 📚 **Documentation Structure**

### **For Frontend Developers**
- `FRONTEND_INTEGRATION_GUIDE.md` - Complete API integration guide
- `FRONTEND_ENV_SETUP.md` - Backend setup for frontend teams
- `docs/FRONTEND_INTEGRATION_CHECKLIST.md` - Step-by-step checklist

### **API Documentation**
- Interactive Swagger: http://localhost:3000/api/docs
- Health Check: http://localhost:3000/api/performance/health

### **Backend Development** 
- `DEVELOPER_HANDOFF_GUIDE.md` - Complete backend development guide
- `README.md` - Full backend documentation

---

## 🔗 **Quick Links**

| Resource | URL | Purpose |
|----------|-----|---------|
| **API Documentation** | http://localhost:3000/api/docs | Interactive API testing |
| **Health Check** | http://localhost:3000/api/performance/health | Verify backend status |
| **WebSocket Test** | ws://localhost:3000/chat | Real-time connection |
| **File Uploads** | http://localhost:3000/uploads | Static file access |

---

## 💡 **Common Frontend Tasks**

### **User Authentication**
```typescript
// 1. Register user
POST /api/auth/signup

// 2. Login user  
POST /api/auth/signin

// 3. Get profile
GET /api/users/profile
```

### **Load Social Content**
```typescript
// Events near user
GET /api/events?latitude=40.7128&longitude=-74.0060

// Trending venues
GET /api/venues/trending

// User's interests
GET /api/interests/user/me
```

### **Real-time Features**
```typescript
// Connect to chat
const ws = new WebSocket('ws://localhost:3000/chat?token=jwt_token');

// Send message
ws.send(JSON.stringify({
  event: 'sendMessage',
  data: { chatId, content }
}));
```

---

## 🚨 **Troubleshooting**

### **Can't Connect to Backend**
- ✅ Check backend is running: `npm run start:dev`
- ✅ Verify health: http://localhost:3000/api/performance/health
- ✅ Check port: Default is 3000, might conflict

### **Authentication Issues**
- ✅ Get token from `/api/auth/signin` response
- ✅ Include in headers: `Authorization: Bearer {token}`
- ✅ Check token expiry (default 7 days)

### **CORS Issues**
- ✅ Backend allows `localhost:3000` and `localhost:3001`
- ✅ Check your frontend URL in backend CORS config

---

## 🎯 **Next Steps**

1. **📖 Read**: `FRONTEND_INTEGRATION_GUIDE.md` for detailed examples
2. **🔧 Setup**: Follow `FRONTEND_ENV_SETUP.md` to run backend
3. **🧪 Test**: Visit http://localhost:3000/api/docs to try endpoints
4. **🚀 Build**: Start integrating with your frontend framework
5. **💬 Chat**: Implement real-time features with WebSocket

---

**🎉 Your backend is production-ready and waiting for your amazing frontend!**

Need help? Check the comprehensive guides above or explore the interactive API documentation. 