"""
RAG Pipeline — Coordinates:
  1. Intent classification
  2. Legal text retrieval from FAISS
  3. System prompt construction
  4. OpenAI Chat Completion call
  5. JSON response validation and parsing
"""
from __future__ import annotations

import json
import re
from openai import AsyncOpenAI
from app.database.mongodb import get_database

from app.core.config import settings
from app.core.logging import get_logger
from app.modules.chatbot.rag.intent import classify_intent
from app.modules.chatbot.rag.retriever import retrieve_relevant_laws
from app.modules.chatbot.rag.prompt import SYSTEM_PROMPT, build_context_block, build_history_block

logger = get_logger(__name__)

# Initialize OpenAI client
_openai_client: AsyncOpenAI | None = None

def load_openai_client() -> None:
    """Initialize OpenAI AsyncOpenAI client. Call during FastAPI startup."""
    global _openai_client
    if not settings.OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY is not set in environment configurations.")
    logger.info(f"Initializing LangChain ChatOpenAI with model: {settings.OPENAI_MODEL}")
    _openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    logger.info("LLM initialized successfully.")

async def run_rag_pipeline(
    query: str,
    conversation_history: list[dict],
) -> tuple[dict, str, list]:
    """
    Run the query through RAG pipeline.
    Returns:
      tuple of (parsed_json_dict, intent_str, list_of_law_chunks)
    """
    if _openai_client is None:
        raise RuntimeError("OpenAI client not initialized. Call load_openai_client() first.")

    # 1. Intent Classification
    intent = classify_intent(query)

    if intent == "greeting":
        parsed_greeting = {
            "answer": "Hello! I am LegalAce, your AI legal information assistant. I can help you understand your legal rights, statutory laws, and action steps in India. How can I help you today?",
            "rights": [],
            "action_steps": [],
            "law_citations": [],
            "disclaimer": "This is a greeting response. For legal matters, please consult a qualified advocate."
        }
        return parsed_greeting, "greeting", []

    if intent == "out_of_scope":
        parsed_out_of_scope = {
            "answer": "I am LegalAce, your AI legal companion. I am specialized in explaining Indian statutory laws, rights, and legal situations. I cannot assist with non-legal queries. Please ask a legal question.",
            "rights": [],
            "action_steps": [],
            "law_citations": [],
            "disclaimer": "This system is strictly constrained to legal topics only."
        }
        return parsed_out_of_scope, "out_of_scope", []

    # 2. FAISS Document Retrieval
    law_chunks = await retrieve_relevant_laws(query, top_k=5)

    # 3. Guardrail Threshold Check
    # If the user asks a general query, check if the maximum vector similarity score is below the threshold of 0.22.
    # If it is, the query is not legal-related (e.g., "what is cancer?", "who won the match?").
    max_score = max([chunk.score for chunk in law_chunks]) if law_chunks else 0.0
    if intent == "general" and max_score < 0.22:
        logger.info(f"Out of scope query detected via score threshold (max_score={max_score:.4f}): '{query[:80]}'")
        parsed_out_of_scope = {
            "answer": "I am LegalAce, your AI legal companion. I am specialized in explaining Indian statutory laws, rights, and legal situations. I cannot assist with non-legal queries. Please ask a legal question.",
            "rights": [],
            "action_steps": [],
            "law_citations": [],
            "disclaimer": "This system is strictly constrained to legal topics only."
        }
        return parsed_out_of_scope, "out_of_scope", []

    # 3. Prompt Construction
    context_block = build_context_block(law_chunks)
    history_block = build_history_block(conversation_history[-8:])  # Limit context history to last 8 turns

    prompt = SYSTEM_PROMPT.format(
        context=context_block,
        history=history_block,
        question=query,
    )

    logger.info("Executing LLM generation...")
    parsed = {}
    try:
        response = await _openai_client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,  # Factual response behavior
            response_format={"type": "json_object"},
        )
        raw_content = response.choices[0].message.content or "{}"
        try:
            parsed = json.loads(raw_content)
        except json.JSONDecodeError:
            logger.error(f"LLM output could not be parsed as valid JSON. Raw output: {raw_content}")
            parsed = {}
    except Exception as e:
        logger.error(f"OpenAI LLM API Call failed (quota/connection issue): {e}. Triggering local fallback.")
        
        # 1. Search database situations for a keyword match
        db = get_database()
        matched_sit = None
        try:
            words = [w for w in re.split(r'\W+', query.lower()) if len(w) > 3]
            if words:
                query_filter = {
                    "$or": [
                        {"title": {"$regex": "|".join(words), "$options": "i"}},
                        {"description": {"$regex": "|".join(words), "$options": "i"}}
                    ]
                }
                matched_sit = await db["situations"].find_one(query_filter)
        except Exception as db_err:
            logger.error(f"Failed to query database fallback: {db_err}")

        if matched_sit:
            logger.info(f"Fallback matched local situation guide: '{matched_sit['title']}'")
            parsed = {
                "answer": (
                    f"Based on your query, here is relevant legal information regarding '{matched_sit['title']}':\n\n"
                    f"{matched_sit['description']}\n\n"
                    "Note: This is a pre-compiled guide retrieved from our local database."
                ),
                "rights": matched_sit.get("user_rights", []),
                "action_steps": matched_sit.get("action_steps", []),
                "law_citations": [
                    {
                        "act": c.get("act", ""),
                        "section": c.get("section", ""),
                        "section_title": c.get("section_title", ""),
                        "relevance_score": 0.95
                    }
                    for c in matched_sit.get("applicable_laws", [])
                ],
                "disclaimer": "This information is for educational purposes only and does not constitute legal advice. Triggered via local database fallback."
            }
        else:
            # 2. If no direct situation matched, build a dynamic answer from retrieved FAISS law_chunks!
            if law_chunks:
                logger.info(f"Fallback utilizing {len(law_chunks)} retrieved FAISS law chunks")
                summary_text = (
                    "I have retrieved relevant statutes matching your query from the local Indian Law Corpus:\n\n"
                )
                for chunk in law_chunks[:3]:
                    summary_text += f"• **{chunk.act_name} — {chunk.section_number} ({chunk.section_title})**: {chunk.section_text[:250]}...\n\n"
                
                parsed = {
                    "answer": summary_text,
                    "rights": [
                        "Right to expect fair treatment under the statutes cited.",
                        "Right to seek professional legal counsel."
                    ],
                    "action_steps": [
                        "Review the detailed statutory text of the cited sections.",
                        "Gather documentation (contracts, receipts, communication logs) matching your dispute.",
                        "File a formal representation or consult an advocate."
                    ],
                    "law_citations": [
                        {
                            "act": chunk.act_name,
                            "section": chunk.section_number,
                            "section_title": chunk.section_title,
                            "relevance_score": chunk.score
                        }
                        for chunk in law_chunks[:3]
                    ],
                    "disclaimer": "This information is for educational purposes only and does not constitute legal advice. Triggered via local FAISS index fallback."
                }
            else:
                # Absolute fallback
                logger.info("Absolute fallback triggered (no database or FAISS chunks matches)")
                parsed = {
                    "answer": (
                        "I could not connect to the statutory analysis model and no local matches were found. "
                        "Please verify your internet connection or check the OpenAI API quota configurations."
                    ),
                    "rights": ["Right to access general legal advice."],
                    "action_steps": ["Check back when the service is fully restored."],
                    "law_citations": [],
                    "disclaimer": "This information is for educational purposes only and does not constitute legal advice."
                }

    # Guardrail fallback structure if parsed is invalid
    if not parsed or "answer" not in parsed:
        parsed = {
            "answer": (
                "An unexpected issue occurred while parsing the legal guidelines. "
                "I was unable to structure your response correctly."
            ),
            "rights": ["Right to access educational information about legal processes."],
            "action_steps": ["Consult a legal advocate manually for guidance."],
            "law_citations": [],
            "disclaimer": "This information is for educational purposes only and does not constitute legal advice."
        }

    # Add citations information from retrieved search context if missing
    if not parsed.get("law_citations") and law_chunks:
        parsed["law_citations"] = [
            {
                "act": chunk.act_name,
                "section": chunk.section_number,
                "section_title": chunk.section_title,
                "relevance_score": chunk.score,
            }
            for chunk in law_chunks[:2]
        ]

    return parsed, intent, law_chunks
