"""
Document X-Ray Models — Feature 3

Pydantic models for structured document extraction results
and MongoDB document schema for upload persistence.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Pydantic Response Models
# ---------------------------------------------------------------------------

class ExtractedDate(BaseModel):
    label: str = Field(..., description="What this date represents, e.g. 'Agreement Start Date'")
    date: str = Field(..., description="Human-readable date string, e.g. '15 Jan 2024'")
    iso_date: Optional[str] = Field(None, description="ISO-8601 date if parseable")


class DocumentXRayResult(BaseModel):
    document_type: str = Field(..., description="e.g. 'Rent Agreement', 'Insurance Rejection Letter'")
    parties: list[str] = Field(default_factory=list, description="Names of parties involved")
    key_dates: list[ExtractedDate] = Field(default_factory=list)
    obligations: list[str] = Field(default_factory=list, description="What the user must do")
    red_flags: list[str] = Field(default_factory=list, description="Unusual or unfavorable clauses")
    suggested_limitation_rule_id: Optional[str] = Field(None, description="Maps to Module 3 limitation rules")
    suggested_wizard_scenario_id: Optional[str] = Field(None, description="Maps to Module 4 wizard scenarios")
    summary: str = Field("", description="Brief plain-English summary of the document")
    confidence: float = Field(0.8, description="Overall extraction confidence 0-1")


# ---------------------------------------------------------------------------
# MongoDB Document Builder
# ---------------------------------------------------------------------------

def xray_upload_document(
    user_id: str,
    filename: str,
    file_size_bytes: int,
    extracted_text_preview: str,
    result: dict,
) -> dict:
    """Build a document_xray_uploads MongoDB document."""
    return {
        "user_id": user_id,
        "filename": filename,
        "file_size_bytes": file_size_bytes,
        "extracted_text_preview": extracted_text_preview[:500],
        "result": result,
        "created_at": datetime.now(timezone.utc),
    }
