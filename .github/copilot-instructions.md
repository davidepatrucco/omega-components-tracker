# Omega Components Tracker - GitHub Copilot Instructions

**ALWAYS follow these instructions first and fallback to additional search and context gathering only if the information here is incomplete or found to be in error.**

Omega Components Tracker is a full-stack web application for tracking manufacturing components through various production stages. It consists of a Node.js/Express backend with MongoDB, a React frontend with Vite build system, and deployment via Docker containers on AWS.

## Working Effectively

### Prerequisites and Installation
- Install Node.js 18+ (tested with Node.js 20.19.4)
- Install MongoDB Community Edition locally
  - **WARNING**: MongoDB installation may fail due to network firewall limitations
  - If MongoDB installation fails, backend development will be severely limited
- Set up environment variables by copying `.env.example` to backend directory

### Bootstrap and Dependencies
- **Backend dependencies**: `cd omega-app/backend && npm ci` -- takes 18 seconds. NEVER CANCEL.
- **Frontend dependencies**: `cd omega-app/frontend && npm ci` -- takes 6 seconds. NEVER CANCEL.
- **Environment setup**: Copy `.env.example` to `omega-app/backend/.env` and configure:
  - `MONGO_URI` (default: `mongodb://localhost:27017/omega`)
  - `JWT_SECRET` and `JWT_REFRESH_SECRET`
  - `PORT` (default: 4000)
  - Optional: Azure File Share configuration for file management

### Build and Development
- **Frontend build**: `cd omega-app/frontend && npm run build` -- takes 6 seconds. NEVER CANCEL.
- **Frontend dev server**: `cd omega-app/frontend && npm run dev` -- starts on http://localhost:5173 in ~0.2 seconds
- **Backend dev server**: `cd omega-app/backend && npm run dev` -- requires MongoDB connection to start
  - **CRITICAL**: Backend WILL NOT START without MongoDB running and accessible
  - Default test user created automatically: username `d`, password `d`

### Testing
- **Backend tests**: `cd omega-app/backend && npm test` -- **CURRENTLY BROKEN** due to:
  - Network connectivity issues downloading MongoDB memory server
  - ES modules compatibility issue in shared/statusConfig.js
- **Frontend tests**: No test suite configured
- **Manual testing**: Always test login flow after changes using default user (d/d)

## Project Structure and Navigation

### Key Directories
```
omega-app/
├── backend/           # Node.js/Express API server
├── frontend/          # React application with Vite
├── shared/            # Shared utilities and configurations
├── infra/             # Docker deployment configurations
├── docs/              # Additional documentation
└── specifications/    # Technical specifications
```

### Important Files to Know
- `omega-app/backend/server.js` - Main backend entry point
- `omega-app/backend/models/` - MongoDB schemas (Component, Commessa, User, etc.)
- `omega-app/backend/routes/` - API endpoints
- `omega-app/backend/.env` - Backend environment configuration
- `omega-app/frontend/src/` - React application source
- `omega-app/shared/statusConfig.js` - Shared component status configuration
- `.env.example` - Template for environment variables

### API Structure
- Authentication: `/auth/login`, `/auth/refresh`
- Components: `/components` (CRUD operations)
- Commesse (Orders): `/commesse` 
- Users: `/utenti`
- Files: `/files` (Azure integration)
- Statistics: `/stats`

## Common Development Tasks

### Local Development Workflow
1. **Start MongoDB**: Ensure MongoDB service is running locally
2. **Backend**: `cd omega-app/backend && npm run dev`
3. **Frontend**: `cd omega-app/frontend && npm run dev` (separate terminal)
4. **Access**: Frontend at http://localhost:5173, API at http://localhost:4000

### Making Changes
- **Always test login flow** after backend changes using test user (d/d)
- **Component status changes**: Review `omega-app/shared/statusConfig.js` for status definitions
- **Database models**: Check `omega-app/backend/models/` before modifying schemas
- **API changes**: Update corresponding frontend API calls in `omega-app/frontend/src/`

### Troubleshooting
- **"MongoDB connection error"**: Ensure MongoDB is installed and running
- **"CORS origin not allowed"**: Frontend dev server must run on port 5173 or 5174
- **"Azure File Share not configured"**: Set Azure environment variables or disable file features
- **Build failures**: Clear node_modules and reinstall: `rm -rf node_modules && npm ci`

## Deployment and Production

### Docker Deployment
- **Production images**: Built via GitHub Actions and pushed to AWS ECR
- **Local testing**: No local Docker Compose setup available for development
- **Environment**: Uses `omega-app/infra/docker-compose.lightsail.yml` for AWS deployment

### CI/CD Pipeline
- **Deploy workflow**: `.github/workflows/deploy.yml`
- **Staging**: Auto-deploys from `develop` branch
- **Production**: Manual deployment from `main` branch with approval
- **Build times**: Docker builds can take 5-10 minutes. NEVER CANCEL.

## Validation and Quality

### Code Quality
- **No linting tools configured** - ESLint/Prettier not set up
- **Manual validation required**: Always test complete user workflows after changes
- **Backend validation**: Ensure API endpoints return expected data structure
- **Frontend validation**: Test UI interactions and component state management

### Testing Strategy
- **Unit tests**: Currently broken, need ES module configuration fixes
- **Integration testing**: Manual testing through UI required
- **User scenarios**: Test login → component creation → status changes → file uploads
- **Performance**: Monitor build times and startup performance

## Known Issues and Limitations

### Current Broken Features
- **Backend tests fail** due to MongoDB memory server download issues and ES modules
- **Network limitations** may prevent MongoDB installation in some environments
- **Documentation inconsistencies** - some docs reference old "component-tracker/" paths

### Required Manual Steps
- **MongoDB setup** must be done manually due to network limitations
- **Environment configuration** requires manual copying and editing of .env files
- **Testing** requires manual validation since automated tests are broken

### Development Constraints
- **Backend requires MongoDB** - cannot start without database connection
- **No hot-reload for backend** when changing shared modules
- **Azure File Share** features require proper Azure credentials

## Quick Reference Commands

```bash
# Full development setup from fresh clone
cd omega-app/backend && npm ci                    # 18 seconds
cd ../frontend && npm ci                          # 6 seconds  
cp ../../.env.example ../backend/.env            # Configure MongoDB URI
cd ../backend && npm run dev                      # Requires MongoDB
cd ../frontend && npm run dev                     # Port 5173

# Build for production
cd omega-app/frontend && npm run build            # 6 seconds

# Manual testing - always use these credentials
# Username: d
# Password: d
```

## Time Expectations
- **Dependency installation**: 24 seconds total (18s backend + 6s frontend)
- **Frontend build**: 6 seconds
- **Frontend dev startup**: 0.2 seconds  
- **Backend startup**: 2-5 seconds (after MongoDB connection)
- **Docker builds**: 5-10 minutes for full deployment build

**NEVER CANCEL long-running operations.** Always wait for completion or document specific timeout requirements.