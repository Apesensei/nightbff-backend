# NightBFF Developer Handoff Guide 🚀

## 📋 **QUICK START CHECKLIST**

### **Prerequisites**
- [ ] Node.js v18+ installed
- [ ] PostgreSQL 14+ with PostGIS extension
- [ ] Redis 6+ server
- [ ] Git access to repository

### **Setup Steps**
1. [ ] Clone repository
2. [ ] Install dependencies: `npm install --legacy-peer-deps`
3. [ ] Copy environment files (see Environment Setup below)
4. [ ] Run database migrations: `npm run migration:run`
5. [ ] Start development server: `npm run start:dev`
6. [ ] Verify Swagger docs at: `http://localhost:3000/api/docs`

---

## 🎯 **PROJECT OVERVIEW**

### **Architecture**
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with PostGIS (spatial data)
- **Cache**: Redis (pub/sub + caching)
- **API Documentation**: Swagger/OpenAPI
- **Testing**: Jest with comprehensive coverage

### **Core Services**
| Service | Purpose | Key Endpoints |
|---------|---------|---------------|
| Auth | Authentication & Authorization | `/api/auth/*` |
| User | User profiles & social features | `/api/users/*` |
| Events | Event management & discovery | `/api/events/*` |
| Venues | Venue management & discovery | `/api/venues/*` |
| Chat | Real-time messaging | `/api/chats/*` |
| Plans | Trip planning functionality | `/api/plans/*` |
| Interests | User preferences & recommendations | `/api/interests/*` |

---

## 🔐 **ENVIRONMENT SETUP**

### **Required Environment Files**

**📁 `.env` (Development)**
```bash
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=your_username
DATABASE_PASSWORD=your_password
DATABASE_NAME=nightbff_dev

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Security
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRES_IN=7d

# Google Maps API (Required for location services)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Port Configuration
PORT=3000
```

**📁 `.env.test` (Testing)**
```bash
# Copy from .env and modify:
DATABASE_NAME=nightbff_test
REDIS_DB=1
```

### **Security Note**
🚨 **NEVER commit actual environment files to repository**
- Use `.env.example` templates
- Share actual values via secure channels (1Password, Bitwarden, etc.)

---

## 🏗️ **CODEBASE STRUCTURE**

```
src/
├── microservices/          # Domain-driven service modules
│   ├── auth/              # Authentication & authorization
│   ├── user/              # User management
│   ├── event/             # Event functionality
│   ├── venue/             # Venue management
│   ├── chat/              # Real-time messaging
│   ├── plan/              # Trip planning (NEW)
│   └── interest/          # User preferences
├── common/                # Shared utilities
│   ├── database/          # DB configurations
│   ├── guards/            # Security guards
│   ├── redis/             # Cache utilities
│   └── utils/             # Helper functions
└── database/
    └── migrations/        # Database schema changes
```

### **Key Files to Understand**
- `src/main.ts` - Application bootstrap & Swagger setup
- `src/microservices/*/controllers/` - API endpoints
- `src/microservices/*/services/` - Business logic
- `src/microservices/*/entities/` - Database models
- `src/microservices/*/dto/` - Data transfer objects

---

## 🚀 **GETTING STARTED**

### **1. Clone & Install**
```bash
git clone <repository-url>
cd nightbff-backend
npm install --legacy-peer-deps
```

### **2. Database Setup**
```bash
# Create database
createdb nightbff_dev

# Run migrations
npm run migration:run

# (Optional) Seed data
npm run seed
```

### **3. Start Development**
```bash
# Development mode with hot reload
npm run start:dev

# Production build
npm run build
npm run start:prod
```

### **4. Verify Setup**
- API docs: http://localhost:3000/api/docs
- Health check: http://localhost:3000/api/performance/health
- Auth test: http://localhost:3000/api/auth/profile (requires token)

---

## 📚 **API DOCUMENTATION**

