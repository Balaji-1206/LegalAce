"""
Singleton SentenceTransformer embedder.
Loaded once during app lifespan startup to avoid repeated model loads.
"""
from __future__ import annotations

import numpy as np
from sentence_transformers import SentenceTransformer

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_model: SentenceTransformer | None = None

def load_embedder() -> None:
    """Initialize the embedding model. Call during FastAPI lifespan startup."""
    global _model
    logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
    _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    logger.info("Embedding model loaded successfully.")

def embed(text: str) -> np.ndarray:
    """Generate a normalized embedding vector for a given text string."""
    if _model is None:
        raise RuntimeError("Embedder not initialized. Call load_embedder() first.")
    vector: np.ndarray = _model.encode(text, normalize_embeddings=True)
    return vector

def embed_batch(texts: list[str]) -> np.ndarray:
    """Generate normalized embeddings for a batch of texts."""
    if _model is None:
        raise RuntimeError("Embedder not initialized. Call load_embedder() first.")
    vectors: np.ndarray = _model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return vectors
