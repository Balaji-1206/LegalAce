"""
Law Retriever — embeds user query and searches FAISS index with strict relevance filtering.
"""
from __future__ import annotations

from app.core.config import settings
from app.core.logging import get_logger
from app.modules.chatbot.rag import embedder, faiss_store
from app.modules.chatbot.rag.faiss_store import LawChunk

logger = get_logger(__name__)

def _bm25_search_corpus(query: str, corpus: list[dict], top_k: int = 5) -> list[LawChunk]:
    """Perform BM25 keyword scoring over the statutory law corpus."""
    query_tokens = [w.lower() for w in query.split() if len(w) > 2]
    if not query_tokens:
        return []

    try:
        from rank_bm25 import BM25Okapi
        corpus_texts = [
            f"{c.get('act_name', '')} {c.get('section_number', '')} {c.get('section_title', '')} {c.get('section_text', '')}".lower().split()
            for c in corpus
        ]
        bm25 = BM25Okapi(corpus_texts)
        doc_scores = bm25.get_scores(query_tokens)
        top_indices = sorted(range(len(doc_scores)), key=lambda i: doc_scores[i], reverse=True)[:top_k]

        results = []
        max_s = max(doc_scores) if doc_scores.any() else 1.0
        for idx in top_indices:
            if doc_scores[idx] <= 0:
                continue
            meta = corpus[idx]
            norm_score = float(doc_scores[idx] / max_s) if max_s > 0 else 0.5
            results.append(LawChunk(
                law_id=meta["law_id"],
                act_name=meta["act_name"],
                section_number=meta["section_number"],
                section_title=meta["section_title"],
                section_text=meta["section_text"],
                category=meta["category"],
                score=norm_score,
            ))
        return results
    except Exception as e:
        logger.warning(f"BM25 search fallback skipped: {e}")
        return []


async def retrieve_relevant_laws(
    query: str,
    top_k: int = 5,
    min_score: float = 0.45,
) -> list[LawChunk]:
    """
    Hybrid Retrieval: combines vector semantic search with BM25 keyword search.
    """
    logger.info(f"Retrieving relevant laws for query: '{query[:80]}'")
    query_vector = embedder.embed(query)
    all_hits = faiss_store.search(query_vector, top_k=top_k)

    # Filter strictly by score threshold
    hits = [hit for hit in all_hits if hit.score >= min_score]

    # If vector search produced fewer than 2 high confidence results, augment with BM25 keyword matching
    if len(hits) < 2 and faiss_store._metadata:
        bm25_hits = _bm25_search_corpus(query, faiss_store._metadata, top_k=3)
        seen_ids = {h.law_id for h in hits}
        for b_hit in bm25_hits:
            if b_hit.law_id not in seen_ids:
                hits.append(b_hit)
                seen_ids.add(b_hit.law_id)

    logger.info(f"Retrieved {len(hits)} relevant law sections via hybrid retrieval.")
    for h in hits:
        logger.debug(f"  - [{h.score:.3f}] {h.act_name} {h.section_number}: {h.section_title}")

    return hits

