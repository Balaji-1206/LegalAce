from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.logging import get_logger

logger = get_logger(__name__)

class PlanOutcomeBody(BaseModel):
    user_id: str = Field(..., description="Unique identifier for the user")
    scenario_id: str = Field(..., description="Identifier of the wizard scenario")
    plan_title: str = Field(..., description="Title of the action plan")
    status: Literal["in_progress", "resolved", "partially_resolved", "escalated"] = Field(..., description="Resolution status")
    recovered_amount: Optional[int] = Field(None, ge=0, description="Amount recovered or disputed (₹)")
    days_taken: Optional[int] = Field(None, ge=0, description="Number of days to reach this outcome")
    rating: Optional[int] = Field(None, ge=1, le=5, description="Citizen satisfaction rating (1-5)")
    feedback: Optional[str] = Field(None, max_length=1000, description="Qualitative feedback or advice for other citizens")

class OutcomeService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db
        self.col = db["plan_outcomes"]

    async def record_outcome(self, body: PlanOutcomeBody) -> dict[str, Any]:
        doc = {
            "user_id": body.user_id,
            "scenario_id": body.scenario_id,
            "plan_title": body.plan_title,
            "status": body.status,
            "recovered_amount": body.recovered_amount,
            "days_taken": body.days_taken,
            "rating": body.rating,
            "feedback": body.feedback,
            "updated_at": datetime.now(timezone.utc),
        }
        await self.col.update_one(
            {"user_id": body.user_id, "scenario_id": body.scenario_id},
            {"$set": doc, "$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
        logger.info(f"Recorded plan outcome for user '{body.user_id}', scenario '{body.scenario_id}' -> status: {body.status}")
        return {"status": "recorded", "scenario_id": body.scenario_id, "resolution": body.status}

    async def get_scenario_stats(self) -> dict[str, Any]:
        pipeline = [
            {
                "$group": {
                    "_id": "$scenario_id",
                    "total": {"$sum": 1},
                    "resolved": {
                        "$sum": {
                            "$cond": [{"$eq": ["$status", "resolved"]}, 1, 0]
                        }
                    },
                    "avg_days": {"$avg": "$days_taken"},
                    "total_recovered": {"$sum": "$recovered_amount"},
                    "avg_rating": {"$avg": "$rating"},
                }
            }
        ]
        cursor = self.col.aggregate(pipeline)
        results = await cursor.to_list(length=100)
        stats: dict[str, Any] = {}
        for r in results:
            sid = r["_id"]
            tot = r.get("total", 0)
            res = r.get("resolved", 0)
            rate = int(round((res / tot) * 100)) if tot > 0 else 0
            stats[sid] = {
                "total_cases": tot,
                "resolved_cases": res,
                "resolution_rate": rate,
                "avg_days": round(float(r.get("avg_days") or 0.0), 1),
                "total_recovered": int(r.get("total_recovered") or 0),
                "avg_rating": round(float(r.get("avg_rating") or 5.0), 1),
            }
        return stats

    async def get_user_outcomes(self, user_id: str) -> list[dict[str, Any]]:
        cursor = self.col.find({"user_id": user_id}).sort("updated_at", -1)
        docs = await cursor.to_list(length=50)
        for d in docs:
            d["_id"] = str(d["_id"])
            if isinstance(d.get("updated_at"), datetime):
                d["updated_at"] = d["updated_at"].isoformat()
            if isinstance(d.get("created_at"), datetime):
                d["created_at"] = d["created_at"].isoformat()
        return docs
