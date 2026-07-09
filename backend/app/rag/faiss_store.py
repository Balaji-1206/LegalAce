"""
FAISS vector store for the Indian Law Corpus.

Responsibilities:
- Build the FAISS index from corpus JSON + embeddings
- Persist the index to disk for fast reload
- Search by query embedding and return top-k law chunks
"""
from __future__ import annotations

import json
import os
import pickle
from dataclasses import dataclass, field
from pathlib import Path

import faiss
import numpy as np

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class LawChunk:
    """Represents a single retrieved law section from the FAISS index."""
    law_id: str
    act_name: str
    section_number: str
    section_title: str
    section_text: str
    category: str
    score: float = 0.0


# ---------------------------------------------------------------------------
# Module-level singletons
# ---------------------------------------------------------------------------
_faiss_index: faiss.Index | None = None
_metadata: list[dict] = []


def _index_path() -> Path:
    return Path(settings.FAISS_INDEX_PATH)


def build_and_save_index() -> None:
    """
    Build a FAISS index from the Indian Law Corpus JSON and save to disk.
    Called once by the seed script (scripts/build_faiss_index.py) and also
    as a fallback during startup if no persisted index exists.
    """
    from app.rag import embedder  # lazy import to avoid circular

    corpus_path = Path(settings.LAW_CORPUS_PATH)
    if not corpus_path.exists():
        raise FileNotFoundError(f"Law corpus not found at: {corpus_path}")

    with corpus_path.open("r", encoding="utf-8") as f:
        corpus: list[dict] = json.load(f)

    logger.info(f"Building FAISS index from {len(corpus)} law sections...")
    texts = [f"{item['act_name']} {item['section_title']} {item['section_text']}" for item in corpus]
    vectors = embedder.embed_batch(texts)  # shape: (N, dim)

    dim = vectors.shape[1]
    index = faiss.IndexFlatIP(dim)  # Inner product on normalized vectors = cosine similarity
    index.add(vectors.astype(np.float32))

    # Persist
    index_dir = _index_path()
    index_dir.mkdir(parents=True, exist_ok=True)
    faiss.write_index(index, str(index_dir / "index.faiss"))
    with open(index_dir / "index.pkl", "wb") as f:
        pickle.dump(corpus, f)

    logger.info(f"FAISS index saved to '{index_dir}' — {index.ntotal} vectors indexed.")


def load_index() -> None:
    """
    Load the persisted FAISS index and metadata into memory.
    Called during FastAPI lifespan startup.
    If no index exists, builds it from the corpus first.
    """
    global _faiss_index, _metadata

    index_dir = _index_path()
    index_file = index_dir / "index.faiss"
    meta_file = index_dir / "index.pkl"

    if not index_file.exists() or not meta_file.exists():
        logger.warning("FAISS index not found — building from corpus now...")
        build_and_save_index()

    logger.info("Loading FAISS index from disk...")
    _faiss_index = faiss.read_index(str(index_file))
    with open(meta_file, "rb") as f:
        _metadata = pickle.load(f)

    logger.info(f"FAISS index loaded — {_faiss_index.ntotal} vectors, {len(_metadata)} law sections.")


def search(query_vector: np.ndarray, top_k: int = 5) -> list[LawChunk]:
    """
    Search the FAISS index for the most relevant law sections.

    Args:
        query_vector: Normalized embedding of the user's query.
        top_k: Number of top results to return.

    Returns:
        List of LawChunk sorted by relevance score (descending).
    """
    if _faiss_index is None:
        raise RuntimeError("FAISS index not loaded. Call load_index() first.")

    query = query_vector.astype(np.float32).reshape(1, -1)
    scores, indices = _faiss_index.search(query, top_k)

    results: list[LawChunk] = []
    for score, idx in zip(scores[0], indices[0]):
        if idx == -1:
            continue
        meta = _metadata[idx]
        results.append(
            LawChunk(
                law_id=meta["law_id"],
                act_name=meta["act_name"],
                section_number=meta["section_number"],
                section_title=meta["section_title"],
                section_text=meta["section_text"],
                category=meta["category"],
                score=float(score),
            )
        )

    return results
