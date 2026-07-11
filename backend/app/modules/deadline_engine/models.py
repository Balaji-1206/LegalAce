"""
MongoDB document model for Legal Deadlines.

Collection: deadlines
"""
from datetime import datetime, timezone


def deadline_document(
    user_id: str,
    title: str,
    description: str,
    category: str,
    deadline_date: datetime,
    source_type: str = "manual",
    warning_days: list[int] | None = None,
    priority: str = "medium",
    related_conversation_id: str | None = None,
    related_document_id: str | None = None,
) -> dict:
    """
    Build a deadline MongoDB document.

    category: rental | employment | consumer | banking | insurance | general
    source_type: manual | chat | document
    priority: low | medium | high
    status: active | completed | expired
    """
    return {
        "user_id": user_id,
        "source_type": source_type,
        "title": title,
        "description": description,
        "category": category,
        "deadline_date": deadline_date,
        "warning_days": warning_days or [30, 15, 7, 1],
        "status": "active",
        "priority": priority,
        "related_conversation_id": related_conversation_id,
        "related_document_id": related_document_id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "notified_days": [],          # Track which warning_days already fired
        "completed_at": None,
    }
