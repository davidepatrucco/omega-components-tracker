# Omega Components Tracker

Always follow these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Overview
Omega Components Tracker is a full-stack JavaScript application for tracking manufacturing components through their lifecycle. The application consists of:
- **Backend**: Node.js/Express API with MongoDB (Mongoose) for data persistence
- **Frontend**: React application built with Vite and Ant Design UI components
- **Infrastructure**: Docker containerization with deployment scripts

## Working Effectively

### Prerequisites
- Node.js 18+ (use existing system Node.js v20.19.4)
- Docker for MongoDB container
- Git for version control

### Initial Setup and Build
Run these commands from the repository root:

```bash
# Setup MongoDB container (NEVER CANCEL - container download takes 60+ seconds)
docker run --name mongo-omega -p 27017:27017 -d mongo:5
# NEVER CANCEL: First run downloads 243MB+ image. Set timeout to 300+ seconds.

# Install and build backend (5 seconds)
cd omega-app/backend
npm ci

# Seed database (1 second)
MONGO_URI="mongodb://localhost:27017/omega" npm run seed

# Install and build frontend (20 seconds total)
cd ../frontend
npm install  # NOTE: Uses npm install due to missing package-lock.json
npm run build
# NEVER CANCEL: Build takes 3-5 seconds. Set timeout to 30+ seconds.
```

### Development Servers
Start development servers in separate terminals:

```bash
# Terminal 1: Backend (from omega-app/backend/)
MONGO_URI="mongodb://localhost:27017/omega" PORT=4000 npm run dev

# Terminal 2: Frontend (from omega-app/frontend/)
VITE_API_URL="http://localhost:4000" npm run dev
```

**NOTE**: Documentation mentions coordinated `npm run dev` script, but no root package.json exists. 
You must start backend and frontend separately as shown above.

**CRITICAL TIMING EXPECTATIONS**:
- Backend npm ci: 1 second (cached), 5 seconds (fresh)
- Frontend npm install: 4 seconds (cached), 15 seconds (fresh)
- Frontend build: 3 seconds
- Database seed: < 1 second
- MongoDB container start: 60+ seconds (NEVER CANCEL first download)
- Frontend dev server startup: < 1 second
- Backend startup: < 1 second

### Production Build
```bash
# Frontend production build
cd omega-app/frontend
VITE_API_URL="https://your-api-domain.com" npm run build
# Output: dist/ directory with static files
```

## Validation and Testing

### Manual Validation Steps
After making any changes, ALWAYS run these validation steps:

1. **Backend Health Check**:
   ```bash
   curl http://localhost:4000/health
   # Expected: {"status":"ok","db":"mock"}
   ```

2. **API Endpoints Test**:
   ```bash
   curl http://localhost:4000/components
   # Expected: {"items":[],"total":0}
   ```

3. **Frontend Accessibility**:
   ```bash
   curl http://localhost:5173/ | head -5
   # Expected: HTML with "Omega App - PoC" title
   ```

4. **Database Connection**:
   ```bash
   # Backend logs should show: "PoC backend listening on 4000"
   # Seed should complete without errors
   ```

### User Scenarios to Test
When making changes, validate these complete workflows:

1. **Component Lifecycle**:
   ```bash
   # Create component
   curl -X POST "http://localhost:4000/components" \
     -H "Content-Type: application/json" \
     -d '{"commessaId":"c1","commessaName":"Test Commessa","name":"Test Component","status":"1"}'
   
   # Change component status (use componentId from previous response)
   curl -X POST "http://localhost:4000/changestatus" \
     -H "Content-Type: application/json" \
     -d '{"componentId":"cmp_XXXXX","to":"2","note":"Test status change"}'
   
   # Retrieve components
   curl "http://localhost:4000/components"
   ```

2. **Database Operations**:
   ```bash
   # Seed database with default work statuses and admin user
   MONGO_URI="mongodb://localhost:27017/omega" npm run seed
   
   # Verify MongoDB connection and basic CRUD operations
   # Backend logs should show successful database connection
   ```

## Important File Locations

### Backend Structure (`omega-app/backend/`)
- `server.js` - Main Express server with API routes
- `models/` - Mongoose schemas (Component, User, WorkStatus, Commessa)
- `scripts/seed.js` - Database seeding script
- `package.json` - Dependencies and scripts

### Frontend Structure (`omega-app/frontend/`)
- `src/App.jsx` - Main React component with Ant Design layout
- `src/main.jsx` - React application entry point
- `package.json` - Dependencies and build scripts
- `dist/` - Built static files (after npm run build)

### Configuration and Deployment
- `.github/workflows/ci.yml` - GitHub Actions CI pipeline
- `omega-app/infra/` - Docker compose and deployment scripts
- `omega-app/specifications/` - Architecture documentation
- `omega-app/docs/` - CI/CD strategy documentation

### Key Environment Variables
- `MONGO_URI` - MongoDB connection string (backend)
- `PORT` - Backend server port (default: 4000)
- `VITE_API_URL` - API endpoint for frontend builds

## Common Development Tasks

### Adding New API Endpoints
1. Edit `omega-app/backend/server.js`
2. Follow existing pattern for route handlers
3. Test with curl commands
4. Update frontend API calls if needed

### Modifying Frontend Components
1. Edit files in `omega-app/frontend/src/`
2. Use Ant Design components for consistency
3. Test in browser at http://localhost:5173/
4. Run build to verify production bundle

### Database Schema Changes
1. Edit models in `omega-app/backend/models/`
2. Update seed script if needed
3. Test with fresh database seed

## CI/CD Information

### GitHub Actions Workflow
- Triggers on push/PR to any branch
- Installs Node.js 18, backend deps, builds frontend
- Build time: ~10 seconds total (validated)
- **NEVER CANCEL**: Set timeout to 120+ seconds for CI builds

### Docker Deployment
- Uses `omega-app/infra/docker-compose.lightsail.yml`
- Traefik reverse proxy with SSL certificates
- Deployment scripts in `omega-app/infra/`

## Troubleshooting

### Common Issues
1. **Frontend npm ci fails**: Use `npm install` instead (no package-lock.json exists)
2. **MongoDB connection errors**: Ensure Docker container is running and accessible
3. **CORS errors**: Backend allows localhost:5173 origin for development
4. **Build warnings**: Ant Design "use client" warnings are cosmetic, build succeeds

### Debug Commands
```bash
# Check running processes
docker ps | grep mongo
curl http://localhost:4000/health
curl http://localhost:5173/

# View logs
docker logs mongo-omega
# Backend logs in terminal running npm run dev
```

### Reset Environment
```bash
# Clean database
docker stop mongo-omega && docker rm mongo-omega
docker run --name mongo-omega -p 27017:27017 -d mongo:5

# Clean build artifacts
rm -rf omega-app/frontend/dist/
rm -rf omega-app/backend/node_modules/
rm -rf omega-app/frontend/node_modules/
```

## Security Notes
- Default admin user: username `admin`, password `changeme`
- MongoDB runs without authentication in development
- JWT tokens used for API authentication (not implemented in PoC)
- File uploads handled by multer to `./upload` directory

## Performance Expectations
- Backend startup: Immediate (< 1 second)
- Frontend dev server startup: 179ms
- Frontend build: 3 seconds with 1254 modules
- Database seed: < 1 second
- API response times: < 100ms for basic operations

**CRITICAL**: NEVER CANCEL any build, installation, or container setup command. These processes are designed to complete successfully given adequate time.