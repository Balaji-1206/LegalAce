"""
Law Retriever — embeds user query and searches FAISS index.
"""
from __future__ import annotations

from app.core.config import settings
from app.core.logging import get_logger
from app.modules.chatbot.rag import embedder, faiss_store
from app.modules.chatbot.rag.faiss_store import LawChunk

logger = get_logger(__name__)

async def retrieve_relevant_laws(
    query: str,
    top_k: int = 5,
    min_score: float = 0.35,
) -> list[LawChunk]:
    """
    Generate query embedding, search the FAISS index, and filter by score threshold.
    """
    logger.info(f"Retrieving relevant laws for query: '{query[:80]}'")
    query_vector = embedder.embed(query)
    all_hits = faiss_store.search(query_vector, top_k=top_k)

    # Filter by score threshold
    hits = [hit for hit in all_hits if hit.score >= min_score]

    # Fallback to category search if no semantic matches were found
    if not hits:
        logger.warning(
            f"No statutory text matches found above threshold ({min_score}) — "
            "returning top 2 generic matches to prevent failure."
        )
        hits = all_hits[:2]

    logger.info(f"Retrieved {len(hits)} relevant law sections.")
    for h in hits:
        logger.debug(f"  - [{h.score:.3f}] {h.act_name} {h.section_number}: {h.section_title}")

    return hits
