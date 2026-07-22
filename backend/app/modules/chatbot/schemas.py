"""
Pydantic schemas for the Chat API.
"""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    user_id: str = Field(..., description="Unique identifier for the user (UUID or device ID)")
    conversation_id: Optional[str] = Field(
        None,
        description="Existing conversation ID for multi-turn chat. Omit to start a new conversation.",
    )
    message: str = Field(..., min_length=3, max_length=2000, description="The user's legal question")

class LawCitation(BaseModel):
    act: str = Field(..., description="Full name of the Indian Act")
    section: str = Field(..., description="Section number (e.g., Section 25F)")
    section_title: str = Field(..., description="Title of the section")
    relevance_score: float = Field(0.95, ge=0.0, description="Cosine similarity score")

class ChatResponse(BaseModel):
    conversation_id: str = Field(..., description="ID of the conversation (new or existing)")
    intent: str = Field(..., description="Classified legal intent of the query")
    answer: str = Field(..., description="Detailed AI-generated legal information")
    rights: list[str] = Field(default_factory=list, description="User's legal rights relevant to the situation")
    action_steps: list[str] = Field(default_factory=list, description="Concrete steps the user should take")
    law_citations: list[LawCitation] = Field(default_factory=list, description="Indian law sections cited")
    disclaimer: str = Field(
        default=(
            "This information is for educational purposes only and does not constitute "
            "legal advice. Please consult a qualified advocate for advice specific to your situation."
        )
    )

class NewConversationResponse(BaseModel):
    conversation_id: str
    user_id: str
    message: str = "New conversation created successfully."
