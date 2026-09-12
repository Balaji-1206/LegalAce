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
from typing import Optional, Any

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


class DynamicScenarioBody(BaseModel):
    user_topic: str


class GenerateDocBody(BaseModel):
    template_id: str
    details: dict[str, Any] = {}


class NoticeDispatchRequest(BaseModel):
    template_id: str
    scenario_id: Optional[str] = None
    sender_name: str = "Aggrieved Citizen"
    sender_phone: Optional[str] = None
    sender_email: Optional[str] = None
    sender_address: Optional[str] = None
    recipient_name: str
    recipient_phone: Optional[str] = None
    recipient_email: Optional[str] = None
    recipient_address: Optional[str] = None
    dispute_amount: Optional[str] = "50000"
    facts_summary: Optional[str] = None
    notice_days: Optional[int] = 15
    custom_text: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/generate-dynamic-scenario")
async def generate_dynamic_scenario(body: DynamicScenarioBody):
    """
    Generate an on-the-fly custom legal decision tree scenario for any legal topic.
    """
    try:
        scenario_data = await service.generate_dynamic_scenario(body.user_topic)
        return scenario_data
    except Exception as e:
        logger.error(f"Error generating dynamic scenario: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate dynamic legal scenario.")


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


@router.post("/dispatch-notice")
async def dispatch_notice(body: NoticeDispatchRequest):
    """
    Generate or finalize statutory notice, compile 1-tap WhatsApp and Email dispatch links,
    and produce financial breakdown and statutory citations.
    """
    try:
        details = {
            "sender_name": body.sender_name,
            "sender_phone": body.sender_phone or "",
            "sender_email": body.sender_email or "",
            "sender_address": body.sender_address or "",
            "recipient_name": body.recipient_name,
            "recipient_phone": body.recipient_phone or "",
            "recipient_email": body.recipient_email or "",
            "recipient_address": body.recipient_address or "",
            "dispute_amount": body.dispute_amount or "50000",
            "facts_summary": body.facts_summary or "",
            "notice_days": body.notice_days or 15,
        }

        generated = service.generate_legal_document(body.template_id, details)
        doc_text = (
            body.custom_text.strip()
            if body.custom_text and body.custom_text.strip()
            else generated["document_text"]
        )

        statutes = ", ".join(generated.get("statutory_sections", []))
        total_claim = generated["financial_breakdown"]["total_claim"]
        executive_summary = (
            f"TO: {body.recipient_name}\n"
            f"FROM: {body.sender_name}\n"
            f"DEMAND: Refund/Payment of Rs. {total_claim:,.2f}/- within {body.notice_days} days.\n"
            f"STATUTES: {statutes}\n"
            f"GROUNDS: {body.facts_summary or 'Statutory breach & failure to perform legal obligations'}"
        )

        channels = service.build_dispatch_channels(
            notice_text=doc_text,
            recipient_phone=body.recipient_phone,
            recipient_email=body.recipient_email,
            subject=f"Legal Demand Notice — {generated['title']}",
            executive_summary=executive_summary,
        )

        return {
            "title": generated["title"],
            "document_text": doc_text,
            "executive_notice": channels["executive_notice"],
            "whatsapp_url": channels["whatsapp_url"],
            "mailto_url": channels["mailto_url"],
            "recipient_phone": channels["recipient_phone"],
            "recipient_email": channels["recipient_email"],
            "statutory_sections": generated["statutory_sections"],
            "financial_breakdown": generated["financial_breakdown"],
            "notice_days": body.notice_days,
            "ref_code": generated.get("ref_code", ""),
        }
    except Exception as e:
        logger.error(f"Error in dispatch_notice: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to prepare notice dispatch channels.")


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
    Supports both predefined and dynamic AI-generated scenarios.
    """
    plan = service.generate_action_plan(body.scenario_id, body.answers)
    return plan
