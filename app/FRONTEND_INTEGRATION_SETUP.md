# 📱 iOS Frontend Integration Setup Guide

**Ready for Production Integration - NightBFF Backend v2.0**

---

## 🎯 **IMMEDIATE ACTION ITEMS FOR FRONTEND TEAM**

### **Step 1: Update API Base URL**
```typescript
// In src/utils/apiService.ts - Line 13
const api = axios.create({
  baseURL: "http://localhost:3000/api", // Update this URL
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});
```

### **Step 2: Use Frontend-Compatible Endpoints**

**✅ AUTHENTICATION ENDPOINTS READY:**
```typescript
// Login Endpoint (Frontend Compatible)
POST /api/auth/frontend/signin
{
  "email": "user@example.com",
  "password": "password123"
}
// Response: { "token": "jwt...", "user": { "id": "...", "name": "...", "email": "..." } }

// Registration Endpoint (Frontend Compatible)  
POST /api/auth/frontend/signup
{
  "email": "user@example.com",
  "username": "user_handle",
  "displayName": "User Name",
  "password": "password123"
}
// Response: { "success": true, "message": "Account created successfully. Please sign in." }
```

### **Step 3: Update API Service Functions**
Replace your current mock service calls with these production endpoints:

```typescript
// Update src/services/api/mockService.ts loginUser function
export const loginUser = async (
  email: string,
  password: string,
): Promise<{
  token: string;
  user: { id: string; name: string; email: string; };
}> => {
  await simulateDelay();
  
  const response = await apiService.post('/auth/frontend/signin', {
    email,
    password
  });
  
  return response.data; // Already in correct format!
};

// Update signupUser function
export const signupUser = async (details: {
  name: string;  // Map to displayName
  email: string;
  password: string;
}): Promise<{ success: boolean; message: string; }> => {
  await simulateDelay();
  
  const response = await apiService.post('/auth/frontend/signup', {
    email: details.email,
    username: details.email.split('@')[0], // Generate from email
    displayName: details.name,
    password: details.password
  });
  
  return response.data;
};
```

---

## 🏗️ **COMPLETE API ENDPOINT MAPPING**

### **🔐 Authentication**
| Frontend Function | Backend Endpoint | Status |
|-------------------|------------------|---------|
| `loginUser()` | `POST /api/auth/frontend/signin` | ✅ Ready |
| `signupUser()` | `POST /api/auth/frontend/signup` | ✅ Ready |

### **👤 User Profile**
| Frontend Function | Backend Endpoint | Status |
|-------------------|------------------|---------|
| `fetchUserProfile()` | `GET /api/users/profile` | ✅ Ready |
| `updateUserProfile()` | `PUT /api/users/profile` | ✅ Ready |
| `uploadProfileImage()` | `POST /api/users/upload` | ✅ Ready |

### **🎉 Events & Social**
| Frontend Function | Backend Endpoint | Status |
|-------------------|------------------|---------|
| `fetchTrendingPlans()` | `GET /api/events/trending` | ✅ Ready |
| `fetchExplorePlans()` | `GET /api/events` | ✅ Ready |
| `createEvent()` | `POST /api/events` | ✅ Ready |
| `joinEvent()` | `POST /api/events/{id}/join` | ✅ Ready |

### **🏢 Venues & Places**
| Frontend Function | Backend Endpoint | Status |
|-------------------|------------------|---------|
| `fetchHotspots()` | `GET /api/venues/trending` | ✅ Ready |
| `fetchVenueDetails()` | `GET /api/venues/{id}` | ✅ Ready |
| `searchVenues()` | `GET /api/venues/search` | ✅ Ready |

### **💬 Real-time Chat**
| Frontend Function | Backend Endpoint | Status |
|-------------------|------------------|---------|
| `fetchChatList()` | `GET /api/chats/me` | ✅ Ready |
| `createConversation()` | `POST /api/chats` | ✅ Ready |
| `sendMessage()` | `POST /api/chats/{id}/messages` | ✅ Ready |
| **WebSocket** | `ws://localhost:3000` | ✅ Ready |

### **🗺️ Plans & Travel**
| Frontend Function | Backend Endpoint | Status |
|-------------------|------------------|---------|
| `createPlan()` | `POST /api/plans` | ✅ Ready |
| `fetchPlanDetails()` | `GET /api/plans/{id}` | ✅ Ready |
| `fetchTrendingCities()` | `GET /api/cities/trending` | ✅ Ready |

### **🎯 Interests & Matching**
| Frontend Function | Backend Endpoint | Status |
|-------------------|------------------|---------|
| `fetchInterests()` | `GET /api/interests` | ✅ Ready |
| `updateUserInterests()` | `PUT /api/interests/user/me` | ✅ Ready |
| `fetchRecommendations()` | `GET /api/interests/recommendations` | ✅ Ready |

---

## 🔄 **INTEGRATION TESTING CHECKLIST**

### **Phase 1: Authentication (Priority 1)**
- [ ] Update `baseURL` in apiService.ts
- [ ] Test frontend login with backend `/api/auth/frontend/signin`
- [ ] Test frontend registration with backend `/api/auth/frontend/signup`
- [ ] Verify token storage and retrieval
- [ ] Test session timeout handling (401/403 responses)

### **Phase 2: Core Features (Priority 2)**
- [ ] User profile loading and updating
- [ ] Event discovery and creation
- [ ] Venue search and details
- [ ] Basic chat functionality

### **Phase 3: Advanced Features (Priority 3)**
- [ ] Real-time WebSocket chat
- [ ] Plan creation and management
- [ ] Interest-based recommendations
- [ ] File uploads (images)

---

## 🚨 **CRITICAL INTEGRATION NOTES**

### **1. Token Format**
- Backend uses JWT tokens with 7-day expiration
- Store tokens securely using iOS Keychain/SecureStore
- Include in all requests: `Authorization: Bearer YOUR_TOKEN`

### **2. Error Handling**
Your existing error interceptor in `apiService.ts` is perfect:
```typescript
// Response interceptor handles 401/403 correctly
if (error.response?.status === 401 || error.response?.status === 403) {
  // Your existing logic is correct!
  Alert.alert("Session Expired", "Your session has expired. Please log in again.");
  eventEmitter.emit("authError");
}
```

### **3. WebSocket Authentication**
```typescript
// For real-time chat
const socket = io('http://localhost:3000', {
  auth: { token: YOUR_JWT_TOKEN }
});
```

### **4. CORS Configuration**
Backend is configured to accept requests from frontend domains.
If you encounter CORS issues, let us know your development URL.

---

## 📞 **SUPPORT & NEXT STEPS**

### **Ready to Start Integration:**
1. **Update your `baseURL`** to point to our backend
2. **Replace mock endpoints** with the production endpoints above
3. **Test authentication flow first** (most critical)
4. **Gradually replace mock data** with real API calls

### **Backend Status:**
- ✅ **Fully Operational**: All endpoints documented and tested
- ✅ **Swagger Documentation**: Available at `http://localhost:3000/api/docs`
- ✅ **Session Handling**: JWT-based with proper expiration
- ✅ **Error Responses**: Standard HTTP status codes
- ✅ **CORS Enabled**: Ready for frontend requests

### **Need Help?**
- Backend API Documentation: `http://localhost:3000/api/docs`
- All endpoints are live and tested
- Response formats match your frontend expectations
- Session timeout handled automatically

**🚀 You're ready to begin production integration!** 