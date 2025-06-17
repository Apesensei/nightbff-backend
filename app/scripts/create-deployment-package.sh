#!/bin/bash

# NightBFF Backend - Deployment Package Creator
# Creates a complete package for engineer handoff

set -e

PACKAGE_NAME="nightbff-backend-$(date +%Y%m%d-%H%M%S)"
PACKAGE_DIR="../${PACKAGE_NAME}"

echo "🚀 Creating NightBFF Backend Deployment Package..."
echo "📦 Package: ${PACKAGE_NAME}"

# Create package directory
mkdir -p "${PACKAGE_DIR}"

echo "📋 Copying project files..."

# Copy essential project files
cp -r src "${PACKAGE_DIR}/"
cp -r docs "${PACKAGE_DIR}/"
cp -r test "${PACKAGE_DIR}/"
cp -r performance-testing "${PACKAGE_DIR}/"

# Copy configuration files
cp package.json "${PACKAGE_DIR}/"
cp package-lock.json "${PACKAGE_DIR}/"
cp tsconfig.json "${PACKAGE_DIR}/"
cp jest.config.js "${PACKAGE_DIR}/"
cp eslint.config.js "${PACKAGE_DIR}/"
cp Dockerfile "${PACKAGE_DIR}/"
cp .dockerignore "${PACKAGE_DIR}/"
cp .gitignore "${PACKAGE_DIR}/"

# Copy documentation
cp README.md "${PACKAGE_DIR}/"
cp DEVELOPER_HANDOFF_GUIDE.md "${PACKAGE_DIR}/"
cp .env.example "${PACKAGE_DIR}/"

# Copy frontend-specific documentation
cp FRONTEND_INTEGRATION_GUIDE.md "${PACKAGE_DIR}/"
cp FRONTEND_ENV_SETUP.md "${PACKAGE_DIR}/"
cp README_FOR_FRONTEND.md "${PACKAGE_DIR}/"

# Copy environment templates (NOT actual .env files)
if [ -f .env.example ]; then
    cp .env.example "${PACKAGE_DIR}/"
fi

# Create setup instructions
cat > "${PACKAGE_DIR}/SETUP_INSTRUCTIONS.md" << 'EOF'
# Quick Setup Instructions

## 1. Prerequisites
- Node.js v18+
- PostgreSQL 14+ with PostGIS
- Redis 6+

## 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your actual values:
# - Database credentials
# - Redis configuration  
# - JWT secrets
# - Google Maps API key
```

## 3. Installation
```bash
npm install --legacy-peer-deps
```

## 4. Database Setup
```bash
# Create database
createdb nightbff_dev

# Run migrations
npm run migration:run
```

## 5. Start Development
```bash
npm run start:dev
```

## 6. Verify Setup
- API Docs: http://localhost:3000/api/docs
- Health Check: http://localhost:3000/api/performance/health

## 📚 Full Documentation
See `DEVELOPER_HANDOFF_GUIDE.md` for complete setup and development guide.
EOF

# Create environment checklist
cat > "${PACKAGE_DIR}/ENVIRONMENT_CHECKLIST.md" << 'EOF'
# Environment Configuration Checklist

## Required Environment Variables

### ✅ Database Configuration
- [ ] `DATABASE_HOST` - PostgreSQL host
- [ ] `DATABASE_PORT` - PostgreSQL port (default: 5432)
- [ ] `DATABASE_USERNAME` - Database username
- [ ] `DATABASE_PASSWORD` - Database password
- [ ] `DATABASE_NAME` - Database name

### ✅ Redis Configuration  
- [ ] `REDIS_HOST` - Redis host
- [ ] `REDIS_PORT` - Redis port (default: 6379)
- [ ] `REDIS_PASSWORD` - Redis password (if required)

### ✅ JWT Security
- [ ] `JWT_SECRET` - JWT signing secret (minimum 32 characters)
- [ ] `JWT_EXPIRES_IN` - Token expiration (default: 7d)

### ✅ External APIs
- [ ] `GOOGLE_MAPS_API_KEY` - Required for location services

### ✅ Server Configuration
- [ ] `PORT` - Server port (default: 3000)
- [ ] `NODE_ENV` - Environment (development/production)

## Security Notes
🚨 Never commit actual .env files to version control
🔐 Use secure secret management in production
🛡️ Rotate JWT secrets regularly
EOF

# Create package info
cat > "${PACKAGE_DIR}/PACKAGE_INFO.txt" << EOF
NightBFF Backend Deployment Package
===================================

Package Created: $(date)
Git Branch: $(git branch --show-current)
Git Commit: $(git rev-parse --short HEAD)
Package Contents:
- Complete source code
- Configuration files
- Documentation
- Performance testing setup
- Environment templates

Next Steps:
1. Review SETUP_INSTRUCTIONS.md
2. Complete ENVIRONMENT_CHECKLIST.md
3. Follow DEVELOPER_HANDOFF_GUIDE.md for full setup

Support:
- API Documentation: Available at /api/docs after setup
- Performance Testing: See performance-testing/ directory
- Frontend Integration: See docs/FRONTEND_INTEGRATION_CHECKLIST.md
EOF

# Create directory structure overview
echo "📁 Creating directory structure overview..."
tree "${PACKAGE_DIR}" -I 'node_modules|dist|coverage' > "${PACKAGE_DIR}/DIRECTORY_STRUCTURE.txt" 2>/dev/null || echo "tree command not available"

# Create archive
echo "📦 Creating deployment archive..."
cd ..
tar -czf "${PACKAGE_NAME}.tar.gz" "${PACKAGE_NAME}"

echo "✅ Deployment package created successfully!"
echo ""
echo "📦 Package Location: ../${PACKAGE_NAME}.tar.gz"
echo "📁 Directory: ${PACKAGE_DIR}"
echo ""
echo "🚀 Ready for engineer handoff!"
echo ""
echo "Package Contents:"
echo "- Complete source code (excluding node_modules, dist)"
echo "- Configuration templates"
echo "- Comprehensive documentation"
echo "- Setup instructions"
echo "- Environment checklist"
echo ""
echo "Next Steps:"
echo "1. Share the .tar.gz file with your engineers"
echo "2. Provide actual environment values via secure channel"
echo "3. Review setup process together if needed" 