"""
Pydantic models for API requests and responses
"""
from typing import List, Optional
from pydantic import BaseModel


class ExtractedTask(BaseModel):
    title: str
    description: Optional[str] = None
    urgency: Optional[int] = None  # 1-3 scale
    importance: Optional[int] = None  # 1-3 scale
    time_required: Optional[int] = None  # 1-3 scale
    category: Optional[str] = None


class VoiceProcessResponse(BaseModel):
    transcript: str
    tasks: List[ExtractedTask]
    processing_time: float


class TaskWeightingRequest(BaseModel):
    unweighted_tasks: List[dict]  # Tasks without weights
    reference_tasks: List[dict]  # Existing weighted tasks for reference
    user_id: Optional[str] = None


class TaskSuggestion(BaseModel):
    id: str
    urgency: int  # 1-3
    importance: int  # 1-3
    time_required: int  # 1-3
    category: Optional[str] = None


class TaskWeightingResponse(BaseModel):
    suggestions: List[TaskSuggestion]
    processing_time: float

