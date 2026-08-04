"""
Singleton SentenceTransformer embedder with pure-NumPy Hashing fallback.
Handles OS Application Control Policy restrictions gracefully.
"""
from __future__ import annotations

import numpy as np
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_model = None
_use_fallback = False
EMBED_DIM = 384


def is_loaded() -> bool:
    return _model is not None or _use_fallback


def load_embedder() -> None:
    """Initialize the embedding model with fallback if PyTorch DLL is blocked."""
    global _model, _use_fallback
    if is_loaded():
        return

    logger.info(f"Attempting to load embedding model: {settings.EMBEDDING_MODEL}")
    try:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
        logger.info("SentenceTransformer model loaded successfully.")
    except Exception as err:
        _use_fallback = True
        logger.warning(f"Could not load SentenceTransformer ({err}). Using pure-NumPy hashing embedder fallback.")


def _fallback_embed_text(text: str, dim: int = EMBED_DIM) -> np.ndarray:
    """Pure NumPy deterministic feature hashing embedder fallback."""
    vec = np.zeros(dim, dtype=np.float32)
    words = [w.lower() for w in text.split() if len(w) > 2]
    if not words:
        return vec

    for word in words:
        idx = abs(hash(word)) % dim
        vec[idx] += 1.0

    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    return vec


def embed(text: str) -> np.ndarray:
    """Generate a normalized embedding vector for a given text string."""
    if not is_loaded():
        load_embedder()

    if _model is not None:
        return _model.encode(text, normalize_embeddings=True)

    return _fallback_embed_text(text)


def embed_batch(texts: list[str]) -> np.ndarray:
    """Generate normalized embeddings for a batch of texts."""
    if not is_loaded():
        load_embedder()

    if _model is not None:
        return _model.encode(texts, normalize_embeddings=True, show_progress_bar=False)

    return np.array([_fallback_embed_text(t) for t in texts], dtype=np.float32)
