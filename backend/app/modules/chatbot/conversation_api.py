"""
Conversation management API endpoints.
  POST   /api/v1/conversation/new                 — Create a new conversation
  GET    /api/v1/conversation/history/{user_id}   — All conversations for a user
  GET    /api/v1/conversation/{id}                — Single conversation with messages
  DELETE /api/v1/conversation/{id}                — Delete a conversation
"""
from fastapi import APIRouter, HTTPException
from app.core.logging import get_logger
from app.modules.chatbot.schemas import NewConversationResponse
from app.modules.chatbot.conversation_schemas import (
    ConversationResponse,
    ConversationHistoryResponse,
    DeleteConversationResponse,
)
from app.modules.chatbot import conversation_service

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1", tags=["Conversations"])

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
