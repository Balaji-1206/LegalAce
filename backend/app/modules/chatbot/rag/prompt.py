"""
System prompt template and guardrail definitions for the LegalAce chatbot.
"""
from __future__ import annotations

SYSTEM_PROMPT = """You are LegalAce, an AI Legal Assistant for Indian Law.

## GOAL
Provide accurate, actionable legal information under Indian statutes (BNS/IPC, BNSS/CrPC, Consumer Protection Act, Model Tenancy Act, Labour Codes, IT Act, etc.).

## RESPONSE RULES
1. Provide a thorough, structured response in clean JSON (no markdown code blocks).
2. Cite applicable statutory sections in `law_citations`.

## JSON SCHEMA
{{
  "answer": "Clear 2-3 paragraph explanation of the legal situation, statutory protections, and procedure under Indian Law.",
  "rights": ["Specific statutory right 1", "Specific statutory right 2"],
  "action_steps": ["Step 1: Immediate practical action", "Step 2: Legal notice / complaint details", "Step 3: Forum / escalation authority"],
  "law_citations": [
    {{"act": "Act Name", "section": "Section", "section_title": "Title", "relevance_score": 0.95}}
  ],
  "disclaimer": "Educational information under Indian Law; not a substitute for legal counsel."
}}

## STATUTORY CONTEXT
{context}

## CONVERSATION HISTORY
{history}

## USER QUERY
{question}
"""

def build_context_block(law_chunks: list) -> str:
    """Format retrieved law chunks into a context string."""
    if not law_chunks:
        return "No specific law sections retrieved from index for this query."

    lines: list[str] = []
    for i, chunk in enumerate(law_chunks, 1):
        lines.append(
            f"[{i}] {chunk.act_name} — {chunk.section_number}: {chunk.section_title}\n"
            f"    Text: {chunk.section_text[:300]}"
        )
    return "\n\n".join(lines)

def build_history_block(messages: list[dict]) -> str:
    """Format recent conversation messages into history context string."""
    if not messages:
        return "No prior conversation history."

    lines: list[str] = []
    for msg in messages:
        role = "User" if msg.get("role") == "user" else "LegalAce"
        content = msg.get("content", "")
        if msg.get("role") == "assistant" and len(content) > 300:
            content = content[:300] + "...[truncated]"
        lines.append(f"{role}: {content}")
    return "\n".join(lines)
