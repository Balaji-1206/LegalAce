"""
Pydantic schemas for the Chat API.

ChatRequest  — input from the client
ChatResponse — structured AI response with citations
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

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "user_id": "user_abc123",
                    "message": "My landlord is not returning my security deposit.",
                },
                {
                    "user_id": "user_abc123",
                    "conversation_id": "conv_xyz789",
                    "message": "What legal steps can I take next?",
                },
            ]
        }
    }


class LawCitation(BaseModel):
    act: str = Field(..., description="Full name of the Indian Act")
    section: str = Field(..., description="Section number (e.g., Section 25F)")
    section_title: str = Field(..., description="Title of the section")
    relevance_score: float = Field(..., ge=0.0, le=1.0, description="Cosine similarity score")


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

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "conversation_id": "conv_xyz789",
                    "intent": "tenancy",
                    "answer": "Under Indian law, your landlord is legally obligated to return your security deposit...",
                    "rights": [
                        "You are entitled to receive your security deposit back upon vacating the premises.",
                        "The landlord may only deduct amounts for unpaid rent or documented property damage.",
                    ],
                    "action_steps": [
                        "Step 1: Send a written notice to your landlord demanding the deposit refund within 15 days.",
                        "Step 2: If not returned, file a complaint with the Rent Controller or Civil Court.",
                        "Step 3: Alternatively, file under Consumer Protection Act if rent is paid for services.",
                    ],
                    "law_citations": [
                        {
                            "act": "Transfer of Property Act, 1882",
                            "section": "Section 108(q)",
                            "section_title": "Rights and Liabilities of Lessor — Security Deposit",
                            "relevance_score": 0.92,
                        }
                    ],
                    "disclaimer": "This information is for educational purposes only and does not constitute legal advice.",
                }
            ]
        }
    }


class NewConversationResponse(BaseModel):
    conversation_id: str
    user_id: str
    message: str = "New conversation created successfully."
