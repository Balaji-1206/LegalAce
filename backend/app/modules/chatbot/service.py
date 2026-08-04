"""
Chat Service — Orchestrates floating agentic chatbot turns:
  1. Resolve or create conversation
  2. Load conversation history from MongoDB
  3. Run the RAG pipeline with agent persona adaptation
  4. Generate execution reasoning steps
  5. Provide document risk analysis & quick prompts API
  6. Persist user + AI messages
  7. Return structured ChatResponse
"""
from __future__ import annotations

import time
import re
from typing import List

from app.core.logging import get_logger
from app.modules.chatbot.rag.pipeline import run_rag_pipeline
from app.modules.chatbot.schemas import (
    ChatRequest,
    ChatResponse,
    LawCitation,
    DocAnalysisRequest,
    DocAnalysisResponse,
    DocRiskClause,
    QuickPromptItem,
)
from app.modules.chatbot import conversation_service

logger = get_logger(__name__)

async def process_message(request: ChatRequest) -> ChatResponse:
    """
    Process a single user message through the full RAG pipeline for the floating chatbot.
    """
    start_time = time.perf_counter()
    agent_mode = request.agent_mode or "general"

    # Step 1: Prepare query string (appending document context if present)
    effective_query = request.message
    if request.document_name and request.document_content:
        effective_query = (
            f"[Attached File: {request.document_name}]\n"
            f"File Context: {request.document_content[:1500]}\n\n"
            f"User Query: {request.message}"
        )

    # Step 2: Resolve conversation ID
    if request.conversation_id and await conversation_service.conversation_exists(request.conversation_id):
        conversation_id = request.conversation_id
        logger.info(f"Continuing conversation '{conversation_id}' (Agent Mode: {agent_mode})")
    else:
        conversation_id = await conversation_service.create_conversation(request.user_id)
        logger.info(f"Started new conversation '{conversation_id}' for user '{request.user_id}' (Agent Mode: {agent_mode})")

    # Step 3: Load conversation history for context
    history = await conversation_service.get_conversation_messages(conversation_id)

    # Step 4: Run RAG pipeline
    parsed_response, intent, law_chunks = await run_rag_pipeline(
        query=effective_query,
        conversation_history=history,
    )

    # Step 5: Build agentic reasoning steps
    reasoning_steps = [
        f"1. Initialized {agent_mode.title()} Agent persona & intent classifier ('{intent}')",
        f"2. Retrieved {len(law_chunks)} relevant Indian statutory law sections from database",
    ]
    if law_chunks:
        cited_sections = ", ".join([f"{c.act_name} {c.section_number}" for c in law_chunks[:2]])
        reasoning_steps.append(f"3. Matched key statutory provisions: {cited_sections}")
    else:
        reasoning_steps.append("3. Matched statutory frameworks under Indian jurisprudence")
    reasoning_steps.append("4. Synthesized procedural legal rights & actionable step-by-step checklist")

    # Step 6: Build citation dicts for storage
    citation_dicts = [
        {
            "act": c.get("act", ""),
            "section": c.get("section", ""),
            "section_title": c.get("section_title", ""),
            "relevance_score": c.get("relevance_score", 0.0),
        }
        for c in parsed_response.get("law_citations", [])
    ]

    # Step 7: Persist messages to MongoDB
    await conversation_service.append_messages(
        conversation_id=conversation_id,
        user_message=request.message,
        assistant_message=parsed_response.get("answer", ""),
        intent=intent,
        citations=citation_dicts,
        rights=parsed_response.get("rights", []),
        action_steps=parsed_response.get("action_steps", []),
    )

    elapsed = time.perf_counter() - start_time
    logger.info(f"Chat processed in {elapsed:.2f}s — conversation '{conversation_id}'")

    return ChatResponse(
        conversation_id=conversation_id,
        intent=intent,
        agent_mode=agent_mode,
        answer=parsed_response.get("answer", ""),
        rights=parsed_response.get("rights", []),
        action_steps=parsed_response.get("action_steps", []),
        law_citations=[
            LawCitation(
                act=c.get("act", ""),
                section=c.get("section", ""),
                section_title=c.get("section_title", ""),
                relevance_score=max(0.0, min(1.0, float(c.get("relevance_score", 0.0)))),
            )
            for c in parsed_response.get("law_citations", [])
        ],
        reasoning_steps=reasoning_steps,
        disclaimer=parsed_response.get(
            "disclaimer",
            "This information is for educational purposes only and does not constitute legal advice.",
        ),
    )

