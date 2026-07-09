"""
Chat API endpoints.
  POST /api/v1/chat                   — Main chat endpoint (RAG pipeline)
  POST /api/v1/conversation/new       — Create a new conversation
"""
from fastapi import APIRouter, HTTPException
from app.core.logging import get_logger
from app.schemas.chat import ChatRequest, ChatResponse, NewConversationResponse
from app.services import chat_service, conversation_service

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


@router.post(
    "/conversation/new",
    response_model=NewConversationResponse,
    summary="Create a new conversation",
    description="Creates an empty conversation for a user. Returns the new conversation_id.",
)
async def new_conversation(user_id: str) -> NewConversationResponse:
    try:
        conversation_id = await conversation_service.create_conversation(user_id)
        return NewConversationResponse(conversation_id=conversation_id, user_id=user_id)
    except Exception as e:
        logger.error(f"Error creating conversation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create conversation.")
