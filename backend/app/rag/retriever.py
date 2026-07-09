"""
Vector retriever — wraps FAISS search with intent-aware filtering.
"""
from __future__ import annotations

from app.core.logging import get_logger
from app.rag import embedder, faiss_store
from app.rag.faiss_store import LawChunk

logger = get_logger(__name__)

# Minimum cosine similarity score to include a result
SCORE_THRESHOLD = 0.25


async def retrieve_relevant_laws(
    query: str,
    intent: str,
    top_k: int = 7,
) -> list[LawChunk]:
    """
    Retrieve the most relevant Indian law sections for a given query.

    Strategy:
    1. Embed the query
    2. FAISS inner-product search (cosine similarity on normalized vectors)
    3. Filter by score threshold
    4. Prioritize results matching the classified intent
    5. Return top_k results

    Args:
        query: The user's natural-language legal question.
        intent: The classified intent (e.g., 'tenancy', 'employment').
        top_k: Maximum number of results to return.

    Returns:
        List of LawChunk ordered by relevance.
    """
    logger.info(f"Retrieving laws for intent='{intent}', query='{query[:80]}'")

    query_vector = embedder.embed(query)
    raw_results = faiss_store.search(query_vector, top_k=top_k * 2)  # over-fetch then filter

    # Filter by minimum score threshold
    filtered = [r for r in raw_results if r.score >= SCORE_THRESHOLD]

    if not filtered:
        logger.warning(f"No results above threshold {SCORE_THRESHOLD} — returning raw top-{top_k}")
        return raw_results[:top_k]

    # Prioritize intent-matching results (bring them to top, keep score ordering within groups)
    intent_matched = [r for r in filtered if r.category == intent]
    other_results = [r for r in filtered if r.category != intent]

    combined = intent_matched + other_results
    final_results = combined[:top_k]

    logger.info(
        f"Retrieved {len(final_results)} law sections "
        f"({len(intent_matched)} intent-matched, {len(other_results)} cross-category)"
    )
    return final_results
