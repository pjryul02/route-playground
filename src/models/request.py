from pydantic import BaseModel, Field, model_validator
from typing import List, Optional, Dict, Any, Union


class Location(BaseModel):
    # Support both [lon, lat] and {lat: x, lng: y}
    lat: float
    lng: float

    @model_validator(mode='before')
    @classmethod
    def validate_location(cls, data: Any) -> Any:
        if isinstance(data, list) and len(data) >= 2:
            return {"lng": data[0], "lat": data[1]}
        return data


class Vehicle(BaseModel):
    id: int
    start: Location
    end: Optional[Location] = None
    capacity: Optional[Union[int, List[int]]] = None
    skills: Optional[List[int]] = None


class Job(BaseModel):
    id: int
    location: Location
    service: Optional[int] = 300
    delivery: Optional[Union[int, List[int]]] = None
    pickup: Optional[Union[int, List[int]]] = None
    skills: Optional[List[int]] = None
    priority: Optional[int] = 100


class RoutingRequest(BaseModel):
    vehicles: List[Vehicle]
    jobs: List[Job]
    matrix: Optional[List[List[int]]] = None
    options: Optional[Dict[str, Any]] = None