import httpx
from typing import Dict, Any
from .base import RoutingEngine
from ..models.request import RoutingRequest
from ..models.response import RoutingResponse


class VroomClient(RoutingEngine):
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url
        
    async def solve(self, request: RoutingRequest) -> RoutingResponse:
        vroom_request = self._convert_to_vroom_format(request)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/",
                json=vroom_request,
                timeout=30.0
            )
            response.raise_for_status()
            
        vroom_response = response.json()
        return self._convert_from_vroom_format(vroom_response)
    
    def get_engine_name(self) -> str:
        return "VROOM"
    
    def _convert_to_vroom_format(self, request: RoutingRequest) -> Dict[str, Any]:
        return {
            "vehicles": [
                {
                    "id": v.id,
                    "start": [v.start.lng, v.start.lat],
                    "end": [v.end.lng, v.end.lat] if v.end else [v.start.lng, v.start.lat],
                    "capacity": v.capacity or [1000],
                    "skills": v.skills or []
                }
                for v in request.vehicles
            ],
            "jobs": [
                {
                    "id": j.id,
                    "location": [j.location.lng, j.location.lat],
                    "service": j.service or 300,
                    "delivery": j.delivery or [1],
                    "pickup": j.pickup or [0],
                    "skills": j.skills or [],
                    "priority": j.priority or 100
                }
                for j in request.jobs
            ],
            "options": {
                "g": True  # return geometry
            }
        }
    
    def _convert_from_vroom_format(self, vroom_response: Dict[str, Any]) -> RoutingResponse:
        return RoutingResponse(
            code=vroom_response.get("code", 0),
            summary=vroom_response.get("summary", {}),
            unassigned=vroom_response.get("unassigned", []),
            routes=[
                {
                    "vehicle": route["vehicle"],
                    "cost": route["cost"],
                    "steps": [
                        {
                            "type": step["type"],
                            "location": [step["location"][1], step["location"][0]],  # Convert lng,lat to lat,lng
                            "job": step.get("job"),
                            "arrival": step.get("arrival"),
                            "duration": step.get("duration")
                        }
                        for step in route["steps"]
                    ],
                    "geometry": route.get("geometry")
                }
                for route in vroom_response.get("routes", [])
            ],
            engine="VROOM"
        )