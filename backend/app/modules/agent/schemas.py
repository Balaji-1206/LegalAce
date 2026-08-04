"""
Pydantic schemas for the Agent Orchestration Engine.
"""
from __future__ import annotations
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class AgentRequest(BaseModel):
    user_id: str = Field(..., description="Unique identifier for the user")
    conversation_id: Optional[str] = Field(None, description="Existing conversation ID")
    message: str = Field(..., min_length=1, max_length=4000, description="User legal request")
    agent_mode: Optional[str] = Field("general", description="Agent persona: general | contracts | disputes | rights")
    document_name: Optional[str] = Field(None, description="Optional attached document name")
    document_content: Optional[str] = Field(None, description="Extracted text from document")


class PlannedStep(BaseModel):
    step_id: int
    tool: str = Field(..., description="Name of the tool to execute")
    reason: str = Field(..., description="Why this tool is being executed")
    args: Dict[str, Any] = Field(default_factory=dict, description="Arguments to pass to the tool")
    requires_confirmation: bool = Field(False, description="Whether this action requires user confirmation before execution")


class AgentPlan(BaseModel):
    objective: str = Field(..., description="Understood high-level objective of the user")
    agent_mode: str = Field("general")
    steps: List[PlannedStep] = Field(default_factory=list)


class PendingAction(BaseModel):
    action_id: str = Field(..., description="Unique ID for this pending action")
    action_type: str = Field(..., description="Type of action (e.g., 'create_deadline', 'generate_notice')")
    title: str = Field(..., description="Short summary title of the action")
    details: Dict[str, Any] = Field(default_factory=dict, description="Action payload details")
    prompt_text: str = Field(..., description="Human-readable text asking for user confirmation")


class ToolExecutionResult(BaseModel):
    step_id: int
    tool: str
    reason: str
    status: str = Field("success", description="success | error | skipped | pending_confirmation")
    summary: str = ""
    data: Dict[str, Any] = Field(default_factory=dict)
    execution_time_ms: float = 0.0


class LawCitation(BaseModel):
    act: str
    section: str
    section_title: str
    relevance_score: float = 0.95


class AgentResponse(BaseModel):
    conversation_id: str
    objective: str
    agent_mode: str
    plan: AgentPlan
    step_results: List[ToolExecutionResult] = Field(default_factory=list)
    pending_actions: List[PendingAction] = Field(default_factory=list)
    final_answer: str
    rights: List[str] = Field(default_factory=list)
    action_steps: List[str] = Field(default_factory=list)
    law_citations: List[LawCitation] = Field(default_factory=list)
    reasoning_trace: List[str] = Field(default_factory=list)
    disclaimer: str = (
        "This information is provided by LegalAce AI Agent for educational purposes under Indian Law. "
        "For court representation, please consult a licensed advocate."
    )


class ConfirmActionRequest(BaseModel):
    user_id: str
    conversation_id: str
    action_id: str
    action_type: str
    details: Dict[str, Any]
    approved: bool = True
