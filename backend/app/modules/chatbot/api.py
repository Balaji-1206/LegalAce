"""
Chat API endpoints.
  POST /api/v1/chat                   — Main chat endpoint (RAG pipeline)
"""
from fastapi import APIRouter, HTTPException
from app.core.logging import get_logger
from app.modules.chatbot.schemas import ChatRequest, ChatResponse
from app.modules.chatbot import service as chat_service

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1", tags=["Chat"])

@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Send a legal question to LegalAce AI",
    description=(
        "Submit a legal question in plain English. The system classifies the intent, "
        "retrieves relevant Indian law sections, and returns a structured response with "
        "rights, action steps, and law citations. "
        "Provide `conversation_id` to continue a multi-turn conversation."
    ),
)
async def chat(request: ChatRequest) -> ChatResponse:
    try:
        return await chat_service.process_message(request)
    except RuntimeError as e:
        logger.error(f"RAG pipeline error: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in /chat: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again.")
