import asyncio
from datetime import datetime
from typing import Dict, Optional
from ..models.job import AsyncJob, JobStatus
from ..engines.ortools_client import OrToolsClient
from ..models.request import RoutingRequest
from ..utils.config import settings
import httpx


class JobManager:
    def __init__(self):
        self.jobs: Dict[str, AsyncJob] = {}
        self.ortools_client = OrToolsClient()

    def create_job(self, server: str, request_data: dict) -> AsyncJob:
        job = AsyncJob.create(server, request_data)
        self.jobs[job.id] = job
        return job

    def get_job(self, job_id: str) -> Optional[AsyncJob]:
        return self.jobs.get(job_id)

    async def process_job(self, job_id: str, timeout: int = 300):
        job = self.jobs.get(job_id)
        if not job:
            return

        try:
            job.status = JobStatus.PROCESSING
            job.updated_at = datetime.utcnow()
            
            # Look up server URL from config registry
            registry = settings.server_registry
            
            if job.server not in registry:
                raise ValueError(f"Unknown server: {job.server}")
            
            server_config = registry[job.server]
            server_url = server_config["url"]

            if server_url == "embedded":
                # OR-Tools: use embedded library
                routing_request = RoutingRequest(**job.request_data)
                result = await self.ortools_client.solve(routing_request)
                job.result = result.dict()
            else:
                # Always request geometry for road-following routes
                request = job.request_data.copy()
                if 'options' not in request:
                    request['options'] = {}
                if isinstance(request.get('options'), dict):
                    request['options']['g'] = True

                # Build headers (auto-inject API Key)
                headers = {"Content-Type": "application/json"}
                api_key = server_config.get("api_key")
                if api_key:
                    headers["X-API-Key"] = api_key

                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        server_url,
                        json=request,
                        timeout=float(timeout),
                        headers=headers,
                    )
                    response.raise_for_status()
                    job.result = response.json()
            
            job.status = JobStatus.COMPLETED
            
        except Exception as e:
            job.status = JobStatus.FAILED
            job.error = str(e)
        
        job.updated_at = datetime.utcnow()


# Global job manager instance
job_manager = JobManager()