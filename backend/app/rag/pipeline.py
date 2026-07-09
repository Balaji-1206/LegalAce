"""
RAG Pipeline — Full orchestration of query → response.

Flow:
  1. Classify intent
  2. Generate query embedding
  3. Vector search (FAISS) → top relevant law sections
  4. Build prompt (system + context + history + question)
  5. GPT-4 call via LangChain
  6. Parse JSON response into ChatResponse schema
  7. Return structured response
"""
from __future__ import annotations

import json
import re
from typing import Any

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from app.core.config import settings
from app.core.logging import get_logger
from app.rag.intent import classify_intent
from app.rag.retriever import retrieve_relevant_laws
from app.rag.prompt import SYSTEM_PROMPT, build_context_block, build_history_block
from app.rag.faiss_store import LawChunk

logger = get_logger(__name__)

_llm: ChatOpenAI | None = None


def load_llm() -> None:
    """Initialize the LangChain LLM client. Called during app lifespan startup."""
    global _llm
    logger.info(f"Initializing LangChain ChatOpenAI with model: {settings.OPENAI_MODEL}")
    _llm = ChatOpenAI(
        model=settings.OPENAI_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0.1,  # Low temperature for factual, consistent legal responses
        max_tokens=1500,
        timeout=30,
    )
    logger.info("LLM initialized successfully.")


def _parse_response(raw: str) -> dict[str, Any]:
    """
    Parse the LLM's raw JSON string response into a Python dict.
    Handles common formatting issues (markdown fences, extra whitespace).
    """
    # Strip markdown code fences if present
    cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip()
    cleaned = cleaned.rstrip("`").strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM JSON response: {e}\nRaw output: {raw[:500]}")
        # Return a safe fallback structure
        return {
            "answer": "I was unable to process your legal query at this time. Please try rephrasing your question or consult a qualified lawyer.",
            "rights": [],
            "action_steps": ["Consult a qualified advocate for guidance specific to your situation."],
            "law_citations": [],
            "disclaimer": "This information is for educational purposes only and does not constitute legal advice.",
        }


async def run_rag_pipeline(
    query: str,
    conversation_history: list[dict],
) -> tuple[dict[str, Any], str, list[LawChunk]]:
    """
    Execute the full RAG pipeline for a user query.

    Args:
        query: The user's natural-language legal question.
        conversation_history: List of previous messages (role + content) for multi-turn context.

    Returns:
        Tuple of:
          - Parsed response dict (answer, rights, action_steps, law_citations, disclaimer)
          - Classified intent string
          - List of retrieved LawChunks
    """
    if _llm is None:
        raise RuntimeError("LLM not initialized. Call load_llm() first.")

    # Step 1: Intent classification
    intent = classify_intent(query)
    logger.info(f"Query intent: {intent}")

    # Step 2: Retrieve relevant law sections
    law_chunks = await retrieve_relevant_laws(query=query, intent=intent, top_k=5)
    logger.info(f"Retrieved {len(law_chunks)} law sections")

    # Step 3: Build prompt components
    context_block = build_context_block(law_chunks)
    # Use last 6 messages for context window efficiency
    history_block = build_history_block(conversation_history[-6:])

    # Step 4: Format the system prompt
    formatted_prompt = SYSTEM_PROMPT.format(
        context=context_block,
        history=history_block,
        question=query,
    )

    # Step 5: Call GPT-4 (with try/except fallback for quota/billing/API errors)
    logger.info("Sending request to GPT-4...")
    messages = [
        SystemMessage(content=formatted_prompt),
        HumanMessage(content=query),
    ]
    try:
        response = await _llm.ainvoke(messages)
        raw_content: str = response.content
        # Step 6: Parse structured response
        parsed = _parse_response(raw_content)
    except Exception as e:
        logger.warning(f"OpenAI API call failed ({e}). Generating rule-based mock response.")
        if law_chunks:
            top_chunk = law_chunks[0]
            mock_answer = (
                f"Based on the local Indian Law database, the most relevant provision is {top_chunk.section_number} ({top_chunk.section_title}) of the {top_chunk.act_name}. "
                f"The statute states: \"{top_chunk.section_text}\" "
                f"Your query matches this section."
            )
            mock_rights = [
                f"Rights protected under {top_chunk.act_name} - {top_chunk.section_number}.",
                f"Right to claim remedy or raise dispute under the provisions of the {top_chunk.act_name}."
            ]
            mock_actions = [
                f"Reference {top_chunk.section_number} in communications with the involved party.",
                f"Verify requirements outlined in {top_chunk.section_title}.",
                "Prepare legal notification if the dispute remains unresolved."
            ]
            mock_citations = [
                {
                    "act": top_chunk.act_name,
                    "section": top_chunk.section_number,
                    "section_title": top_chunk.section_title,
                    "relevance_score": top_chunk.score
                }
            ]
        else:
            mock_answer = "No matching law sections were found in the database. Please consult a qualified advocate."
            mock_rights = ["Right to seek professional legal advice."]
            mock_actions = ["Consult a certified lawyer/advocate."]
            mock_citations = []

        parsed = {
            "answer": mock_answer,
            "rights": mock_rights,
            "action_steps": mock_actions,
            "law_citations": mock_citations,
            "disclaimer": "⚠️ Simulated/Mock response generated because your OpenAI API key has insufficient quota or is invalid. Real Indian laws were retrieved from the FAISS database."
        }

    # Ensure disclaimer is always present
    if not parsed.get("disclaimer"):
        parsed["disclaimer"] = (
            "This information is for educational purposes only and does not constitute "
            "legal advice. Please consult a qualified advocate for advice specific to your situation."
        )

    logger.info(f"RAG pipeline completed — {len(parsed.get('law_citations', []))} citations returned")
    return parsed, intent, law_chunks
