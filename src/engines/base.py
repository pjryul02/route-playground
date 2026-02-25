from abc import ABC, abstractmethod
from typing import Any, Dict, List
from ..models.request import RoutingRequest
from ..models.response import RoutingResponse


class RoutingEngine(ABC):
    """Base class for routing engines"""
    
    @abstractmethod
    async def solve(self, request: RoutingRequest) -> RoutingResponse:
        """Solve routing problem and return response"""
        pass
    
    @abstractmethod
    def get_engine_name(self) -> str:
        """Return engine name"""
        pass