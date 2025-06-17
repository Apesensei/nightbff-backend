# 🔧 Frontend Environment Setup

**FOR FRONTEND DEVELOPERS** - Quick backend setup to get your frontend connected

---

## 🎯 **WHAT FRONTEND TEAMS NEED**

This guide helps you get the NightBFF backend running locally so your frontend can connect to it.

### **Quick Summary**
- ✅ Backend API running on `http://localhost:3000`
- ✅ Interactive API docs at `http://localhost:3000/api/docs`
- ✅ WebSocket for chat at `ws://localhost:3000/chat`
- ✅ File uploads available at `http://localhost:3000/uploads`

---

## 🚀 **STEP-BY-STEP SETUP**

### **Step 1: Prerequisites**
```bash
# Install required software
Node.js v18+ 
PostgreSQL 14+ with PostGIS
Redis 6+
```

### **Step 2: Clone & Install**
```bash
# Navigate to backend directory
cd nightbff-backend/

# Install dependencies
npm install --legacy-peer-deps
```

### **Step 3: Environment Configuration**
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your values:
nano .env  # or use your preferred editor
```

**Required Environment Variables:**
```bash
# Database (PostgreSQL)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=your_postgres_username
DATABASE_PASSWORD=your_postgres_password
DATABASE_NAME=nightbff_dev

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Security (Generate secure random strings)
JWT_SECRET=your-very-secure-jwt-secret-at-least-32-characters
JWT_EXPIRES_IN=7d

# Google Maps (Required for location features)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Server
PORT=3000
NODE_ENV=development
```

### **Step 4: Database Setup**
```bash
# Create database
createdb nightbff_dev

# Run migrations
npm run migration:run

# (Optional) Seed test data
npm run seed
```

### **Step 5: Start Backend**
```bash
# Start development server
npm run start:dev

# You should see:
# [Nest] Application successfully started
# Swagger docs available at: http://localhost:3000/api/docs
```

### **Step 6: Verify Setup**
```bash
# Test API health
curl http://localhost:3000/api/performance/health

# Expected response:
# {"status":"ok","timestamp":"..."}
```

---

## 🔗 **FRONTEND INTEGRATION ENDPOINTS**

Once backend is running, your frontend can connect to:

### **🔐 Authentication**
```typescript
// Register new user
POST http://localhost:3000/api/auth/signup

// Login user  
POST http://localhost:3000/api/auth/signin

// Get user profile (requires JWT)
GET http://localhost:3000/api/users/profile
```

### **🎉 Social Features**
```typescript
// Get nearby events
GET http://localhost:3000/api/events?latitude=40.7128&longitude=-74.0060

// Get trending venues
GET http://localhost:3000/api/venues/trending

// Get user's chats
GET http://localhost:3000/api/chats/me
```

### **💬 Real-time Chat**
```typescript
// WebSocket connection
ws://localhost:3000/chat?token=jwt_token_here
```

---

## 🐛 **TROUBLESHOOTING**

### **Port Already in Use (EADDRINUSE)**
```bash
# Kill existing Node processes
pkill -f "node.*nest"

# Or use different port
PORT=3001 npm run start:dev
```

### **Database Connection Failed**
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Create database if it doesn't exist
createdb nightbff_dev

# Verify credentials in .env file
```

### **Redis Connection Failed**
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Start Redis if not running
redis-server
```

### **Migration Errors**
```bash
# Reset database (caution: loses data)
dropdb nightbff_dev
createdb nightbff_dev
npm run migration:run
```

---

## 📚 **QUICK REFERENCE**

### **API Documentation**
- **Interactive Docs**: http://localhost:3000/api/docs
- **Try endpoints**: Click "Try it out" in Swagger UI
- **Authentication**: Use "Authorize" button in Swagger

### **Common URLs**
- **API Base**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/api/performance/health
- **File Uploads**: http://localhost:3000/uploads
- **WebSocket**: ws://localhost:3000/chat

### **Useful Commands**
```bash
# Start backend
npm run start:dev

# Run tests
npm run test

# Check logs
npm run start:dev | grep ERROR

# Reset everything
dropdb nightbff_dev && createdb nightbff_dev && npm run migration:run
```

---

## 🎯 **NEXT STEPS FOR FRONTEND**

1. ✅ **Backend Running**: Verify at http://localhost:3000/api/docs
2. 🔗 **Test Authentication**: Try signup/signin endpoints
3. 📱 **Connect Frontend**: Use API base URL `http://localhost:3000/api`
4. 💬 **Add Real-time**: Connect WebSocket at `ws://localhost:3000/chat`
5. 🚀 **Build Features**: Use the 60+ available API endpoints

---

**Need Help?** 
- Check `FRONTEND_INTEGRATION_GUIDE.md` for detailed API examples
- Visit Swagger docs at http://localhost:3000/api/docs
- See `docs/FRONTEND_INTEGRATION_CHECKLIST.md` for complete integration guide

**🎉 Happy Frontend Development!** 