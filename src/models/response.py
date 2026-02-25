from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class Step(BaseModel):
    type: str  # "start", "job", "end"
    location: List[float]  # [lat, lng]
    job: Optional[int] = None
    arrival: Optional[int] = None
    duration: Optional[int] = None


class Route(BaseModel):
    vehicle: int
    cost: int
    steps: List[Step]
    geometry: Optional[str] = None


class Summary(BaseModel):
    cost: int
    unassigned: int
    delivery: List[int]
    amount: List[int]
    pickup: List[int]
    service: int
    duration: int
    waiting_time: int
    priority: int
    distance: Optional[int] = None


class RoutingResponse(BaseModel):
    code: int
    summary: Summary
    unassigned: List[Dict[str, Any]]
    routes: List[Route]
    engine: str