# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RoutePlayground is a full-stack application for vehicle routing optimization (VRP). It provides an interactive web interface with Leaflet maps for visualizing routing solutions from multiple engines (VROOM, OR-Tools, and more).

## Development Commands

### Backend Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
python main.py

# Run tests
pytest

# Lint and format
ruff check src/
black src/
```

### Frontend Development
```bash
cd frontend

# Install dependencies  
npm install

# Run development server (http://localhost:3030)
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Docker Development
```bash
# Start all services (frontend + backend + VROOM)
docker-compose up

# Start specific service
docker-compose up backend
docker-compose up frontend
```

## Project Architecture

### Backend (`src/`)
- **FastAPI Application**: Async web framework with automatic API documentation
- **Routing Engines**: Abstract base class with VROOM and OR-Tools implementations
- **Models**: Pydantic models for request/response validation
- **API Routes**: RESTful endpoints for routing operations
- **Config** (`src/utils/config.py`): Server URLs and settings via environment variables

### Frontend (`frontend/src/`)
- **React + TypeScript**: Component-based UI with type safety
- **Leaflet Integration**: Interactive maps via react-leaflet
- **Server Config** (`frontend/src/config/servers.json`): Single source of truth for all engine server definitions — add/remove servers by editing this JSON file only
- **State Management**: React hooks for application state
- **API Integration**: Axios client with direct and proxied server support

### Key Files
- `src/api/routes.py`: FastAPI application and API endpoints (config-driven server dispatch)
- `src/utils/config.py`: Environment-variable-based settings (server URLs, ports, etc.)
- `src/engines/base.py`: Abstract routing engine interface
- `src/engines/vroom_client.py`: VROOM API integration
- `src/engines/ortools_client.py`: OR-Tools solver integration
- `src/services/job_manager.py`: Async job processing (config-driven)
- `frontend/src/config/servers.json`: **Server registry** — edit this to add/modify engine endpoints
- `frontend/src/utils/serverHelpers.ts`: Data-driven server URL resolution (reads from servers.json)
- `frontend/src/components/MapComponent.tsx`: Leaflet map + route visualization
- `frontend/src/components/JsonPanel.tsx`: JSON input/output panel
- `frontend/src/components/RouteList.tsx`: Route details and vehicle summary

## Server Configuration

### Adding a new engine server (Frontend - Direct)
Edit `frontend/src/config/servers.json`:
```json
{
  "name": "my-engine",
  "description": "My Engine (8090)",
  "url": "http://host:8090/distribute",
  "type": "direct"
}
```

### Overriding backend server URLs (Environment Variables)
Create a `.env` file in the project root:
```env
ROOUTY_URL=https://custom-server.com/distribute
VROOM_LOCAL_URL=http://my-vroom:3000/
MAP_MATCHING_URL=http://matcher:8100/map-matching/match
API_HOST=0.0.0.0
API_PORT=8080
```

## Routing Engine Integration

### VROOM
- External HTTP service (Docker image: `ghcr.io/vroom-project/vroom-docker`)
- Requires OSRM backend for road-based routing
- Returns encoded polyline geometry for route visualization

### OR-Tools
- Integrated Python library (no external dependencies)
- Google's constraint programming solver
- Fallback option when VROOM is unavailable

## Testing

Run backend tests with pytest:
```bash
pytest tests/
```

Frontend uses React Testing Library:
```bash
cd frontend && npm test
```