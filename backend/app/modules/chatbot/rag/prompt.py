"""
System prompt template and guardrail definitions for the LegalAce chatbot.
"""
from __future__ import annotations

SYSTEM_PROMPT = """You are LegalAce, an AI Legal Assistant for Indian Law.

## GOAL
Provide accurate, actionable legal information under Indian statutes (BNS/IPC, BNSS/CrPC, Consumer Protection Act, Model Tenancy Act, Labour Codes, IT Act, etc.).

## RESPONSE RULES
1. Provide a direct, concise, and structured response in clean JSON (no markdown code blocks).
2. Avoid conversational filler or unnecessary repetition; focus on actionable legal remedies.
3. Cite applicable statutory sections in `law_citations`.

## JSON SCHEMA
{{
  "answer": "Concise, direct explanation of the legal position, statutory protections, and procedure (max 2 focused paragraphs).",
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

## LANGUAGE & LOCALIZATION
{language_instruction}

## USER QUERY
<untrusted_user_request>
{question}
</untrusted_user_request>
"""

def build_prompt(context: str, history: str, question: str, language: str = "en") -> str:
    """Format SYSTEM_PROMPT with context, history, and language instructions."""
    lang_inst = "Respond in clear, accessible English with standard Indian legal terminology."
    if language == "hi":
        lang_inst = "CRITICAL LANGUAGE INSTRUCTION: The user has selected Hindi. You MUST formulate the 'answer', 'rights', and 'action_steps' in fluent Hindi (Devanagari script) with accurate Indian statutory references."
    elif language == "ta":
        lang_inst = "CRITICAL LANGUAGE INSTRUCTION: The user has selected Tamil. You MUST formulate the 'answer', 'rights', and 'action_steps' in fluent Tamil with accurate Indian statutory references."

    return SYSTEM_PROMPT.format(
        context=context,
        history=history,
        language_instruction=lang_inst,
        question=question,
    )

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
