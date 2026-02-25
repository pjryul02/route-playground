from pydantic import BaseModel
from typing import Optional, Dict, Any
from enum import Enum
import uuid
from datetime import datetime


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AsyncJob(BaseModel):
    id: str
    status: JobStatus
    created_at: datetime
    updated_at: datetime
    server: str
    request_data: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

    @classmethod
    def create(cls, server: str, request_data: Dict[str, Any]) -> "AsyncJob":
        now = datetime.utcnow()
        return cls(
            id=str(uuid.uuid4()),
            status=JobStatus.PENDING,
            created_at=now,
            updated_at=now,
            server=server,
            request_data=request_data
        )


class JobResponse(BaseModel):
    id: str
    status: JobStatus
    created_at: datetime
    updated_at: datetime
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None