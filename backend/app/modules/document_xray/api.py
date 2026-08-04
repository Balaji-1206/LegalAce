"""
Document X-Ray API — Feature 3

Endpoints:
  POST  /api/v1/document-xray/analyze        — Upload & analyze a document
  GET   /api/v1/document-xray/uploads/{uid}   — Get past upload history
"""
from __future__ import annotations

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.core.logging import get_logger
from app.modules.document_xray import service

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/document-xray", tags=["document-xray"])

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".tiff"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/analyze")
async def analyze_document(
    file: UploadFile = File(...),
    user_id: str = Form("anonymous"),
):
    """
    Upload a legal document (PDF or image) for AI-powered analysis.
    Extracts: document type, parties, key dates, obligations, red flags.
    """
    # Validate file type
    filename = file.filename or "upload"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Read file bytes
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10 MB.")
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    logger.info(f"Document X-Ray: analyzing '{filename}' ({len(file_bytes)} bytes) for user {user_id}")

    # Extract text based on file type
    if ext == ".pdf":
        extracted_text = service.extract_text_from_pdf(file_bytes)
    else:
        extracted_text = service.extract_text_from_image(file_bytes)

    if not extracted_text or len(extracted_text.strip()) < 10:
        raise HTTPException(
            status_code=422,
            detail="Could not extract readable text from the document. Please upload a clearer file or a digital (non-scanned) PDF."
        )

    # Run LLM analysis
    result = await service.analyze_document(extracted_text)

    # Save to database
    saved = await service.save_upload(
        user_id=user_id,
        filename=filename,
        file_size=len(file_bytes),
        text_preview=extracted_text[:500],
        result=result,
    )

    return {
        "upload_id": saved.get("id"),
        "filename": filename,
        "result": result.model_dump(),
        "extracted_text_preview": extracted_text[:300],
    }


@router.get("/uploads/{user_id}")
async def get_uploads(user_id: str):
    """Retrieve past document analysis uploads for a user."""
    uploads = await service.get_user_uploads(user_id)
    return {"uploads": uploads, "count": len(uploads)}
