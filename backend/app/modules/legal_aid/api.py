"""
Legal Aid API — Feature 5

Endpoints:
  POST  /api/v1/legal-aid/check-eligibility   — Check free legal aid eligibility
  GET   /api/v1/legal-aid/nearest-authority    — Find nearest DLSA/SLSA
  GET   /api/v1/legal-aid/states               — Supported states list
  GET   /api/v1/legal-aid/categories           — Eligibility categories
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.core.logging import get_logger
from app.modules.legal_aid import service

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/legal-aid", tags=["legal-aid"])


# ---------------------------------------------------------------------------
# Request Models
# ---------------------------------------------------------------------------

class EligibilityCheckRequest(BaseModel):
    annual_income: int = 0
    state: str = "Other / Central"
    category_flags: list[str] = []  # e.g. ["sc_st", "woman_child", "disabled"]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/check-eligibility")
async def check_eligibility(body: EligibilityCheckRequest):
    """
    Check if user qualifies for free legal aid under
    Section 12, Legal Services Authorities Act 1987.
    """
    logger.info(
        f"Legal Aid eligibility check: income=₹{body.annual_income}, "
        f"state={body.state}, flags={body.category_flags}"
    )
    result = service.check_eligibility(
        annual_income=body.annual_income,
        state=body.state,
        category_flags=body.category_flags,
    )
    return result.model_dump()


@router.get("/nearest-authority")
async def get_nearest_authority(
    state: str = Query(..., description="Indian state name"),
    type: Optional[str] = Query(None, description="Authority type: DLSA, SLSA, NALSA"),
):
    """Get nearest legal authority offices for a given state."""
    authorities = service.get_authorities_by_state(state, authority_type=type)
    return {"authorities": authorities, "count": len(authorities)}


@router.get("/states")
async def get_states():
    """Return list of supported Indian states with DLSA/SLSA data."""
    states = service.get_supported_states()
    return {"states": states}


@router.get("/categories")
async def get_categories():
    """Return all statutory eligibility categories under Section 12, LSA Act 1987."""
    categories = service.get_eligibility_categories()
    return {"categories": categories}
