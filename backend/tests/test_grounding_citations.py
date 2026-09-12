import pytest
from app.modules.chatbot.schemas import LawCitation
from app.modules.chatbot.rag.faiss_store import LawChunk
from app.modules.chatbot.rag.pipeline import generate_smart_fallback

def test_law_citation_schema_supports_excerpt_and_grounding_score():
    citation = LawCitation(
        act="Transfer of Property Act, 1882",
        section="Section 106",
        section_title="Duration of certain leases in absence of written contract",
        relevance_score=0.92,
        excerpt="In the absence of a contract or local law or usage to the contrary, a lease of immovable property...",
        grounding_score=92.0,
    )
    assert citation.excerpt is not None
    assert "Section 106" in citation.section
    assert citation.grounding_score == 92.0

def test_generate_smart_fallback_populates_excerpt_and_grounding_score():
    sample_chunk = LawChunk(
        law_id="law_106",
        act_name="Transfer of Property Act, 1882",
        section_number="Section 106",
        section_title="Duration of certain leases",
        section_text="15 days notice expiring with the end of a month of tenancy...",
        category="housing",
        score=0.88,
    )
    res = generate_smart_fallback("tenant eviction notice", "housing_dispute", [sample_chunk])
    assert "law_citations" in res
    assert len(res["law_citations"]) > 0
    first_cit = res["law_citations"][0]
    assert first_cit.get("excerpt") == "15 days notice expiring with the end of a month of tenancy..."
    assert first_cit.get("grounding_score") == 88.0
