import numpy as np
from app.modules.chatbot.rag.embedder import _fallback_embed_text, EMBED_DIM


def test_fallback_embed_text_deterministic():
    text = "Consumer dispute regarding defective electronic refrigerator warranty"
    vec1 = _fallback_embed_text(text)
    vec2 = _fallback_embed_text(text)

    assert vec1.shape == (EMBED_DIM,)
    assert np.allclose(vec1, vec2)
    assert np.isclose(np.linalg.norm(vec1), 1.0)


def test_fallback_embed_text_empty_input():
    vec = _fallback_embed_text("")
    assert vec.shape == (EMBED_DIM,)
    assert np.all(vec == 0.0)