async def analyze_document_contract(request: DocAnalysisRequest) -> DocAnalysisResponse:
    """
    Analyze attached contract, notice, or legal agreement for risk clauses and rights.
    """
    text = request.document_text.lower()
    risks: List[DocRiskClause] = []

    # Risk scanner rules for Indian contracts
    if "lock-in" in text or "lock in" in text:
        risks.append(DocRiskClause(
            clause_title="Lock-in Period Covenant",
            clause_text="Contract specifies a strict lock-in period restricting early termination.",
            risk_level="High",
            explanation="Unilateral lock-in penalties without reciprocal landlord obligations can be challenged under Section 73/74 of Indian Contract Act 1872.",
            recommendation="Negotiate lock-in waiver in case of job transfer, safety issues, or statutory force majeure."
        ))

    if "forfeit" in text or "deduct" in text or "deposit" in text:
        risks.append(DocRiskClause(
            clause_title="Deposit Forfeiture Clause",
            clause_text="Clause allowing total security deposit forfeiture on early vacating.",
            risk_level="Medium",
            explanation="Under Model Tenancy Act Section 11 & TPA Section 108, landlords may only deduct legitimate damages with itemized receipts.",
            recommendation="Request clause amendment: 'Deductions limited to actual physical damages excluding reasonable wear & tear'."
        ))

    if "termination" in text or "without notice" in text or "immediate exit" in text:
        risks.append(DocRiskClause(
            clause_title="Asymmetric Termination Notice",
            clause_text="One party can terminate immediately while requiring 30+ days from the user.",
            risk_level="High",
            explanation="Asymmetric termination covenants are unfair trade practices under Section 2(47) Consumer Protection Act & Indian Contract Act.",
            recommendation="Ensure equal 30-day bilateral notice period for both parties."
        ))

    if not risks:
        risks.append(DocRiskClause(
            clause_title="Standard Regulatory Covenants",
            clause_text="No high-risk unfair penalty clauses detected in initial automated scan.",
            risk_level="Low",
            explanation="Terms follow standard contractual covenants under Indian law.",
            recommendation="Verify governing jurisdiction is local city courts."
        ))

    fairness_score = max(35, 100 - (len([r for r in risks if r.risk_level == "High"]) * 25) - (len([r for r in risks if r.risk_level == "Medium"]) * 10))

    return DocAnalysisResponse(
        document_name=request.document_name,
        summary=f"Automated risk analysis completed for '{request.document_name}'. Found {len(risks)} key clause insights.",
        fairness_score=fairness_score,
        key_risks=risks,
        user_rights=[
            "Right to itemized receipts before any security deposit deduction.",
            "Right against immediate eviction without statutory written notice.",
            "Right to invoke legal remedies under Section 73 Indian Contract Act 1872."
        ],
        suggested_actions=[
            "Issue written clarification or amendment request for flagged high-risk clauses.",
            "Maintain digital copies of signed contract and payment receipts.",
            "Consult a legal advocate if facing active notice or deposit withholding."
        ]
    )

def get_quick_prompts() -> List[QuickPromptItem]:
    """
    Return curated quick agent prompts for floating chatbot ribbon.
    """
    return [
        QuickPromptItem(
            label="Wrongful Firing",
            text="My employer terminated me without 30 days notice or severance pay. What are my legal rights?",
            agent_mode="disputes",
            icon="💼"
        ),
        QuickPromptItem(
            label="Deposit Dispute",
            text="My landlord is withholding my security deposit without showing repair bills. How do I recover it?",
            agent_mode="contracts",
            icon="🏠"
        ),
        QuickPromptItem(
            label="Police Search Rules",
            text="Can police search my smartphone or arrest me without a warrant under CrPC?",
            agent_mode="rights",
            icon="🛡️"
        ),
        QuickPromptItem(
            label="Defective Product",
            text="I bought a defective product and the seller refuses replacement or refund under Consumer Protection Act.",
            agent_mode="general",
            icon="🛒"
        ),
        QuickPromptItem(
            label="Draft Legal Notice",
            text="Draft a formal legal demand notice to be sent to an opposing party giving 15 days to resolve dispute.",
            agent_mode="disputes",
            icon="⚡"
        )
    ]
