"""
Tool Registry for LegalAce Agent Orchestration Layer.

Wraps existing module services into standard executable tools.
Existing modules are NOT modified — tools act as pure wrappers.
"""
from __future__ import annotations

import time
import uuid
from typing import Dict, Any, Callable, Awaitable, List
from datetime import datetime, timezone, timedelta

from app.core.logging import get_logger
from app.modules.chatbot.rag.pipeline import run_rag_pipeline
from app.modules.situation_finder import service as situation_service
from app.modules.deadline_engine import service as deadline_service
from app.modules.deadline_engine import extractor as deadline_extractor
from app.modules.wizard import service as wizard_service
from app.modules.chatbot import service as chat_service
from app.modules.chatbot.schemas import DocAnalysisRequest

logger = get_logger(__name__)


class ToolDefinition:
    def __init__(
        self,
        name: str,
        description: str,
        parameters: Dict[str, Any],
        handler: Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]],
        is_mutating: bool = False,
    ):
        self.name = name
        self.description = description
        self.parameters = parameters
        self.handler = handler
        self.is_mutating = is_mutating


# ---------------------------------------------------------------------------
# Tool Handlers
# ---------------------------------------------------------------------------

async def _handle_legal_search(args: Dict[str, Any]) -> Dict[str, Any]:
    """Search Indian statutory law corpus & RAG pipeline."""
    query = args.get("query", "")
    history = args.get("history", [])
    parsed, intent, law_chunks = await run_rag_pipeline(query=query, conversation_history=history)
    return {
        "intent": intent,
        "answer": parsed.get("answer", ""),
        "rights": parsed.get("rights", []),
        "action_steps": parsed.get("action_steps", []),
        "law_citations": parsed.get("law_citations", []),
        "chunk_count": len(law_chunks),
    }


async def _handle_situation_lookup(args: Dict[str, Any]) -> Dict[str, Any]:
    """Find matching real-life legal situation guides from MongoDB."""
    category = args.get("category", "")
    situation_id = args.get("situation_id", "")

    if situation_id:
        sit = await situation_service.get_situation_by_id(situation_id)
        if sit:
            return {"situations": [sit.model_dump()]}

    if category:
        results = await situation_service.get_situations_by_category(category)
        return {"situations": [s.model_dump() for s in results]}

    all_sits = await situation_service.get_all_situations()
    return {"situations": [s.model_dump() for s in all_sits[:5]]}


