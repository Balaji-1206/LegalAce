"""
Pydantic schemas for the Deadline Engine API.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class DeadlineCreateRequest(BaseModel):
    user_id: str
    title: str
    description: str
    category: str = "general"
    deadline_date: datetime
    source_type: str = "manual"
    warning_days: Optional[List[int]] = [30, 15, 7, 1]
    priority: str = "medium"
    related_conversation_id: Optional[str] = None


class DeadlineExtractRequest(BaseModel):
    user_id: str
    text: str = Field(..., description="Raw text (chat message or document) to extract deadlines from")
    source_type: str = "chat"
    conversation_id: Optional[str] = None


class DeadlineCompleteRequest(BaseModel):
    pass  # Empty body; action is determined by URL


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class DeadlineResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: str
    category: str
    deadline_date: datetime
    warning_days: List[int]
    status: str
    priority: str
    source_type: str
    days_remaining: int
    related_conversation_id: Optional[str] = None
    created_at: datetime

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class HealthScoreResponse(BaseModel):
    user_id: str
    score: int
    grade: str                   # Excellent / Good / Fair / At Risk / Critical
    total_deadlines: int
    active: int
    completed: int
    expired: int
    high_priority_active: int
    strengths: List[str]
    risks: List[str]
    computed_at: str


class ExtractedDeadline(BaseModel):
    title: str
    description: str
    category: str
    deadline_date: Optional[datetime] = None
    days_from_now: Optional[int] = None
    priority: str = "medium"
    warning_days: List[int] = [30, 15, 7, 1]


class DeadlineExtractResponse(BaseModel):
    deadlines: List[DeadlineExtractResponse | ExtractedDeadline]
    created_count: int
    source_text_preview: str


# Fix forward reference
DeadlineExtractResponse.model_rebuild()


class UpcomingDeadlinesResponse(BaseModel):
    deadlines: List[DeadlineResponse]
    count: int
