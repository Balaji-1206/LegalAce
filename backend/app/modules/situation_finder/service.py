"""
Service layer querying MongoDB for the Situation Finder module.
"""
from __future__ import annotations

import re
from typing import Any

from app.core.logging import get_logger
from app.database.mongodb import get_database
from app.modules.situation_finder.models import SITUATION_COLLECTION
from app.modules.situation_finder.schemas import SituationResponse, CategorySummary

logger = get_logger(__name__)

# List of fixed categories and color schemes
CATEGORIES_METADATA = [
    {"id": "employment", "name": "Employment", "icon": "💼", "color_gradient": ["#3b82f6", "#1d4ed8"]},
    {"id": "housing", "name": "Housing & Renting", "icon": "🏠", "color_gradient": ["#10b981", "#047857"]},
    {"id": "consumer", "name": "Consumer Rights", "icon": "🛒", "color_gradient": ["#f59e0b", "#d97706"]},
    {"id": "banking", "name": "Banking & Finance", "icon": "🏦", "color_gradient": ["#06b6d4", "#0891b2"]},
    {"id": "cyber_crime", "name": "Cyber Crime", "icon": "🛡️", "color_gradient": ["#ec4899", "#be185d"]},
    {"id": "traffic", "name": "Traffic Rules", "icon": "🚗", "color_gradient": ["#f43f5e", "#e11d48"]},
    {"id": "women_rights", "name": "Women Rights", "icon": "👩", "color_gradient": ["#a855f7", "#7e22ce"]},
    {"id": "education", "name": "Education", "icon": "🎓", "color_gradient": ["#14b8a6", "#0d9488"]},
    {"id": "cheque_debt", "name": "Cheque Bounce & Debt", "icon": "💳", "color_gradient": ["#ef4444", "#b91c1c"]},
    {"id": "rti", "name": "RTI & Public Service", "icon": "📜", "color_gradient": ["#f97316", "#c2410c"]},
    {"id": "real_estate", "name": "RERA Real Estate", "icon": "🏢", "color_gradient": ["#6366f1", "#4338ca"]},
    {"id": "insurance", "name": "Insurance & Health", "icon": "🏥", "color_gradient": ["#ec4899", "#be185d"]},
    {"id": "family", "name": "Family & Support", "icon": "👨‍👩‍👧", "color_gradient": ["#84cc16", "#4d7c0f"]},
]

async def get_all_situations() -> list[SituationResponse]:
    """Retrieve all seeded situation documents."""
    db = get_database()
    cursor = db[SITUATION_COLLECTION].find({}, {"_id": 0})
    docs = await cursor.to_list(length=100)
    return [SituationResponse(**doc) for doc in docs]

async def get_situations_by_category(category_id: str) -> list[SituationResponse]:
    """Retrieve situation guides matching a specific category identifier."""
    db = get_database()
    cursor = db[SITUATION_COLLECTION].find({"category": category_id}, {"_id": 0})
    docs = await cursor.to_list(length=100)
    return [SituationResponse(**doc) for doc in docs]

async def get_situation_by_id(situation_id: str) -> SituationResponse | None:
    """Retrieve a single situation by its unique ID string."""
    db = get_database()
    doc = await db[SITUATION_COLLECTION].find_one({"situation_id": situation_id}, {"_id": 0})
    if not doc:
        return None
    return SituationResponse(**doc)

async def get_categories_summary() -> list[CategorySummary]:
    """
    Computes total situation counts matching each pre-defined category,
    combining them with gradient visual settings.
    """
    db = get_database()
    summaries: list[CategorySummary] = []
    
    for cat in CATEGORIES_METADATA:
        count = await db[SITUATION_COLLECTION].count_documents({"category": cat["id"]})
        summaries.append(
            CategorySummary(
                id=cat["id"],
                name=cat["name"],
                icon=cat["icon"],
                color_gradient=cat["color_gradient"],
                situation_count=count,
            )
        )
    return summaries