### **Interactive Documentation**
- **Swagger UI**: `http://localhost:3000/api/docs`
- **Features**: Try endpoints, view schemas, test authentication

### **Key API Patterns**

**Authentication Flow**
```typescript
// 1. Register/Login
POST /api/auth/signup
POST /api/auth/signin

// 2. Use JWT token in headers
Authorization: Bearer <jwt_token>

// 3. Access protected endpoints
GET /api/users/profile
```

**Standard Response Format**
```typescript
{
  "success": true,
  "data": {...},
  "message": "Success message",
  "timestamp": "2025-01-06T..."
}
```

---

## 🔧 **DEVELOPMENT WORKFLOW**

### **Available Scripts**
```bash
npm run start:dev       # Development server with hot reload
npm run build          # Production build
npm run test           # Run all tests
npm run test:watch     # Watch mode testing
npm run lint           # Code linting
npm run format         # Code formatting
npm run migration:generate  # Generate new migration
npm run migration:run  # Apply pending migrations
```

### **Code Quality Standards**
- **TypeScript**: Strict typing (avoid `any`)
- **File Size**: Keep files under 300 lines
- **Testing**: Maintain test coverage >80%
- **Linting**: Follow ESLint rules

---

## 🧪 **TESTING**

### **Test Structure**
```
src/microservices/*/tests/
├── controllers/       # API endpoint tests
├── services/         # Business logic tests
├── repositories/     # Database tests
└── integration/      # Cross-service tests
```

### **Running Tests**
```bash
# All tests
npm run test

# Specific service
npm run test -- --testPathPattern=auth

# Coverage report
npm run test:cov
```

---

## 🔍 **DEBUGGING & MONITORING**

### **Development Tools**
- **Logs**: Structured logging with context
- **Performance**: Built-in metrics at `/api/performance/metrics`
- **Cache Status**: Redis health at `/api/performance/cache/status`

### **Common Issues & Solutions**

**Port Already in Use**
```bash
# Kill existing processes
pkill -f "node.*nest"
# Or use different port
PORT=3001 npm run start:dev
```

**Database Connection Issues**
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432
# Verify credentials in .env
```

**Redis Connection Issues**
```bash
# Test Redis connection
redis-cli ping
# Should return: PONG
```

---

## 🚢 **DEPLOYMENT**

### **Environment-Specific Configs**
- **Development**: Use `.env` file
- **Staging**: Environment variables via deployment platform
- **Production**: Secure secret management (AWS Secrets, etc.)

### **Build & Deploy**
```bash
# Production build
npm run build

# Start production server
npm run start:prod

# Docker (if applicable)
docker build -t nightbff-backend .
docker run -p 3000:3000 nightbff-backend
```

---

## 📞 **SUPPORT & COLLABORATION**

### **Getting Help**
1. **Documentation**: Check Swagger docs first
2. **Code Examples**: See integration tests for usage patterns
3. **Architecture Questions**: Review service structure in `/src/microservices/`

### **Contributing**
- Follow existing code patterns
- Add tests for new features
- Update documentation for API changes
- Use descriptive commit messages

---

## 🎯 **CURRENT STATUS**

### **✅ Complete & Ready**
- All core services operational
- Comprehensive test coverage
- Performance optimized
- Documentation complete
- Production-ready

### **📋 Known Technical Debt**
- 391 `any` types to be converted to strict types
- 5 files >300 lines need refactoring
- Legacy peer dependencies to be updated

---

## 🔗 **Quick Links**

- **API Documentation**: http://localhost:3000/api/docs
- **Performance Metrics**: http://localhost:3000/api/performance/metrics
- **Frontend Integration Guide**: `docs/FRONTEND_INTEGRATION_CHECKLIST.md`
- **Performance Testing**: `performance-testing/P testing local.md`

---

*Last Updated: January 6, 2025*  
*Branch: feat/plan-feature-synced-20250605* 