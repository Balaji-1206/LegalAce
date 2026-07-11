"""
Deadline Engine API — Module 3

Endpoints:
  POST   /api/v1/deadlines/extract
  POST   /api/v1/deadlines/
  GET    /api/v1/deadlines/user/{user_id}
  GET    /api/v1/deadlines/upcoming/{user_id}
  PUT    /api/v1/deadlines/{id}/complete
  PUT    /api/v1/deadlines/{id}/dismiss
  DELETE /api/v1/deadlines/{id}
  GET    /api/v1/health-score/{user_id}
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.core.logging import get_logger
from app.modules.deadline_engine import service, extractor

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1", tags=["deadline-engine"])


# ---------------------------------------------------------------------------
# Request/Response Models (inline — keeps api.py self-contained)
# ---------------------------------------------------------------------------

class DeadlineCreateBody(BaseModel):
    user_id: str
    title: str
    description: str
    category: str = "general"
    deadline_date: datetime
    source_type: str = "manual"
    warning_days: list[int] = [30, 15, 7, 1]
    priority: str = "medium"
    related_conversation_id: Optional[str] = None


class ExtractBody(BaseModel):
    user_id: str
    text: str
    source_type: str = "chat"
    conversation_id: Optional[str] = None
    auto_save: bool = True  # If True, save extracted deadlines to DB


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/deadlines/extract")
async def extract_deadlines(body: ExtractBody):
    """
    AI-powered deadline extraction from free-form text.
    Optionally auto-saves extracted deadlines to the user's account.
    """
    logger.info(f"Extracting deadlines for user {body.user_id} from text ({len(body.text)} chars)")

    raw_deadlines = await extractor.extract_deadlines_from_text(body.text)

    if not raw_deadlines:
        return {
            "deadlines": [],
            "created_count": 0,
            "source_text_preview": body.text[:80],
            "message": "No legal deadlines could be extracted from the provided text.",
        }

    saved = []
    if body.auto_save:
        for dl in raw_deadlines:
            try:
                # Compute deadline_date from days_from_now if needed
                deadline_date = None
                if dl.get("deadline_date"):
                    raw_date = dl["deadline_date"]
                    if isinstance(raw_date, str):
                        deadline_date = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
                    else:
                        deadline_date = raw_date
                elif dl.get("days_from_now"):
                    deadline_date = datetime.now(timezone.utc) + timedelta(days=int(dl["days_from_now"]))

                if deadline_date:
                    saved_dl = await service.create_deadline(
                        user_id=body.user_id,
                        title=dl.get("title", "Legal Deadline"),
                        description=dl.get("description", ""),
                        category=dl.get("category", "general"),
                        deadline_date=deadline_date,
                        source_type=body.source_type,
                        warning_days=dl.get("warning_days", [30, 15, 7, 1]),
                        priority=dl.get("priority", "medium"),
                        related_conversation_id=body.conversation_id,
                    )
                    saved.append(saved_dl)
            except Exception as e:
                logger.error(f"Failed to save extracted deadline: {e}")

    return {
        "deadlines": saved if body.auto_save else raw_deadlines,
        "created_count": len(saved),
        "source_text_preview": body.text[:100],
    }


@router.post("/deadlines/")
async def create_deadline(body: DeadlineCreateBody):
    """Manually create a deadline."""
    created = await service.create_deadline(
        user_id=body.user_id,
        title=body.title,
        description=body.description,
        category=body.category,
        deadline_date=body.deadline_date,
        source_type=body.source_type,
        warning_days=body.warning_days,
        priority=body.priority,
        related_conversation_id=body.related_conversation_id,
    )
    return created


@router.get("/deadlines/user/{user_id}")
async def get_user_deadlines(
    user_id: str,
    status: Optional[str] = Query(None, description="Filter by status: active|completed|expired"),
):
    """Get all deadlines for a user, optionally filtered by status."""
    deadlines = await service.get_user_deadlines(user_id, status_filter=status)
    return {"deadlines": deadlines, "count": len(deadlines)}


@router.get("/deadlines/upcoming/{user_id}")
async def get_upcoming_deadlines(
    user_id: str,
    days_ahead: int = Query(90, description="How many days ahead to look"),
):
    """Get upcoming deadlines within the next N days."""
    # Auto-seed demo data if user has no deadlines
    deadlines = await service.get_upcoming_deadlines(user_id, days_ahead=days_ahead)
    if not deadlines:
        seeded = await service.seed_sample_deadlines(user_id)
        if seeded:
            deadlines = await service.get_upcoming_deadlines(user_id, days_ahead=days_ahead)
    return {"deadlines": deadlines, "count": len(deadlines)}


@router.put("/deadlines/{deadline_id}/complete")
async def complete_deadline(deadline_id: str, user_id: str = Query(...)):
    """Mark a deadline as completed."""
    result = await service.mark_deadline_complete(deadline_id, user_id)
    if not result:
        raise HTTPException(status_code=404, detail="Deadline not found or access denied")
    return result


@router.put("/deadlines/{deadline_id}/dismiss")
async def dismiss_deadline(deadline_id: str, user_id: str = Query(...)):
    """Snooze / dismiss a deadline (extends by 7 days)."""
    result = await service.dismiss_deadline(deadline_id, user_id)
    if not result:
        raise HTTPException(status_code=404, detail="Deadline not found or access denied")
    return result


@router.delete("/deadlines/{deadline_id}")
async def delete_deadline(deadline_id: str, user_id: str = Query(...)):
    """Delete a deadline."""
    deleted = await service.delete_deadline(deadline_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Deadline not found or access denied")
    return {"success": True, "message": "Deadline deleted"}


@router.get("/health-score/{user_id}")
async def get_health_score(user_id: str):
    """
    Compute and return the Legal Health Score (0–100) for a user.
    Auto-seeds demo data if user has no deadlines.
    """
    await service.update_expired_statuses()
    score_data = await service.compute_health_score(user_id)
    
    if score_data["total_deadlines"] == 0:
        await service.seed_sample_deadlines(user_id)
        score_data = await service.compute_health_score(user_id)
    
    return score_data
