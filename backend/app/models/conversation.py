"""
MongoDB document model for Conversations.

MongoDB collection: conversations
Document structure (stored as raw dicts via Motor):

{
  "conversation_id": "uuid4-string",
  "user_id": "string",
  "title": "First 60 chars of first user message",
  "messages": [
    {
      "role": "user" | "assistant",
      "content": "string",
      "timestamp": "ISO datetime string",
      "citations": [
        {
          "act": "...",
          "section": "...",
          "section_title": "...",
          "relevance_score": 0.95
        }
      ]
    }
  ],
  "intent_history": ["tenancy", "tenancy", "general"],
  "created_at": "ISO datetime",
  "updated_at": "ISO datetime"
}

Indexes (created during startup):
  - conversation_id (unique)
  - user_id
  - updated_at
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


CONVERSATION_COLLECTION = "conversations"


def new_conversation_doc(
    conversation_id: str,
    user_id: str,
) -> dict[str, Any]:
    """Create a fresh conversation document for insertion into MongoDB."""
    now = datetime.now(timezone.utc)
    return {
        "conversation_id": conversation_id,
        "user_id": user_id,
        "title": "New Conversation",
        "messages": [],
        "intent_history": [],
        "created_at": now,
        "updated_at": now,
    }


def make_message_doc(
    role: str,
    content: str,
    citations: list[dict] | None = None,
    rights: list[str] | None = None,
    action_steps: list[str] | None = None,
) -> dict[str, Any]:
    """Create a single message subdocument."""
    return {
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc),
        "citations": citations or [],
        "rights": rights or [],
        "action_steps": action_steps or [],
    }
