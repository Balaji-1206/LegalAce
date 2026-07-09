"""
Conversation management API endpoints.
  GET    /api/v1/conversation/history/{user_id}   — All conversations for a user
  GET    /api/v1/conversation/{id}                — Single conversation with messages
  DELETE /api/v1/conversation/{id}                — Delete a conversation
"""
from fastapi import APIRouter, HTTPException
from app.core.logging import get_logger
from app.schemas.conversation import (
    ConversationResponse,
    ConversationHistoryResponse,
    DeleteConversationResponse,
)
from app.services import conversation_service

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1", tags=["Conversations"])


@router.get(
    "/conversation/history/{user_id}",
    response_model=ConversationHistoryResponse,
    summary="Get all conversations for a user",
    description="Returns a summary list of all conversations for the given user, sorted by most recently updated.",
)
async def get_user_history(user_id: str) -> ConversationHistoryResponse:
    try:
        return await conversation_service.get_user_history(user_id)
    except Exception as e:
        logger.error(f"Error fetching history for user '{user_id}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve conversation history.")


@router.get(
    "/conversation/{conversation_id}",
    response_model=ConversationResponse,
    summary="Get a conversation by ID",
    description="Returns the full conversation including all messages and law citations.",
)
async def get_conversation(conversation_id: str) -> ConversationResponse:
    result = await conversation_service.get_conversation(conversation_id)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"Conversation '{conversation_id}' not found.",
        )
    return result


@router.delete(
    "/conversation/{conversation_id}",
    response_model=DeleteConversationResponse,
    summary="Delete a conversation",
    description="Permanently deletes a conversation and all its messages.",
)
async def delete_conversation(conversation_id: str) -> DeleteConversationResponse:
    deleted = await conversation_service.delete_conversation(conversation_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail=f"Conversation '{conversation_id}' not found.",
        )
    return DeleteConversationResponse(conversation_id=conversation_id)
