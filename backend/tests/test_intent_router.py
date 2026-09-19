"""
Tests for Deterministic Intent Router (app.modules.chatbot.intent_router).
Verifies instant (< 1ms) category identification, governing Indian statute assignment,
and urgent police/eviction detection without LLM inference.
"""
import time
from app.modules.chatbot.intent_router import classify_citizen_query


def test_tenancy_query_routing():
    t0 = time.perf_counter()
    res = classify_citizen_query("My landlord is not returning my security deposit of 50000 after I vacated.")
    duration_ms = (time.perf_counter() - t0) * 1000

    assert res["detected_category"] == "housing"
    assert "Model Tenancy Act" in res["relevant_statute"]
    assert res["is_urgent"] is False
    assert duration_ms < 10.0  # Must be sub-millisecond to low millisecond


def test_urgency_police_arrest_detection():
    res = classify_citizen_query("Police are threatening to arrest me without an FIR and locking me out.")
    assert res["is_urgent"] is True


def test_consumer_dispute_routing():
    res = classify_citizen_query("I bought a defective laptop on Amazon and they refuse to give a refund.")
    assert res["detected_category"] == "consumer"
    assert "Consumer Protection Act" in res["relevant_statute"]


def test_cheque_bounce_routing():
    res = classify_citizen_query("Client cheque bounced due to insufficient funds, what notice to send?")
    assert res["detected_category"] == "cheque_debt"
    assert "Section 138" in res["relevant_statute"]


def test_general_query_routing():
    res = classify_citizen_query("What are the basic fundamental duties of a citizen?")
    assert res["detected_category"] == "general"
    assert "Constitution of India" in res["relevant_statute"]
