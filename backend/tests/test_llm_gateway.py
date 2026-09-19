"""
Tests for Unified LLM Gateway (app.core.llm_gateway).
Validates in-memory caching, think-tag stripping, and clean JSON parsing.
"""
import pytest
from app.core.llm_gateway import _clean_and_parse_json, _LLM_RESPONSE_CACHE, call_unified_llm


def test_clean_and_parse_json_markdown_fence():
    raw = "```json\n{\"status\": \"success\", \"code\": 200}\n```"
    parsed = _clean_and_parse_json(raw)
    assert parsed == {"status": "success", "code": 200}


def test_clean_and_parse_json_with_think_tags():
    raw = """<think>
The user wants to analyze a legal dispute regarding tenancy.
I will structure the JSON response accordingly.
</think>
{"document_type": "Rental Agreement", "is_valid": true}"""
    parsed = _clean_and_parse_json(raw)
    assert parsed == {"document_type": "Rental Agreement", "is_valid": True}


def test_clean_and_parse_json_embedded_json():
    raw = "Here is the legal response: {\"category\": \"consumer\", \"remedy\": \"refund\"} - End of response."
    parsed = _clean_and_parse_json(raw)
    assert parsed == {"category": "consumer", "remedy": "refund"}


@pytest.mark.anyio
async def test_llm_gateway_cache_hit():
    """Verify that repeated prompts hit the in-memory cache at $0 cost and 0ms."""
    prompt = "TEST_UNIQUE_PROMPT_FOR_CACHE_VERIFICATION"
    
    # Seed cache
    from hashlib import md5
    cache_key = md5(f"{prompt}_{None}_{True}".encode("utf-8")).hexdigest()
    _LLM_RESPONSE_CACHE[cache_key] = {"cached_status": "hit"}

    res = await call_unified_llm(prompt=prompt, json_mode=True)
    assert res == {"cached_status": "hit"}
