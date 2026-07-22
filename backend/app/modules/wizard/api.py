"""
Wizard API — Module 4: What Should I Do?

Endpoints:
  GET  /api/v1/wizard/categories
  GET  /api/v1/wizard/scenarios/{category}
  GET  /api/v1/wizard/scenario/{id}
  POST /api/v1/wizard/session
  POST /api/v1/wizard/session/{session_id}/answers
  GET  /api/v1/wizard/history/{user_id}
  POST /api/v1/wizard/quick-plan          — No session, just get plan directly
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.core.logging import get_logger
from app.modules.wizard import scenarios_data, service

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1/wizard", tags=["wizard"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class SessionCreateBody(BaseModel):
    user_id: str
    scenario_id: str


class AnswersBody(BaseModel):
    user_id: str
    answers: dict[str, str]  # {"q1": "yes", "q2": "no", "q3": "1 month"}


class QuickPlanBody(BaseModel):
    scenario_id: str
    answers: dict[str, str]


class GenerateDocBody(BaseModel):
    template_id: str
    details: dict[str, str] = {}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/generate-document")
async def generate_document(body: GenerateDocBody):
    """
    Generate an official statutory legal demand notice or complaint text.
    """
    try:
        doc_result = service.generate_legal_document(body.template_id, body.details)
        return doc_result
    except Exception as e:
        logger.error(f"Error generating legal document: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate legal document.")

@router.get("/categories")
async def get_categories():
    """Return all wizard categories with metadata."""
    return {"categories": scenarios_data.get_categories()}


@router.get("/scenarios/{category}")
async def get_scenarios_by_category(category: str):
    """Return all scenarios for a given category."""
    scenarios = scenarios_data.get_scenarios_by_category(category)
    if not scenarios:
        raise HTTPException(status_code=404, detail=f"No scenarios found for category: {category}")
    # Strip full question text — just return summary info for listing
    summary = [
        {"scenario_id": s["scenario_id"], "title": s["title"],
         "title_ta": s.get("title_ta"), "title_hi": s.get("title_hi"),
         "icon": s.get("icon", "⚖️"), "question_count": len(s["questions"])}
        for s in scenarios
    ]
    return {"category": category, "scenarios": summary}


@router.get("/scenario/{scenario_id}")
async def get_scenario(scenario_id: str):
    """Return full scenario with all questions (for the wizard flow)."""
    scenario = scenarios_data.get_scenario(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario not found: {scenario_id}")
    return scenario


@router.post("/session")
async def create_session(body: SessionCreateBody):
    """Create a new wizard session for a user."""
    # Validate scenario exists
    scenario = scenarios_data.get_scenario(body.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    session = await service.create_session(body.user_id, body.scenario_id)
    session["id"] = str(session.get("id", ""))
    return {"session_id": session["id"], "scenario": scenario}


@router.post("/session/{session_id}/answers")
async def submit_answers(session_id: str, body: AnswersBody):
    """Submit answers for a session and get the action plan."""
    result = await service.submit_answers(session_id, body.user_id, body.answers)
    if result is None:
        raise HTTPException(status_code=404, detail="Session not found or access denied")
    return result


@router.get("/history/{user_id}")
async def get_history(user_id: str):
    """Get all past wizard sessions for a user."""
    sessions = await service.get_user_sessions(user_id)
    return {"sessions": sessions, "count": len(sessions)}


@router.post("/quick-plan")
async def quick_plan(body: QuickPlanBody):
    """
    Get an action plan directly without creating a session.
    Useful for offline / cached scenarios.
    """
    scenario = scenarios_data.get_scenario(body.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    plan = service.generate_action_plan(body.scenario_id, body.answers)
    return plan
