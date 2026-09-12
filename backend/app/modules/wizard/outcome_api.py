from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from app.database.mongodb import get_database
from app.modules.wizard.outcome_service import OutcomeService, PlanOutcomeBody

router = APIRouter(prefix="/api/v1/wizard", tags=["Wizard Outcome Telemetry"])

def get_service(db = Depends(get_database)) -> OutcomeService:
    return OutcomeService(db)

@router.post("/outcome", summary="Record citizen action plan outcome and feedback")
async def record_outcome(
    body: PlanOutcomeBody,
    service: OutcomeService = Depends(get_service),
):
    try:
        return await service.record_outcome(body)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/outcomes/stats", summary="Get community resolution rate stats by scenario")
async def get_outcomes_stats(
    service: OutcomeService = Depends(get_service),
):
    return await service.get_scenario_stats()

@router.get("/outcomes/user/{user_id}", summary="Get action plan outcomes recorded by a user")
async def get_user_outcomes(
    user_id: str,
    service: OutcomeService = Depends(get_service),
):
    return await service.get_user_outcomes(user_id)