async def _handle_deadline_create(args: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new legal deadline/reminder in MongoDB."""
    user_id = args.get("user_id", "default_user")
    title = args.get("title", "Legal Action Deadline")
    description = args.get("description", "")
    category = args.get("category", "general")
    priority = args.get("priority", "medium")
    days_from_now = args.get("days_from_now", 15)

    deadline_date = datetime.now(timezone.utc) + timedelta(days=days_from_now)

    created = await deadline_service.create_deadline(
        user_id=user_id,
        title=title,
        description=description,
        category=category,
        deadline_date=deadline_date,
        source_type="agent",
        priority=priority,
    )
    return {"created_deadline": created}


async def _handle_deadline_extract(args: Dict[str, Any]) -> Dict[str, Any]:
    """Extract legal deadlines and limitation periods from raw text."""
    text = args.get("text", "")
    extracted = await deadline_extractor.extract_deadlines_from_text(text)
    return {"extracted_deadlines": extracted, "count": len(extracted)}


async def _handle_action_plan(args: Dict[str, Any]) -> Dict[str, Any]:
    """Generate a step-by-step deterministic legal action plan."""
    scenario_id = args.get("scenario_id", "housing_deposit")
    user_answers = args.get("answers", {})
    plan = wizard_service.generate_action_plan(scenario_id, user_answers)
    return {"action_plan": plan}


async def _handle_document_analyze(args: Dict[str, Any]) -> Dict[str, Any]:
    """Scan legal document / contract for risk clauses under Indian Law."""
    doc_name = args.get("document_name", "document.pdf")
    doc_text = args.get("document_text", "")
    user_id = args.get("user_id", "default_user")

    req = DocAnalysisRequest(user_id=user_id, document_name=doc_name, document_text=doc_text)
    analysis = await chat_service.analyze_document_contract(req)
    return {"analysis": analysis.model_dump()}


async def _handle_health_score(args: Dict[str, Any]) -> Dict[str, Any]:
    """Compute current user legal health score."""
    user_id = args.get("user_id", "default_user")
    score_data = await deadline_service.compute_health_score(user_id)
    return {"health_score": score_data}


async def _handle_generate_notice(args: Dict[str, Any]) -> Dict[str, Any]:
    """Generate formal legal notice or complaint document text."""
    template_id = args.get("template_id", "housing_legal_notice")
    details = args.get("details", {})
    doc_res = wizard_service.generate_legal_document(template_id, details)
    return {"document": doc_res}


# ---------------------------------------------------------------------------
# Tool Registry Map
# ---------------------------------------------------------------------------

TOOL_REGISTRY: Dict[str, ToolDefinition] = {
    "legal_search": ToolDefinition(
        name="legal_search",
        description="Search Indian statutory laws (BNS, CrPC, Model Tenancy Act, Labour Codes, Consumer Protection Act, IT Act, etc.) and retrieve legal rights, citations, and legal explanations.",
        parameters={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "The specific legal query or statutory section to search"}
            },
            "required": ["query"],
        },
        handler=_handle_legal_search,
        is_mutating=False,
    ),
    "situation_lookup": ToolDefinition(
        name="situation_lookup",
        description="Find matching real-life legal situations (e.g. landlord withholding deposit, wrongful termination, defective product) with pre-verified legal rights and action steps.",
        parameters={
            "type": "object",
            "properties": {
                "category": {"type": "string", "description": "Category ID: employment | housing | consumer | cyber_crime | women_rights | banking | traffic"},
                "situation_id": {"type": "string", "description": "Optional specific situation ID"}
            },
        },
        handler=_handle_situation_lookup,
        is_mutating=False,
    ),
    "deadline_create": ToolDefinition(
        name="deadline_create",
        description="Create a legal reminder / statutory deadline in user's Legal Health Monitor. REQUIRES USER CONFIRMATION.",
        parameters={
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Deadline title e.g. Send Legal Notice to Landlord"},
                "description": {"type": "string", "description": "Details of the action required"},
                "days_from_now": {"type": "integer", "description": "Days until deadline"},
                "priority": {"type": "string", "description": "high | medium | low"}
            },
            "required": ["title", "days_from_now"],
        },
        handler=_handle_deadline_create,
        is_mutating=True,  # User must confirm!
    ),
    "deadline_extract": ToolDefinition(
        name="deadline_extract",
        description="Extract statutory limitation periods or date deadlines mentioned in text or contracts.",
        parameters={
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Raw text or message to extract deadlines from"}
            },
            "required": ["text"],
        },
        handler=_handle_deadline_extract,
        is_mutating=False,
    ),
    "action_plan": ToolDefinition(
        name="action_plan",
        description="Generate a comprehensive, step-by-step legal resolution plan with estimated timelines and applicable legal authorities.",
        parameters={
            "type": "object",
            "properties": {
                "scenario_id": {"type": "string", "description": "Scenario ID e.g. housing_deposit, housing_eviction, employment_salary, employment_termination, consumer_defective, banking_upi_fraud, cyber_fraud, women_dv"},
                "answers": {"type": "object", "description": "Decision tree key-value answers e.g. {'q1': 'yes', 'q2': 'yes'}"}
            },
            "required": ["scenario_id"],
        },
        handler=_handle_action_plan,
        is_mutating=False,
    ),
    "document_analyze": ToolDefinition(
        name="document_analyze",
        description="Analyze uploaded legal document/contract text for high-risk unfair clauses, forfeiture risks, and statutory rights.",
        parameters={
            "type": "object",
            "properties": {
                "document_name": {"type": "string", "description": "Name of the uploaded file"},
                "document_text": {"type": "string", "description": "Full extracted text content"}
            },
            "required": ["document_text"],
        },
        handler=_handle_document_analyze,
        is_mutating=False,
    ),
    "health_score": ToolDefinition(
        name="health_score",
        description="Compute user's active legal health score, active deadlines count, and risk evaluation.",
        parameters={"type": "object", "properties": {}},
        handler=_handle_health_score,
        is_mutating=False,
    ),
    "generate_notice": ToolDefinition(
        name="generate_notice",
        description="Generate a formal statutory Legal Demand Notice or Complaint template document text. REQUIRES USER CONFIRMATION.",
        parameters={
            "type": "object",
            "properties": {
                "template_id": {"type": "string", "description": "Template ID e.g. housing_legal_notice, employment_legal_notice, consumer_legal_notice, banking_fraud_report"},
                "details": {"type": "object", "description": "Sender, recipient, amount, and date details"}
            },
            "required": ["template_id"],
        },
        handler=_handle_generate_notice,
        is_mutating=True,  # User must confirm!
    ),
}


def get_tools_prompt_description() -> str:
    """Format available tools into a clear prompt description for the LLM Planner."""
    lines = []
    for name, tool in TOOL_REGISTRY.items():
        mutating_tag = " [REQUIRES USER CONFIRMATION]" if tool.is_mutating else ""
        lines.append(f"- **{name}**{mutating_tag}: {tool.description}")
        lines.append(f"  Parameters: {tool.parameters['properties']}")
    return "\n".join(lines)
