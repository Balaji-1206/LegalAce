"""
Pydantic schemas for Conversation API endpoints.
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field
from app.modules.chatbot.schemas import LawCitation

class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime
    citations: Optional[list[LawCitation]] = None
    rights: Optional[list[str]] = None
    action_steps: Optional[list[str]] = None

class ConversationResponse(BaseModel):
    conversation_id: str
    user_id: str
    title: str
    messages: list[Message]
    intent_history: list[str]
    created_at: datetime
    updated_at: datetime
    message_count: int = Field(..., description="Total number of messages in the conversation")

class ConversationSummary(BaseModel):
    conversation_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int

class ConversationHistoryResponse(BaseModel):
    user_id: str
    total_conversations: int
    conversations: list[ConversationSummary]

class DeleteConversationResponse(BaseModel):
    conversation_id: str
    message: str = "Conversation deleted successfully."
    success: bool = True
