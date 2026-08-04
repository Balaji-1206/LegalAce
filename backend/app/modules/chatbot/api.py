"""
Chat API endpoints for Floating Agentic Chatbot.
  POST /api/v1/chat                   — Main multi-persona chat endpoint
  POST /api/v1/chat/analyze-doc       — Contract & legal document risk analysis
  GET  /api/v1/chat/prompts           — Quick prompts for floating chatbot ribbon
"""
from typing import List
from fastapi import APIRouter, HTTPException
from app.core.logging import get_logger
from app.modules.chatbot.schemas import (
    ChatRequest,
    ChatResponse,
    DocAnalysisRequest,
    DocAnalysisResponse,
    QuickPromptItem,
)
from app.modules.chatbot import service as chat_service

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1/chat", tags=["Chat"])

@router.post(
    "",
    response_model=ChatResponse,
    summary="Send a legal question to LegalAce Floating AI Agent",
    description=(
        "Submit a query to LegalAce Agentic Chatbot. Supports agent personas "
        "('general', 'contracts', 'disputes', 'rights'), multi-turn context, "
        "and document attachments."
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
    "/analyze-doc",
    response_model=DocAnalysisResponse,
    summary="Analyze contract or legal document text for risk clauses",
    description="Scans contract clauses for unfair terms, forfeiture risks, and statutory rights under Indian Law.",
)
async def analyze_document(request: DocAnalysisRequest) -> DocAnalysisResponse:
    try:
        return await chat_service.analyze_document_contract(request)
    except Exception as e:
        logger.error(f"Error in document risk analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to analyze document.")

@router.get(
    "/prompts",
    response_model=List[QuickPromptItem],
    summary="Fetch quick prompts ribbon items for floating chatbot",
)
async def get_prompts() -> List[QuickPromptItem]:
    return chat_service.get_quick_prompts()


from fastapi import UploadFile, File

@router.post(
    "/upload-document",
    summary="Upload PDF/DOCX/TXT legal document and extract text",
    description="Parses uploaded document file and extracts text for AI analysis.",
)
async def upload_document(file: UploadFile = File(...)):
    try:
        from app.modules.chatbot.document_parser import extract_text_from_file
        content = await file.read()
        extracted_text = extract_text_from_file(file.filename or "document.pdf", content)
        word_count = len(extracted_text.split()) if extracted_text else 0
        logger.info(f"Uploaded and extracted '{file.filename}': {word_count} words")
        return {
            "filename": file.filename,
            "extracted_text": extracted_text,
            "word_count": word_count,
            "success": bool(extracted_text),
        }
    except Exception as e:
        logger.error(f"Error uploading document {file.filename}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to parse uploaded document: {e}")
