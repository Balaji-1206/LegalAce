import pytest
from app.modules.wizard.service import generate_legal_document, generate_action_plan


def test_generate_legal_document_financial_computation():
    details = {
        "sender_name": "Balaji Kumar",
        "recipient_name": "Landlord Associates",
        "dispute_amount": "100000",
        "sender_city": "Chennai",
    }
    result = generate_legal_document(template_id="housing_deposit", details=details)
    breakdown = result["financial_breakdown"]

    assert breakdown["principal"] == 100000.0
    assert breakdown["interest"] == 12000.0
    assert breakdown["damages"] == 15000.0
    assert breakdown["total_claim"] == 127000.0


def test_generate_legal_document_dynamic_place():
    details = {
        "sender_name": "Priya Sharma",
        "sender_city": "Hyderabad",
        "dispute_amount": "25000",
    }
    result = generate_legal_document(template_id="housing_deposit", details=details)
    assert "Place: Hyderabad, India" in result["document_text"]


def test_generate_legal_document_invalid_dispute_amount_fallback():
    details = {
        "sender_name": "Ananya Roy",
        "dispute_amount": "abc_invalid_amount",
    }
    result = generate_legal_document(template_id="general_demand", details=details)
    breakdown = result["financial_breakdown"]

    assert breakdown["principal"] == 50000.0
    assert breakdown["interest"] == 6000.0
    assert breakdown["damages"] == 15000.0
    assert breakdown["total_claim"] == 71000.0


def test_generate_action_plan_housing_deposit_known_scenario():
    answers = {
        "q1": "more_than_21_days",
        "q2": "yes",
        "q3": "yes",
    }
    plan = generate_action_plan("housing_deposit", answers)

    assert plan["title"] == "Security Deposit Recovery Plan"
    assert len(plan["steps"]) > 0
    assert len(plan["required_documents"]) > 0
    assert "authorities" in plan


def test_generate_action_plan_unknown_scenario_fallback():
    plan = generate_action_plan("unknown_custom_scenario", {})
    assert plan["title"] == "General Legal Action Plan"
    assert len(plan["steps"]) > 0


def test_generate_doc_body_accepts_arbitrary_value_types():
    from app.modules.wizard.api import GenerateDocBody
    body = GenerateDocBody(
        template_id="legal_notice",
        details={
            "sender_name": "Advocate Ramesh",
            "notice_days": 15,
            "dispute_amount": 50000,
            "is_urgent": True,
        },
    )
    assert body.details["notice_days"] == 15
    assert body.details["is_urgent"] is True

