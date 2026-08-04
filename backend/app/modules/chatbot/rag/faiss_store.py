"""
FAISS / NumPy vector store for the Indian Law Corpus.
"""
from __future__ import annotations

import json
import pickle
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Safely import faiss; fall back to NumPy if native DLL is blocked by OS policy
try:
    import faiss
    HAS_FAISS = True
except Exception as err:
    faiss = None
    HAS_FAISS = False
    logger.warning(f"FAISS native library could not be loaded ({err}). Falling back to NumPy vector operations.")

@dataclass
class LawChunk:
    """Represents a single retrieved law section from the vector store."""
    law_id: str
    act_name: str
    section_number: str
    section_title: str
    section_text: str
    category: str
    score: float = 0.0

_faiss_index: faiss.Index | None = None if HAS_FAISS else None
_numpy_vectors: np.ndarray | None = None
_metadata: list[dict] = []

def is_loaded() -> bool:
    return _faiss_index is not None or _numpy_vectors is not None

def _index_path() -> Path:
    return Path(settings.FAISS_INDEX_PATH)

def build_and_save_index() -> None:
    """
    Build a vector index from the Indian Law Corpus JSON and save to disk.
    """
    from app.modules.chatbot.rag import embedder  # modular import

    corpus_path = Path(settings.LAW_CORPUS_PATH)
    if not corpus_path.exists():
        raise FileNotFoundError(f"Law corpus not found at: {corpus_path}")

    with corpus_path.open("r", encoding="utf-8") as f:
        corpus: list[dict] = json.load(f)

    logger.info(f"Building vector index from {len(corpus)} law sections...")
    texts = [f"{item['act_name']} {item['section_title']} {item['section_text']}" for item in corpus]
    vectors = embedder.embed_batch(texts)  # shape: (N, dim)

    index_dir = _index_path()
    index_dir.mkdir(parents=True, exist_ok=True)

    # Save raw vectors for NumPy fallback
    np.save(index_dir / "vectors.npy", vectors.astype(np.float32))

    # Save FAISS index if available
    if HAS_FAISS:
        try:
            dim = vectors.shape[1]
            index = faiss.IndexFlatIP(dim)
            index.add(vectors.astype(np.float32))
            faiss.write_index(index, str(index_dir / "index.faiss"))
        except Exception as e:
            logger.warning(f"Could not build FAISS index: {e}. Will use NumPy vector store.")

    with open(index_dir / "index.pkl", "wb") as f:
        pickle.dump(corpus, f)

    logger.info(f"Vector index saved to '{index_dir}' — {len(corpus)} vectors indexed.")

def load_index() -> None:
    """
    Load the persisted vector index and metadata into memory.
    """
    global _faiss_index, _numpy_vectors, _metadata

    index_dir = _index_path()
    index_file = index_dir / "index.faiss"
    vectors_file = index_dir / "vectors.npy"
    meta_file = index_dir / "index.pkl"

    need_build = False
    if not meta_file.exists():
        need_build = True
    elif HAS_FAISS and not index_file.exists():
        need_build = True
    elif not HAS_FAISS and not vectors_file.exists():
        need_build = True

    if need_build:
        logger.warning("Vector index files missing — building vector index from corpus now...")
        build_and_save_index()

    if HAS_FAISS and index_file.exists():
        try:
            _faiss_index = faiss.read_index(str(index_file))
            logger.info(f"FAISS index loaded — {_faiss_index.ntotal} vectors.")
        except Exception as e:
            logger.warning(f"Could not load FAISS index: {e}. Falling back to NumPy vectors.")
            _faiss_index = None

    if _faiss_index is None and vectors_file.exists():
        _numpy_vectors = np.load(str(vectors_file))
        logger.info(f"NumPy vector index loaded — {_numpy_vectors.shape[0]} vectors.")

    with open(meta_file, "rb") as f:
        _metadata = pickle.load(f)

    logger.info(f"Vector index ready — {len(_metadata)} law sections loaded.")

def search(query_vector: np.ndarray, top_k: int = 5) -> list[LawChunk]:
    """
    Search the vector index for the most relevant law sections.
    """
    if not is_loaded():
        load_index()

    if _faiss_index is None and _numpy_vectors is None:
        raise RuntimeError("Vector store index not loaded. Call load_index() first.")

    query = query_vector.astype(np.float32).flatten()

    if _faiss_index is not None:
        scores_arr, indices_arr = _faiss_index.search(query.reshape(1, -1), top_k)
        scores = scores_arr[0]
        indices = indices_arr[0]
    else:
        # Pure NumPy dot product (equivalent to Inner Product search)
        scores_all = np.dot(_numpy_vectors, query)
        top_k_idx = np.argsort(scores_all)[::-1][:top_k]
        scores = scores_all[top_k_idx]
        indices = top_k_idx

    results: list[LawChunk] = []
    for score, idx in zip(scores, indices):
        if idx == -1 or idx >= len(_metadata):
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
