# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

RoutePlayground is a full-stack vehicle routing optimization (VRP) platform. It provides an interactive web UI with Leaflet maps for visualizing routing solutions from multiple engines (VROOM via wrapper, OR-Tools). The backend connects to **VROOM Wrapper v3.0** -- not a standalone VROOM instance -- for all remote routing and map matching operations.

## Architecture

```
Frontend (React/TS :3030)
    |
    v
Backend (FastAPI :8080)  --[routing-net]--> VROOM Wrapper v3.0 (:8000)
    |                                           |-- /distribute
    |                                           |-- /optimize, /optimize/basic, /optimize/premium
    |                                           |-- /map-matching/match
    v
OR-Tools (embedded Python library, no external service)
```

## Development Commands

### Backend
```bash
pip install -r requirements.txt
python main.py                # Starts FastAPI on :8080
pytest tests/                 # Run tests
ruff check src/ && black src/ # Lint and format
```

### Frontend
```bash
cd frontend
npm install
npm start          # Dev server on http://localhost:3030
npm run build      # Production build
npm test           # React Testing Library
```

### Docker
```bash
docker-compose up -d            # Start backend + frontend
docker-compose up -d --build    # Rebuild and start
docker-compose logs -f          # Follow logs
```

Docker networking: the backend joins the `routing-net` external Docker network to reach `vroom-wrapper-v3:8000`. The frontend only joins `playground-net` (internal bridge).

## Server Configuration (Two Config Sources)

There are two independent server registries. Both must stay in sync when adding or removing engines.

### 1. Frontend -- `frontend/src/config/servers.json`

Drives the server dropdown rendered in the browser. Each entry has a `type` field:
- `"proxy"` -- request goes through the backend (`/solve/{server}`)
- `"direct"` -- frontend calls the URL directly (bypasses backend)

Currently 5 servers: `vroom-distribute`, `vroom-optimize`, `vroom-optimize-basic`, `vroom-optimize-premium`, `ortools-local`. All are type `"proxy"`.

### 2. Backend -- `src/utils/config.py`

`Settings` class (pydantic_settings) with a `server_registry` property that builds a dict of server name to `{url, description, api_key?}`. URLs are derived from env vars.

Key environment variables (with defaults):
| Variable | Default | Purpose |
|---|---|---|
| `WRAPPER_BASE_URL` | `http://vroom-wrapper-v3:8000` | Base URL for all wrapper endpoints |
| `WRAPPER_API_KEY` | `demo-key-12345` | API key auto-injected for `/optimize*` endpoints |
| `MAP_MATCHING_URL` | `http://vroom-wrapper-v3:8000/map-matching/match` | Map matching service URL |
| `API_HOST` | `0.0.0.0` | Backend listen address |
| `API_PORT` | `8080` | Backend listen port |

The API key (`demo-key-12345`) is sent as `X-API-Key` header. It is auto-injected by the backend for any server config that has an `api_key` field (the three `/optimize*` servers).

## API Endpoints (`src/api/routes.py`)

| Method | Path | Description |
|---|---|---|
| GET | `/` | Health check / version info |
| POST | `/solve/{server}` | Proxy routing request to the named server. Supports `?timeout=` and `?async=true` query params. |
| GET | `/servers` | Returns all servers from `settings.server_registry` |
| GET | `/job/{job_id}` | Poll async job status (pending/processing/completed/failed) |
| POST | `/map-matching/match` | Proxy GPS trajectory to the wrapper's map matching endpoint |

The `/solve/{server}` endpoint looks up `server` in `settings.server_registry`. If the URL is `"embedded"`, it runs OR-Tools locally. Otherwise it forwards the request via httpx, auto-injecting `X-API-Key` and `options.g = true` (geometry).

## Map Matching

Map matching is a core feature. The flow:
1. User enters GPS trajectory in `MapMatchingPanel.tsx` (format: `[[lon, lat, timestamp, accuracy, speed], ...]`)
2. The panel can call the wrapper directly (frontend `matchTrajectory` in `api.ts`) or go through the backend proxy (`POST /map-matching/match`)
3. Backend proxies to `settings.map_matching_url` (wrapper's `/map-matching/match`)
4. Response contains `matched_trace` (list of MapMatchingPoint with lon/lat/timestamp/flag) and `summary` (confidence, shape_preservation_score)

Models: `src/models/map_matching.py` -- `MapMatchingRequest`, `MapMatchingResponse`, `MapMatchingPoint`, `MapMatchingSummary`.

## Async Job Processing (`src/services/job_manager.py`)

When `?async=true` is passed to `/solve/{server}`:
1. `JobManager.create_job()` returns a `JobResponse` with a job ID immediately
2. `process_job()` runs in a FastAPI `BackgroundTasks` coroutine
3. Frontend polls `GET /job/{job_id}` at 1-second intervals until completed/failed
4. Jobs are stored in-memory (dict keyed by job ID); they do not survive restarts

The frontend also supports client-side async for `direct` type servers (job IDs prefixed `frontend-`).

## Key Files

### Backend
- `main.py` -- Uvicorn entrypoint
- `src/api/routes.py` -- All API endpoints, request proxying, API key injection
- `src/utils/config.py` -- `Settings` class with `server_registry` property, env var configuration
- `src/services/job_manager.py` -- In-memory async job manager with wrapper polling
- `src/models/map_matching.py` -- MapMatchingRequest / MapMatchingResponse / MapMatchingPoint / MapMatchingSummary
- `src/models/request.py` -- RoutingRequest model
- `src/models/response.py` -- RoutingResponse model
- `src/models/job.py` -- AsyncJob / JobResponse / JobStatus models
- `src/engines/ortools_client.py` -- OR-Tools embedded solver
- `src/engines/base.py` -- Abstract routing engine interface

### Frontend
- `frontend/src/config/servers.json` -- Server dropdown definitions (5 servers, all proxy type)
- `frontend/src/services/api.ts` -- HTTP client: `solveRouting`, `getJobStatus`, `pollJobUntilComplete`, `matchTrajectory`
- `frontend/src/utils/serverHelpers.ts` -- `isDirectServer`, `getServerUrl`, `getAllServers` (reads from servers.json)
- `frontend/src/components/MapMatchingPanel.tsx` -- Map matching UI tab with server selector and result display
- `frontend/src/components/panels/InputPanel.tsx` -- Routing input controls (server dropdown, timeout, async toggle, JSON/spreadsheet editor)
- `frontend/src/components/MapComponent.tsx` -- Leaflet map and route visualization

### Infrastructure
- `docker-compose.yml` -- backend (:8080) + frontend (:3030), `routing-net` external network for wrapper access
- `Dockerfile.backend` -- Backend container image
- `frontend/Dockerfile` -- Frontend container image

## Testing

```bash
# Backend
pytest tests/

# Frontend
cd frontend && npm test
```
