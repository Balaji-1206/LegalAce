"""
Chat Service — Orchestrates a single chat turn:
  1. Resolve or create conversation
  2. Load conversation history from MongoDB
  3. Run the RAG pipeline
  4. Persist user + AI messages
  5. Return structured ChatResponse
"""
from __future__ import annotations

import time

from app.core.logging import get_logger
from app.modules.chatbot.rag.pipeline import run_rag_pipeline
from app.modules.chatbot.schemas import ChatRequest, ChatResponse, LawCitation
from app.modules.chatbot import conversation_service

logger = get_logger(__name__)

async def process_message(request: ChatRequest) -> ChatResponse:
    """
    Process a single user message through the full RAG pipeline.
    """
    start_time = time.perf_counter()

    # Step 1: Resolve conversation ID
    if request.conversation_id and await conversation_service.conversation_exists(request.conversation_id):
        conversation_id = request.conversation_id
        logger.info(f"Continuing conversation '{conversation_id}'")
    else:
        # Create a new conversation (either no ID provided, or ID doesn't exist)
        conversation_id = await conversation_service.create_conversation(request.user_id)
        logger.info(f"Started new conversation '{conversation_id}' for user '{request.user_id}'")

    # Step 2: Load conversation history for multi-turn context
    history = await conversation_service.get_conversation_messages(conversation_id)
    logger.debug(f"Loaded {len(history)} messages for context")

    # Step 3: Run RAG pipeline
    parsed_response, intent, law_chunks = await run_rag_pipeline(
        query=request.message,
        conversation_history=history,
    )

    # Step 4: Build citation dicts for storage
    citation_dicts = [
        {
            "act": c.get("act", ""),
            "section": c.get("section", ""),
            "section_title": c.get("section_title", ""),
            "relevance_score": c.get("relevance_score", 0.0),
        }
        for c in parsed_response.get("law_citations", [])
    ]

    # Step 5: Persist messages to MongoDB
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

    # Step 6: Build and return ChatResponse
    return ChatResponse(
        conversation_id=conversation_id,
        intent=intent,
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
        disclaimer=parsed_response.get(
            "disclaimer",
            "This information is for educational purposes only and does not constitute legal advice.",
        ),
    )
