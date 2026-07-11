"""
Conversation Service — MongoDB CRUD for conversation documents.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from app.core.logging import get_logger
from app.database.mongodb import get_database
from app.modules.chatbot.models import (
    CONVERSATION_COLLECTION,
    new_conversation_doc,
    make_message_doc,
)
from app.modules.chatbot.conversation_schemas import (
    ConversationResponse,
    ConversationSummary,
    ConversationHistoryResponse,
    Message,
)
from app.modules.chatbot.schemas import LawCitation

logger = get_logger(__name__)

async def create_conversation(user_id: str) -> str:
    """Create a new conversation document in MongoDB."""
    conversation_id = str(uuid.uuid4())
    doc = new_conversation_doc(conversation_id=conversation_id, user_id=user_id)
    db = get_database()
    await db[CONVERSATION_COLLECTION].insert_one(doc)
    logger.info(f"Created conversation '{conversation_id}' for user '{user_id}'")
    return conversation_id

async def get_conversation(conversation_id: str) -> ConversationResponse | None:
    """Fetch a full conversation document by its ID."""
    db = get_database()
    doc = await db[CONVERSATION_COLLECTION].find_one(
        {"conversation_id": conversation_id},
        {"_id": 0},
    )
    if not doc:
        return None
    return _doc_to_response(doc)

async def get_user_history(user_id: str) -> ConversationHistoryResponse:
    """Fetch a summary list of all conversations for a given user, sorted by most recently updated."""
    db = get_database()
    cursor = db[CONVERSATION_COLLECTION].find(
        {"user_id": user_id},
        {"_id": 0, "conversation_id": 1, "title": 1, "created_at": 1, "updated_at": 1, "messages": 1},
    ).sort("updated_at", -1)

    docs = await cursor.to_list(length=100)

    summaries = [
        ConversationSummary(
            conversation_id=doc["conversation_id"],
            title=doc.get("title", "Untitled"),
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
            message_count=len(doc.get("messages", [])),
        )
        for doc in docs
    ]

    return ConversationHistoryResponse(
        user_id=user_id,
        total_conversations=len(summaries),
        conversations=summaries,
    )

async def append_messages(
    conversation_id: str,
    user_message: str,
    assistant_message: str,
    intent: str,
    citations: list[dict] | None = None,
    rights: list[str] | None = None,
    action_steps: list[str] | None = None,
) -> None:
    """Append both the user message and the assistant response to a conversation."""
    db = get_database()
    now = datetime.now(timezone.utc)

    user_msg_doc = make_message_doc(role="user", content=user_message)
    assistant_msg_doc = make_message_doc(
        role="assistant",
        content=assistant_message,
        citations=citations or [],
        rights=rights or [],
        action_steps=action_steps or [],
    )

    doc = await db[CONVERSATION_COLLECTION].find_one(
        {"conversation_id": conversation_id},
        {"messages": 1, "title": 1},
    )

    update_fields: dict[str, Any] = {
        "updated_at": now,
    }

    if doc and (doc.get("title") == "New Conversation" or not doc.get("title")):
        title = user_message[:60].strip()
        if len(user_message) > 60:
            title += "..."
        update_fields["title"] = title

    await db[CONVERSATION_COLLECTION].update_one(
        {"conversation_id": conversation_id},
        {
            "$push": {"messages": {"$each": [user_msg_doc, assistant_msg_doc]}},
            "$addToSet": {"intent_history": intent},
            "$set": update_fields,
        },
    )
    logger.debug(f"Appended messages to conversation '{conversation_id}'")

async def conversation_exists(conversation_id: str) -> bool:
    """Check whether a conversation_id exists in MongoDB."""
    db = get_database()
    count = await db[CONVERSATION_COLLECTION].count_documents(
        {"conversation_id": conversation_id}, limit=1
    )
    return count > 0

async def delete_conversation(conversation_id: str) -> bool:
    """Delete a conversation document."""
    db = get_database()
    result = await db[CONVERSATION_COLLECTION].delete_one({"conversation_id": conversation_id})
    deleted = result.deleted_count > 0
    if deleted:
        logger.info(f"Deleted conversation '{conversation_id}'")
    else:
        logger.warning(f"Attempted to delete non-existent conversation '{conversation_id}'")
    return deleted

async def get_conversation_messages(conversation_id: str) -> list[dict]:
    """Return the raw messages list for a conversation."""
    db = get_database()
    doc = await db[CONVERSATION_COLLECTION].find_one(
        {"conversation_id": conversation_id},
        {"_id": 0, "messages": 1},
    )
    if not doc:
        return []
    return doc.get("messages", [])

def _doc_to_response(doc: dict) -> ConversationResponse:
    messages = [
        Message(
            role=m["role"],
            content=m["content"],
            timestamp=m["timestamp"],
            citations=[LawCitation(**c) for c in m.get("citations", [])] or None,
            rights=m.get("rights"),
            action_steps=m.get("action_steps"),
        )
        for m in doc.get("messages", [])
    ]
    return ConversationResponse(
        conversation_id=doc["conversation_id"],
        user_id=doc["user_id"],
        title=doc.get("title", "Untitled"),
        messages=messages,
        intent_history=doc.get("intent_history", []),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        message_count=len(messages),
    )
