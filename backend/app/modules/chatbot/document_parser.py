"""
Document Parser Module — Extract text from uploaded PDF, DOCX, and TXT files.
"""
from __future__ import annotations

import io
from app.core.logging import get_logger

logger = get_logger(__name__)


def extract_text_from_file(filename: str, content_bytes: bytes) -> str:
    """
    Extract text content from raw bytes based on file extension.
    """
    ext = filename.lower().split(".")[-1] if "." in filename else ""

    if ext == "pdf":
        return _extract_pdf(content_bytes)
    elif ext in ("docx", "doc"):
        return _extract_docx(content_bytes)
    else:
        # Fallback to plain text decoding
        try:
            return content_bytes.decode("utf-8", errors="ignore").strip()
        except Exception as e:
            logger.error(f"Failed to decode text file '{filename}': {e}")
            return ""


def _extract_pdf(content_bytes: bytes) -> str:
    """Extract text from PDF using pypdf or PyPDF2 with fallback."""
    text_chunks = []
    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(content_bytes))
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text_chunks.append(t)
    except Exception as err:
        logger.warning(f"pypdf extraction failed, attempting PyPDF2: {err}")
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(content_bytes))
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    text_chunks.append(t)
        except Exception as err2:
            logger.error(f"PDF extraction failed completely: {err2}")

    return "\n\n".join(text_chunks).strip()


def _extract_docx(content_bytes: bytes) -> str:
    """Extract text from DOCX using python-docx."""
    try:
        import docx
        doc = docx.Document(io.BytesIO(content_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n".join(paragraphs).strip()
    except Exception as e:
        logger.error(f"DOCX extraction failed: {e}")
        return ""
