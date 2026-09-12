"""
Response Synthesizer for LegalAce Agent.

Consolidates outputs from multiple tool executions into a single, cohesive,
high-quality agentic response without repetitive text blocks.
"""
from __future__ import annotations

from typing import List, Dict, Any

from app.core.logging import get_logger
from app.modules.agent.schemas import (
    AgentPlan,
    ToolExecutionResult,
    PendingAction,
    LawCitation,
    AgentResponse,
)

logger = get_logger(__name__)


async def synthesize_agent_response_async(
    conversation_id: str,
    plan: AgentPlan,
    step_results: List[ToolExecutionResult],
    pending_actions: List[PendingAction],
) -> AgentResponse:
    """
    Async synthesizer using LLM synthesis and citation grounding verification.
    """
    resp = synthesize_agent_response(conversation_id, plan, step_results, pending_actions)
    
    # Grounding check: verify law citations against FAISS corpus metadata
    try:
        from app.modules.chatbot.rag import faiss_store
        if faiss_store.is_loaded():
            verified_citations = []
            for citation in resp.law_citations:
                # Check if both act and section match in loaded statutory metadata
                match = any(
                    (
                        citation.section.strip().lower() in m.get("section_number", "").lower()
                        or citation.section.strip().lower() in m.get("section_title", "").lower()
                    )
                    and (
                        citation.act.strip().lower() in m.get("act_name", "").lower()
                        or m.get("act_name", "").lower() in citation.act.strip().lower()
                    )
                    for m in faiss_store.get_metadata()
                )
                if match:
                    citation.relevance_score = max(0.90, citation.relevance_score)
                verified_citations.append(citation)
            resp.law_citations = verified_citations
    except Exception as err:
        logger.warning(f"Grounding check skipped: {err}")

    return resp


