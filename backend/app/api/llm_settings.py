"""
Runtime LLM Provider Settings — Add-on module.

Stores the active LLM provider override in memory at runtime.
Does NOT modify the existing planner/pipeline tier chain structure.
The override simply tells each tier to skip if it is not the selected provider.
"""
from __future__ import annotations

from fastapi import APIRouter
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1/llm-settings", tags=["LLM Settings"])

# ---------------------------------------------------------------------------
# In-memory runtime state — persists for the lifetime of the server process.
# Set to "auto" by default to preserve the existing Gemini→OpenAI→Ollama chain.
# ---------------------------------------------------------------------------
_runtime_provider: str = "auto"   # options: "auto" | "gemini" | "openai" | "ollama"


def get_active_provider() -> str:
    """Return the current runtime LLM provider override."""
    return _runtime_provider


def set_active_provider(provider: str) -> None:
    """Set the runtime LLM provider override."""
    global _runtime_provider
    valid = {"auto", "gemini", "openai", "ollama"}
    if provider not in valid:
        raise ValueError(f"Invalid provider '{provider}'. Must be one of: {valid}")
    _runtime_provider = provider
    logger.info(f"[LLM Settings] Runtime provider changed to: '{provider}'")


# ---------------------------------------------------------------------------
# REST API Endpoints
# ---------------------------------------------------------------------------

PROVIDER_META = {
    "auto":   {"label": "Auto (Fallback Chain)", "icon": "🔄", "description": "Gemini → OpenAI → Ollama → Rule-based"},
    "gemini": {"label": "Google Gemini",          "icon": "✨", "description": "Cloud — best legal reasoning quality"},
    "openai": {"label": "OpenAI GPT-4o",           "icon": "🧠", "description": "Cloud — strong reasoning, JSON output"},
    "ollama": {"label": "Ollama (Local GPU)",       "icon": "🦙", "description": "Private — fully on-device, RTX 4060"},
}


@router.get("", summary="Get current active LLM provider setting")
async def get_llm_provider():
    """Returns the currently active LLM provider runtime override."""
    current = get_active_provider()
    return {
        "provider": current,
        **PROVIDER_META.get(current, {}),
        "all_providers": [
            {"id": k, **v}
            for k, v in PROVIDER_META.items()
        ],
    }


@router.post("", summary="Change runtime LLM provider")
async def set_llm_provider(body: dict):
    """
    Set the active LLM provider at runtime.
    Body: { "provider": "auto" | "gemini" | "openai" | "ollama" }
    """
    provider = body.get("provider", "auto")
    try:
        set_active_provider(provider)
        current = get_active_provider()
        return {
            "success": True,
            "provider": current,
            **PROVIDER_META.get(current, {}),
        }
    except ValueError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))
