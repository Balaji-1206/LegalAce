"""
Agent Memory Module — Stores episodic agent execution traces and user legal profiles in MongoDB.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from app.core.logging import get_logger
from app.database.mongodb import get_database

logger = get_logger(__name__)

EPISODES_COLLECTION = "agent_episodes"


async def store_agent_episode(
    user_id: str,
    conversation_id: str,
    objective: str,
    agent_mode: str,
    plan_steps: List[Dict[str, Any]],
    executed_tools: List[str],
    outcome_summary: str,
) -> str:
    """Store an agent execution episode in MongoDB."""
    db = get_database()
    doc = {
        "user_id": user_id,
        "conversation_id": conversation_id,
        "objective": objective,
        "agent_mode": agent_mode,
        "plan_steps": plan_steps,
        "executed_tools": executed_tools,
        "outcome_summary": outcome_summary[:500],
        "created_at": datetime.now(timezone.utc),
    }
    res = await db[EPISODES_COLLECTION].insert_one(doc)
    logger.info(f"Stored agent episode '{res.inserted_id}' for user {user_id}")
    return str(res.inserted_id)


async def get_recent_episodes(user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Retrieve recent agent execution episodes for context awareness."""
    db = get_database()
    cursor = db[EPISODES_COLLECTION].find({"user_id": user_id}).sort("created_at", -1).limit(limit)
    episodes = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        doc["created_at"] = doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at")
        episodes.append(doc)
    return episodes
