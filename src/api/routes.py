import os
import asyncio
import httpx
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from ..models.request import RoutingRequest
from ..models.response import RoutingResponse
from ..models.job import JobResponse
from ..models.map_matching import MapMatchingRequest, MapMatchingResponse, MapMatchingPoint, MapMatchingSummary
from ..engines.ortools_client import OrToolsClient
from ..services.job_manager import job_manager
from ..utils.config import settings
from typing import Union

app = FastAPI(
    title="Route Playground API",
    description="Routing engine integration and visualization platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files for frontend if build directory exists
frontend_build_dir = "frontend/build"
if os.path.exists(frontend_build_dir):
    app.mount("/static", StaticFiles(directory=frontend_build_dir, html=True), name="static")

# Initialize OR-Tools client (only needed for local processing)
ortools_client = OrToolsClient()


@app.get("/")
async def root():
    return {"message": "Route Playground API", "version": "1.0.0"}


@app.post("/solve/{server}")
async def solve_routing_problem(
    server: str,
    request: dict,
    background_tasks: BackgroundTasks,
    timeout: int = Query(300, description="Timeout in seconds", ge=10, le=1800),
    async_request: bool = Query(False, alias="async", description="Process request asynchronously")
) -> Union[dict, JobResponse]:
    def fix_profiles(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if k == "profile" and v == "car_monday_adaptive":
                    obj[k] = "car"
                else:
                    fix_profiles(v)
        elif isinstance(obj, list):
            for item in obj:
                fix_profiles(item)

    try:
        # Fix legacy profiles in the request data
        fix_profiles(request)
        
        # Debug logging
        print(f"\n=== DEBUG: Incoming request for server: {server} ===")
        print(f"Request type: {type(request)}")
        print(f"Request keys: {list(request.keys()) if isinstance(request, dict) else 'Not a dict'}")
        print(f"Request size: {len(str(request))} characters")
        print(f"Timeout: {timeout} seconds")
        print(f"Async: {async_request}")
        
        # Handle async requests
        if async_request:
            job = job_manager.create_job(server, request)
            background_tasks.add_task(job_manager.process_job, job.id, timeout)
            return JobResponse(
                id=job.id,
                status=job.status,
                created_at=job.created_at,
                updated_at=job.updated_at
            )
        
        # Look up server in config registry
        registry = settings.server_registry
        
        if server not in registry:
            raise HTTPException(status_code=400, detail=f"Unknown server: {server}. Available: {list(registry.keys())}")
        
        server_config = registry[server]
        server_url = server_config["url"]
        
        # Special case: ortools-local uses embedded library
        if server_url == "embedded":
            routing_request = RoutingRequest(**request)
            result = await ortools_client.solve(routing_request)
            return result.dict()
        
        # Always request geometry for road-following routes on the map
        if 'options' not in request:
            request['options'] = {}
        if isinstance(request.get('options'), dict):
            request['options']['g'] = True

        # Build headers (auto-inject API Key for /optimize endpoints)
        headers = {"Content-Type": "application/json"}
        api_key = server_config.get("api_key")
        if api_key:
            headers["X-API-Key"] = api_key

        # Generic HTTP proxy for all other servers
        print(f"Sending request to {server} at {server_url}...")
        print(f"Jobs count: {len(request.get('jobs', []))}")
        print(f"Vehicles count: {len(request.get('vehicles', []))}")
        if api_key:
            print(f"API Key: {api_key[:10]}...")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                server_url,
                json=request,
                timeout=float(timeout),
                headers=headers,
            )
            print(f"Response status: {response.status_code}")
            response.raise_for_status()
            result = response.json()
            print(f"Response received successfully")
            return result
        
    except httpx.HTTPStatusError as e:
        error_msg = f"Engine Error ({e.response.status_code}): {e.response.text}"
        print(f"=== ENGINE ERROR ===")
        print(error_msg)
        print("=============")
        raise HTTPException(status_code=e.response.status_code, detail=error_msg)
    except Exception as e:
        print(f"=== SYSTEM ERROR ===")
        print(f"Error type: {type(e)}")
        print(f"Error message: {str(e)}")
        print("=============")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/job/{job_id}")
async def get_job_status(job_id: str) -> JobResponse:
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return JobResponse(
        id=job.id,
        status=job.status,
        created_at=job.created_at,
        updated_at=job.updated_at,
        result=job.result,
        error=job.error
    )


@app.post("/map-matching/match")
async def match_trajectory(request: MapMatchingRequest) -> MapMatchingResponse:
    """GPS 궤적을 도로 네트워크에 매칭하여 보정된 경로를 반환합니다."""
    try:
        print(f"\n=== DEBUG: Map Matching request ===")
        print(f"Trajectory points: {len(request.trajectory)}")
        
        # 외부 Map Matching 서비스 호출 (configurable via MAP_MATCHING_URL env var)
        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.map_matching_url,
                json={"trajectory": request.trajectory},
                timeout=30.0,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            result = response.json()
            
            print(f"Map Matching response received successfully")
            
            # 응답 데이터를 우리 모델 형식으로 변환
            matched_points = []
            if "data" in result and "matched_trace" in result["data"]:
                for point in result["data"]["matched_trace"]:
                    if len(point) >= 4:  # [경도, 위도, 타임스탬프, 플래그]
                        matched_points.append(MapMatchingPoint(
                            longitude=point[0],
                            latitude=point[1], 
                            timestamp=point[2],
                            flag=point[3]
                        ))
            
            # 요약 정보 생성
            summary = None
            if "data" in result and "summary" in result["data"]:
                summary_data = result["data"]["summary"]
                summary = MapMatchingSummary(
                    total_points=summary_data.get("total_points", len(request.trajectory)),
                    matched_points=summary_data.get("matched_points", len(matched_points)),
                    confidence=summary_data.get("confidence", 0.0),
                    shape_preservation_score=summary_data.get("shape_preservation_score", 0.0)
                )
            
            return MapMatchingResponse(
                success=result.get("success", True),
                message=result.get("message", "Map matching completed successfully"),
                matched_trace=matched_points,
                summary=summary
            )
            
    except Exception as e:
        print(f"=== Map Matching ERROR ===")
        print(f"Error type: {type(e)}")
        print(f"Error message: {str(e)}")
        if hasattr(e, 'response'):
            print(f"Response status: {e.response.status_code}")
            print(f"Response text: {e.response.text}")
        print("========================")
        
        return MapMatchingResponse(
            success=False,
            message="Map matching failed",
            matched_trace=[],
            error=str(e)
        )


@app.get("/servers")
async def get_available_servers():
    """Returns all backend-proxied servers from config."""
    servers = [
        {"name": name, "description": info["description"], "url": info["url"]}
        for name, info in settings.server_registry.items()
    ]
    return {"servers": servers}