from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
import numpy as np
from typing import List, Dict, Any
from .base import RoutingEngine
from ..models.request import RoutingRequest, Location
from ..models.response import RoutingResponse, Route, Step, Summary


class OrToolsClient(RoutingEngine):
    def __init__(self):
        pass
        
    async def solve(self, request: RoutingRequest) -> RoutingResponse:
        try:
            solution = self._solve_vrp(request)
            return self._convert_to_response_format(solution, request)
        except Exception as e:
            return RoutingResponse(
                code=1,
                summary=Summary(
                    cost=0, unassigned=len(request.jobs), delivery=[0], 
                    amount=[0], pickup=[0], service=0, duration=0, 
                    waiting_time=0, priority=0
                ),
                unassigned=[{"id": j.id, "location": [j.location.lat, j.location.lng]} for j in request.jobs],
                routes=[],
                engine="OR-Tools"
            )
    
    def get_engine_name(self) -> str:
        return "OR-Tools"
    
    def _solve_vrp(self, request: RoutingRequest) -> Dict[str, Any]:
        locations = self._extract_locations(request)
        distance_matrix = self._create_distance_matrix(locations)
        
        num_vehicles = len(request.vehicles)
        manager = pywrapcp.RoutingIndexManager(
            len(locations),
            num_vehicles,
            [0] * num_vehicles,  # start indices (depot)
            [0] * num_vehicles   # end indices (depot)
        )
        
        routing = pywrapcp.RoutingModel(manager)
        
        def distance_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return distance_matrix[from_node][to_node]
        
        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
        
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )
        
        solution = routing.SolveWithParameters(search_parameters)
        
        return {
            "manager": manager,
            "routing": routing,
            "solution": solution,
            "locations": locations,
            "distance_matrix": distance_matrix
        }
    
    def _extract_locations(self, request: RoutingRequest) -> List[Location]:
        locations = []
        # Add depot (first vehicle's start location)
        locations.append(request.vehicles[0].start)
        # Add all job locations
        for job in request.jobs:
            locations.append(job.location)
        return locations
    
    def _create_distance_matrix(self, locations: List[Location]) -> List[List[int]]:
        # Simple Euclidean distance (in production, use real routing API)
        matrix = []
        for i, loc1 in enumerate(locations):
            row = []
            for j, loc2 in enumerate(locations):
                if i == j:
                    distance = 0
                else:
                    # Convert to approximate meters (* 111000 for rough lat/lng to meters)
                    lat_diff = (loc1.lat - loc2.lat) * 111000
                    lng_diff = (loc1.lng - loc2.lng) * 111000 * np.cos(np.radians(loc1.lat))
                    distance = int(np.sqrt(lat_diff**2 + lng_diff**2))
                row.append(distance)
            matrix.append(row)
        return matrix
    
    def _convert_to_response_format(self, solution_data: Dict[str, Any], request: RoutingRequest) -> RoutingResponse:
        manager = solution_data["manager"]
        routing = solution_data["routing"]
        solution = solution_data["solution"]
        locations = solution_data["locations"]
        
        if not solution:
            return RoutingResponse(
                code=1,
                summary=Summary(
                    cost=0, unassigned=len(request.jobs), delivery=[0], 
                    amount=[0], pickup=[0], service=0, duration=0, 
                    waiting_time=0, priority=0
                ),
                unassigned=[{"id": j.id, "location": [j.location.lat, j.location.lng]} for j in request.jobs],
                routes=[],
                engine="OR-Tools"
            )
        
        routes = []
        total_cost = 0
        
        for vehicle_id in range(len(request.vehicles)):
            index = routing.Start(vehicle_id)
            route_steps = []
            route_cost = 0
            
            # Add start step
            location_index = manager.IndexToNode(index)
            route_steps.append(Step(
                type="start",
                location=[locations[location_index].lat, locations[location_index].lng],
                arrival=0,
                duration=0
            ))
            
            while not routing.IsEnd(index):
                previous_index = index
                index = solution.Value(routing.NextVar(index))
                location_index = manager.IndexToNode(index)
                
                if not routing.IsEnd(index):
                    # This is a job location
                    job_id = location_index  # Job index (minus 1 for depot offset)
                    route_steps.append(Step(
                        type="job",
                        location=[locations[location_index].lat, locations[location_index].lng],
                        job=job_id,
                        arrival=route_cost,
                        duration=300  # Default service time
                    ))
                
                route_cost += routing.GetArcCostForVehicle(previous_index, index, vehicle_id)
            
            # Add end step
            route_steps.append(Step(
                type="end",
                location=[locations[0].lat, locations[0].lng],  # Back to depot
                arrival=route_cost,
                duration=0
            ))
            
            if len(route_steps) > 2:  # Has actual jobs
                routes.append(Route(
                    vehicle=vehicle_id,
                    cost=route_cost,
                    steps=route_steps
                ))
                total_cost += route_cost
        
        return RoutingResponse(
            code=0,
            summary=Summary(
                cost=total_cost,
                unassigned=0,
                delivery=[1],
                amount=[1],
                pickup=[0],
                service=len(request.jobs) * 300,
                duration=total_cost,
                waiting_time=0,
                priority=100
            ),
            unassigned=[],
            routes=routes,
            engine="OR-Tools"
        )