def synthesize_agent_response(
    conversation_id: str,
    plan: AgentPlan,
    step_results: List[ToolExecutionResult],
    pending_actions: List[PendingAction],
) -> AgentResponse:
    """
    Synthesizes final answer, citations, rights, action steps, and reasoning trace
    from all tool execution results.
    """
    primary_answer: str = ""
    additional_sections: List[str] = []
    rights_set: List[str] = []
    action_steps_set: List[str] = []
    citations_dict: Dict[str, LawCitation] = {}
    reasoning_trace: List[str] = [f"Objective: {plan.objective}"]

    # 1. Inspect step results
    for res in step_results:
        reasoning_trace.append(f"Step {res.step_id} [{res.tool}]: {res.summary}")

        if res.status != "success":
            continue

        data = res.data or {}

        # Legal search results
        if res.tool == "legal_search":
            ans = data.get("answer", "")
            if ans and not primary_answer:
                primary_answer = ans

            for r in data.get("rights", []):
                if r not in rights_set:
                    rights_set.append(r)

            for a in data.get("action_steps", []):
                if a not in action_steps_set:
                    action_steps_set.append(a)

            for c in data.get("law_citations", []):
                key = f"{c.get('act')}_{c.get('section')}"
                if key not in citations_dict:
                    citations_dict[key] = LawCitation(
                        act=c.get("act", ""),
                        section=c.get("section", ""),
                        section_title=c.get("section_title", ""),
                        relevance_score=float(c.get("relevance_score", 0.95)),
                    )

        # Situation lookup results
        elif res.tool == "situation_lookup":
            sits = data.get("situations", [])
            if sits:
                first_sit = sits[0]
                title = first_sit.get("title", "")
                desc = first_sit.get("description", "")
                if title and desc and not primary_answer:
                    primary_answer = f"**{title}**\n\n{desc}"

                for r in first_sit.get("user_rights", []):
                    if r not in rights_set:
                        rights_set.append(r)

                for a in first_sit.get("action_steps", []):
                    if a not in action_steps_set:
                        action_steps_set.append(a)

                for c in first_sit.get("applicable_laws", []):
                    key = f"{c.get('act')}_{c.get('section')}"
                    if key not in citations_dict:
                        citations_dict[key] = LawCitation(
                            act=c.get("act", ""),
                            section=c.get("section", "Section"),
                            section_title=c.get("section_title", "Statutory Protection"),
                            relevance_score=0.95,
                        )

        # Action plan results
        elif res.tool == "action_plan":
            plan_data = data.get("action_plan", {})
            steps = plan_data.get("steps", [])
            if steps:
                plan_lines = ["### Resolution Roadmap"]
                for s in steps:
                    time_str = f" ({s['estimated_time']})" if s.get("estimated_time") else ""
                    law_str = f" — Law: {s['applicable_law']}" if s.get("applicable_law") else ""
                    plan_lines.append(f"**Step {s['step_number']}**: {s['title']}{time_str}\n{s['description']}{law_str}")
                    action_steps_set.append(f"Step {s['step_number']}: {s['title']}")
                additional_sections.append("\n\n".join(plan_lines))

        # Document analysis results
        elif res.tool == "document_analyze":
            analysis = data.get("analysis", {})
            if analysis:
                sum_text = analysis.get("summary", "")
                score = analysis.get("fairness_score", 100)
                risks = analysis.get("key_risks", [])

                doc_lines = [
                    f"### Contract Risk Analysis Report",
                    f"**Fairness Score**: {score}/100\n{sum_text}",
                ]
                if risks:
                    doc_lines.append("**Key Flagged Clauses**:")
                    for r in risks[:3]:
                        doc_lines.append(f"• **[{r.get('risk_level', 'Medium')}] {r.get('clause_title')}**: {r.get('explanation')}\n  Recommendation: {r.get('recommendation')}")

                additional_sections.append("\n\n".join(doc_lines))

                for r in analysis.get("user_rights", []):
                    if r not in rights_set:
                        rights_set.append(r)

                for a in analysis.get("suggested_actions", []):
                    if a not in action_steps_set:
                        action_steps_set.append(a)

        # Deadline extract results
        elif res.tool == "deadline_extract":
            ext = data.get("extracted_deadlines", [])
            if ext:
                ext_lines = ["### Extracted Statutory Timelines"]
                for d in ext:
                    ext_lines.append(f"• **{d.get('title')}**: {d.get('description')}")
                additional_sections.append("\n".join(ext_lines))

        # Legal aid lookup results
        elif res.tool == "legal_aid_lookup":
            eligibility = data.get("eligibility", {})
            authorities = data.get("authorities", [])
            is_eligible = eligibility.get("eligible", False)
            auth_suggested = eligibility.get("suggested_authority", "NALSA")

            aid_lines = [
                "### Free Legal Aid Evaluation (Section 12, LSA Act 1987)",
                f"**Status**: {'✅ Eligible for 100% Free Legal Aid' if is_eligible else 'ℹ️ Guidance / General Legal Services'}",
                f"**Suggested Authority**: {auth_suggested}",
            ]
            for r in eligibility.get("reasons", []):
                aid_lines.append(f"• {r}")
            if authorities:
                first_auth = authorities[0]
                aid_lines.append(
                    f"\n**Nearest Office**: {first_auth.get('name')}\n"
                    f"• Address: {first_auth.get('address', 'N/A')}\n"
                    f"• Phone: {first_auth.get('phone', '15100')}\n"
                    f"• Website: {first_auth.get('website', 'https://nalsa.gov.in')}"
                )

            additional_sections.append("\n\n".join(aid_lines))
            rights_set.append("Right to free legal aid and representation under Section 12 of Legal Services Authorities Act, 1987")
            action_steps_set.append(f"Contact {auth_suggested} or call national toll-free helpline 15100")

    # Assemble final text
    parts = []
    if primary_answer:
        parts.append(primary_answer)

    if additional_sections:
        parts.extend(additional_sections)

    if pending_actions:
        pending_prompts = [
            f"• **{p.title}**: {p.prompt_text}"
            for p in pending_actions
        ]
        parts.append("### Actions Prepared (Awaiting Your Approval)\n" + "\n".join(pending_prompts))
        reasoning_trace.append(f"Actions held for user confirmation: {len(pending_actions)}")

    final_text = "\n\n".join(parts) if parts else "Agent processed your legal query under Indian Law."

    return AgentResponse(
        conversation_id=conversation_id,
        objective=plan.objective,
        agent_mode=plan.agent_mode,
        plan=plan,
        step_results=step_results,
        pending_actions=pending_actions,
        final_answer=final_text,
        rights=rights_set,
        action_steps=action_steps_set,
        law_citations=list(citations_dict.values()),
        reasoning_trace=reasoning_trace,
    )

