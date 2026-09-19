"""
Document X-Ray API — Feature 3

Endpoints:
  POST  /api/v1/document-xray/analyze        — Upload & analyze via Multipart FormData
  POST  /api/v1/document-xray/analyze-base64 — Upload & analyze via Base64 JSON (mobile fallback)
  GET   /api/v1/document-xray/uploads/{uid}   — Get past upload history
"""
from __future__ import annotations

import base64
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel, Field
from app.core.logging import get_logger
from app.modules.document_xray import service

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/document-xray", tags=["document-xray"])

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".tiff", ".txt", ".docx", ".doc"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class AnalyzeBase64Request(BaseModel):
    file_base64: str = Field(..., description="Base64-encoded document content")
    filename: str = Field(..., description="Document filename with extension")
    mime_type: Optional[str] = Field("application/pdf", description="MIME type")
    user_id: Optional[str] = Field("anonymous", description="User ID")


@router.post("/analyze")
async def analyze_document(
    file: UploadFile = File(...),
    user_id: str = Form("anonymous"),
):
    """
    Upload a legal document (PDF, DOCX, TXT, or image) for AI-powered analysis.
    Extracts: document type, parties, key dates, obligations, red flags.
    Supports both digital text and multimodal vision for scanned documents.
    """
    # Validate file type
    filename = file.filename or "upload"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # Read file bytes
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10 MB.")
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    logger.info(f"Document X-Ray: analyzing '{filename}' ({len(file_bytes)} bytes) for user {user_id}")

    # Process and analyze document via multimodal/text pipeline
    mime_type = file.content_type or "application/pdf"
    result, text_preview = await service.analyze_document_file(
        file_bytes=file_bytes,
        filename=filename,
        mime_type=mime_type,
    )

    # Save to database (with fallback if DB connection fails)
    saved = await service.save_upload(
        user_id=user_id,
        filename=filename,
        file_size=len(file_bytes),
        text_preview=text_preview[:500],
        result=result,
    )

    return {
        "upload_id": saved.get("id"),
        "filename": filename,
        "result": result.model_dump(),
        "extracted_text_preview": text_preview[:300],
    }


@router.post("/analyze-base64")
async def analyze_document_base64(req: AnalyzeBase64Request):
    """
    Direct base64 document upload endpoint for environments (like mobile React Native)
    where native multipart/form-data faces platform FormDataPart issues.
    """
    filename = req.filename or "upload"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # Decode base64
    try:
        raw_b64 = req.file_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        file_bytes = base64.b64decode(raw_b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 document data: {e}")

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10 MB.")
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    logger.info(f"Document X-Ray (Base64): analyzing '{filename}' ({len(file_bytes)} bytes) for user {req.user_id}")

    mime_type = req.mime_type or "application/pdf"
    result, text_preview = await service.analyze_document_file(
        file_bytes=file_bytes,
        filename=filename,
        mime_type=mime_type,
    )

    saved = await service.save_upload(
        user_id=req.user_id or "anonymous",
        filename=filename,
        file_size=len(file_bytes),
        text_preview=text_preview[:500],
        result=result,
    )

    return {
        "upload_id": saved.get("id"),
        "filename": filename,
        "result": result.model_dump(),
        "extracted_text_preview": text_preview[:300],
    }


@router.get("/uploads/{user_id}")
async def get_uploads(user_id: str):
    """Retrieve past document analysis uploads for a user."""
    uploads = await service.get_user_uploads(user_id)
    return {"uploads": uploads, "count": len(uploads)}
