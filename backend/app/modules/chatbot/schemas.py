"""
Pydantic schemas for the Chat API supporting Floating Agentic AI.
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
    message: str = Field(..., min_length=1, max_length=4000, description="The user's legal question or document prompt")
    agent_mode: Optional[str] = Field(
        "general",
        description="Agent persona mode: 'general' | 'contracts' | 'disputes' | 'rights'",
    )
    document_name: Optional[str] = Field(
        None,
        description="Optional attached document name (e.g., lease_agreement.pdf)",
    )
    document_content: Optional[str] = Field(
        None,
        description="Extracted text content from attached document",
    )

class LawCitation(BaseModel):
    act: str = Field(..., description="Full name of the Indian Act")
    section: str = Field(..., description="Section number (e.g., Section 25F)")
    section_title: str = Field(..., description="Title of the section")
    relevance_score: float = Field(0.95, ge=0.0, description="Cosine similarity score")

class ChatResponse(BaseModel):
    conversation_id: str = Field(..., description="ID of the conversation (new or existing)")
    intent: str = Field(..., description="Classified legal intent of the query")
    agent_mode: str = Field("general", description="Active agent persona mode")
    answer: str = Field(..., description="Detailed AI-generated legal information")
    rights: list[str] = Field(default_factory=list, description="User's legal rights relevant to the situation")
    action_steps: list[str] = Field(default_factory=list, description="Concrete steps the user should take")
    law_citations: list[LawCitation] = Field(default_factory=list, description="Indian law sections cited")
    reasoning_steps: list[str] = Field(
        default_factory=list,
        description="Sequential agentic reasoning execution steps",
    )
    disclaimer: str = Field(
        default=(
            "This information is for educational purposes only and does not constitute "
            "legal advice. Please consult a qualified advocate for advice specific to your situation."
        )
    )

class DocAnalysisRequest(BaseModel):
    user_id: str = Field(..., description="Unique identifier for the user")
    document_name: str = Field(..., description="Document file name (e.g. rent_agreement.pdf)")
    document_text: str = Field(..., min_length=10, description="Text extracted from legal document")

class DocRiskClause(BaseModel):
    clause_title: str
    clause_text: str
    risk_level: str  # High | Medium | Low
    explanation: str
    recommendation: str

class DocAnalysisResponse(BaseModel):
    document_name: str
    summary: str
    fairness_score: int = Field(..., ge=1, le=100, description="Contract fairness score out of 100")
    key_risks: list[DocRiskClause] = Field(default_factory=list)
    user_rights: list[str] = Field(default_factory=list)
    suggested_actions: list[str] = Field(default_factory=list)

class QuickPromptItem(BaseModel):
    label: str
    text: str
    agent_mode: str
    icon: str

class NewConversationResponse(BaseModel):
    conversation_id: str
    user_id: str
    message: str = "New conversation created successfully."
