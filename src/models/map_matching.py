from typing import List, Optional, Any
from pydantic import BaseModel, Field


class MapMatchingRequest(BaseModel):
    """Map Matching 요청 모델"""
    trajectory: List[List[float]] = Field(
        ...,
        min_items=2,
        description="GPS 궤적 [[경도, 위도, 타임스탬프, 정확도, 속도], ...]",
        example=[
            [126.978, 37.5665, 1734068400, 5.0, 0.0],
            [126.982, 37.567, 1734068460, 8.0, 12.5],
            [126.985, 37.5675, 1734068520, 6.0, 15.0],
            [126.989, 37.568, 1734068580, 10.0, 18.0],
            [126.992, 37.5685, 1734068640, 7.0, 14.0],
            [126.995, 37.569, 1734068700, 5.0, 16.0]
        ]
    )


class MapMatchingPoint(BaseModel):
    """Map Matching 결과 포인트"""
    longitude: float = Field(..., description="경도")
    latitude: float = Field(..., description="위도")
    timestamp: float = Field(..., description="타임스탬프")
    flag: float = Field(..., description="플래그 (0.5: 선별적보정, 1.0: 원본유지, 1.5: 스무딩, 2.0: 생성, 2.5: 보간)")


class MapMatchingSummary(BaseModel):
    """Map Matching 요약 정보"""
    total_points: int = Field(..., description="전체 입력 포인트 수")
    matched_points: int = Field(..., description="성공적으로 매칭된 포인트 수")
    confidence: float = Field(..., description="전체 매칭 신뢰도 (0-1)")
    shape_preservation_score: float = Field(..., description="원본 형태 보존 점수 (0-1)")


class MapMatchingResponse(BaseModel):
    """Map Matching 응답 모델"""
    success: bool = Field(..., description="요청 성공 여부")
    message: Optional[str] = Field(None, description="응답 메시지")
    matched_trace: List[MapMatchingPoint] = Field(default=[], description="매칭된 궤적")
    summary: Optional[MapMatchingSummary] = Field(None, description="매칭 요약 정보")
    error: Optional[str] = Field(None, description="오류 메시지")