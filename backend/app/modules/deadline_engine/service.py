"""
Deadline Engine Service Layer — Module 3

Handles CRUD for deadlines, health score computation, and status updates.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from bson import ObjectId

from app.core.logging import get_logger
from app.database.mongodb import get_database
from app.modules.deadline_engine.models import deadline_document

logger = get_logger(__name__)

COLLECTION = "deadlines"


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _days_remaining(deadline_date: datetime) -> int:
    now = datetime.now(timezone.utc)
    if deadline_date.tzinfo is None:
        deadline_date = deadline_date.replace(tzinfo=timezone.utc)
    delta = deadline_date - now
    return max(int(delta.days), -999)


def _serialize(doc: dict) -> dict:
    """Convert MongoDB doc to API-friendly dict."""
    doc["id"] = str(doc.pop("_id", ""))
    if "deadline_date" in doc:
        doc["days_remaining"] = _days_remaining(doc["deadline_date"])
    # Convert datetime fields to ISO strings for JSON
    for field in ("deadline_date", "created_at", "updated_at", "completed_at"):
        if field in doc and isinstance(doc[field], datetime):
            doc[field] = doc[field].isoformat()
    return doc


# ---------------------------------------------------------------------------
# CRUD Operations
# ---------------------------------------------------------------------------

async def create_deadline(
    user_id: str,
    title: str,
    description: str,
    category: str,
    deadline_date: datetime,
    source_type: str = "manual",
    warning_days: Optional[List[int]] = None,
    priority: str = "medium",
    related_conversation_id: Optional[str] = None,
) -> dict:
    db = get_database()
    doc = deadline_document(
        user_id=user_id,
        title=title,
        description=description,
        category=category,
        deadline_date=deadline_date,
        source_type=source_type,
        warning_days=warning_days or [30, 15, 7, 1],
        priority=priority,
        related_conversation_id=related_conversation_id,
    )
    result = await db[COLLECTION].insert_one(doc)
    doc["_id"] = result.inserted_id
    logger.info(f"Created deadline '{title}' for user {user_id}")
    return _serialize(doc)


async def get_user_deadlines(user_id: str, status_filter: Optional[str] = None) -> List[dict]:
    db = get_database()
    query: dict = {"user_id": user_id}
    if status_filter:
        query["status"] = status_filter

    cursor = db[COLLECTION].find(query).sort("deadline_date", 1)
    results = []
    async for doc in cursor:
        results.append(_serialize(doc))
    return results


async def get_upcoming_deadlines(user_id: str, days_ahead: int = 90) -> List[dict]:
    db = get_database()
    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(days=days_ahead)

    cursor = db[COLLECTION].find({
        "user_id": user_id,
        "status": "active",
        "deadline_date": {"$gte": now, "$lte": cutoff},
    }).sort("deadline_date", 1)

    results = []
    async for doc in cursor:
        results.append(_serialize(doc))
    return results


async def mark_deadline_complete(deadline_id: str, user_id: str) -> Optional[dict]:
    db = get_database()
    now = datetime.now(timezone.utc)
    result = await db[COLLECTION].find_one_and_update(
        {"_id": ObjectId(deadline_id), "user_id": user_id},
        {"$set": {"status": "completed", "completed_at": now, "updated_at": now}},
        return_document=True,
    )
    return _serialize(result) if result else None


async def dismiss_deadline(deadline_id: str, user_id: str) -> Optional[dict]:
    """Soft-dismiss: extend deadline by 7 days and mark as snoozed."""
    db = get_database()
    doc = await db[COLLECTION].find_one({"_id": ObjectId(deadline_id), "user_id": user_id})
    if not doc:
        return None
    current_date = doc["deadline_date"]
    if current_date.tzinfo is None:
        current_date = current_date.replace(tzinfo=timezone.utc)
    new_date = current_date + timedelta(days=7)
    result = await db[COLLECTION].find_one_and_update(
        {"_id": ObjectId(deadline_id)},
        {"$set": {"deadline_date": new_date, "updated_at": datetime.now(timezone.utc)}},
        return_document=True,
    )
    return _serialize(result) if result else None


async def delete_deadline(deadline_id: str, user_id: str) -> bool:
    db = get_database()
    result = await db[COLLECTION].delete_one({
        "_id": ObjectId(deadline_id),
        "user_id": user_id,
    })
    return result.deleted_count > 0


# ---------------------------------------------------------------------------
# Status Auto-Update (called by scheduler)
# ---------------------------------------------------------------------------

async def update_expired_statuses() -> int:
    """Mark any active deadlines that have passed as expired."""
    db = get_database()
    now = datetime.now(timezone.utc)
    result = await db[COLLECTION].update_many(
        {"status": "active", "deadline_date": {"$lt": now}},
        {"$set": {"status": "expired", "updated_at": now}},
    )
    count = result.modified_count
    if count:
        logger.info(f"Marked {count} deadline(s) as expired")
    return count


# ---------------------------------------------------------------------------
# Legal Health Score
# ---------------------------------------------------------------------------

async def compute_health_score(user_id: str) -> dict:
    """
    Score 0–100 based on deadline status composition.
    
    Algorithm:
      base = 100
      - Each expired deadline:        -15 pts
      - Each high-priority active:    -10 pts
      - Each medium-priority active:  -5 pts
      - Completed bonuses:            +5 pts each (capped at +20)
    """
    db = get_database()
    all_docs = await db[COLLECTION].find({"user_id": user_id}).to_list(length=500)

    if not all_docs:
        return _empty_health_score(user_id)

    total = len(all_docs)
    active = [d for d in all_docs if d["status"] == "active"]
    completed = [d for d in all_docs if d["status"] == "completed"]
    expired = [d for d in all_docs if d["status"] == "expired"]
    high_active = [d for d in active if d.get("priority") == "high"]
    medium_active = [d for d in active if d.get("priority") == "medium"]

    score = 100
    score -= len(expired) * 15
    score -= len(high_active) * 10
    score -= len(medium_active) * 5
    score += min(len(completed) * 5, 20)  # Bonus capped at +20
    score = max(0, min(100, score))

    # Grade
    if score >= 85:
        grade = "Excellent"
    elif score >= 70:
        grade = "Good"
    elif score >= 50:
        grade = "Fair"
    elif score >= 30:
        grade = "At Risk"
    else:
        grade = "Critical"

    # Strengths & Risks
    strengths = []
    risks = []

    if not expired:
        strengths.append("No overdue legal actions")
    if len(completed) >= 2:
        strengths.append(f"{len(completed)} deadline(s) successfully resolved")
    if not high_active:
        strengths.append("No high-priority pending items")

    for d in expired:
        risks.append(f"⚠ '{d['title']}' has expired — immediate action required")
    for d in high_active:
        days = _days_remaining(d["deadline_date"])
        risks.append(f"⚠ '{d['title']}' — {days} days remaining (High Priority)")
    # Upcoming items in next 15 days
    for d in medium_active:
        days = _days_remaining(d["deadline_date"])
        if 0 < days <= 15:
            risks.append(f"⚠ '{d['title']}' approaching in {days} days")

    return {
        "user_id": user_id,
        "score": score,
        "grade": grade,
        "total_deadlines": total,
        "active": len(active),
        "completed": len(completed),
        "expired": len(expired),
        "high_priority_active": len(high_active),
        "strengths": strengths[:4],
        "risks": risks[:5],
        "computed_at": datetime.now(timezone.utc).isoformat(),
    }


def _empty_health_score(user_id: str) -> dict:
    return {
        "user_id": user_id,
        "score": 100,
        "grade": "Excellent",
        "total_deadlines": 0,
        "active": 0,
        "completed": 0,
        "expired": 0,
        "high_priority_active": 0,
        "strengths": ["No deadlines tracked yet", "Start by adding a deadline or chatting with AI"],
        "risks": [],
        "computed_at": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Seed Sample Data (for demo / first-time users)
# ---------------------------------------------------------------------------

async def seed_sample_deadlines(user_id: str) -> int:
    """Create sample deadlines if user has none, for demonstration."""
    db = get_database()
    count = await db[COLLECTION].count_documents({"user_id": user_id})
    if count > 0:
        return 0  # Already has data

    now = datetime.now(timezone.utc)
    samples = [
        deadline_document(
            user_id=user_id,
            title="Rental Agreement Renewal",
            description="Your rental agreement is approaching its end date. You must either renew or issue a 30-day notice to vacate.",
            category="rental",
            deadline_date=now + timedelta(days=25),
            source_type="manual",
            warning_days=[30, 15, 7, 1],
            priority="high",
        ),
        deadline_document(
            user_id=user_id,
            title="Consumer Complaint — Defective Product",
            description="You purchased a defective product. Consumer complaints must be filed within 2 years of purchase under Consumer Protection Act 2019.",
            category="consumer",
            deadline_date=now + timedelta(days=480),
            source_type="manual",
            warning_days=[90, 30, 15, 7],
            priority="medium",
        ),
        deadline_document(
            user_id=user_id,
            title="Security Deposit Refund",
            description="Your landlord must refund the security deposit within 21 days of vacating. File complaint if overdue.",
            category="rental",
            deadline_date=now + timedelta(days=8),
            source_type="manual",
            warning_days=[21, 14, 7, 1],
            priority="high",
        ),
        deadline_document(
            user_id=user_id,
            title="Salary Recovery Notice",
            description="You have the right to send a legal notice to your employer for unpaid salary within 1 year under Payment of Wages Act.",
            category="employment",
            deadline_date=now + timedelta(days=60),
            source_type="chat",
            warning_days=[90, 30, 15, 7],
            priority="medium",
        ),
        deadline_document(
            user_id=user_id,
            title="Insurance Policy Renewal",
            description="Your health insurance policy renewal is due. Ensure timely renewal to avoid lapse in coverage.",
            category="insurance",
            deadline_date=now + timedelta(days=12),
            source_type="manual",
            warning_days=[30, 15, 7, 3],
            priority="medium",
        ),
    ]

    # Mark first one as completed for health score variety
    samples[0]["status"] = "completed"
    samples[0]["completed_at"] = now - timedelta(days=2)

    await db[COLLECTION].insert_many(samples)
    logger.info(f"Seeded {len(samples)} sample deadlines for user {user_id}")
    return len(samples)
