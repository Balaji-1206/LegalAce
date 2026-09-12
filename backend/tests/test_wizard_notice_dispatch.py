import pytest
from app.modules.wizard.service import build_dispatch_channels, generate_legal_document


def test_build_dispatch_channels_formats_clean_whatsapp_url():
    recipient_phone = "+91 98765 43210"
    notice_text = "LEGAL NOTICE: Under Section 106 of Transfer of Property Act, refund Rs. 50,000 within 15 days."
    channels = build_dispatch_channels(
        notice_text=notice_text,
        recipient_phone=recipient_phone,
        recipient_email="landlord@example.com",
        subject="Statutory Legal Demand Notice",
    )
    assert channels["whatsapp_url"] is not None
    assert "wa.me/919876543210" in channels["whatsapp_url"]
    assert "Transfer%20of%20Property%20Act" in channels["whatsapp_url"]
    assert "mailto:landlord@example.com" in channels["mailto_url"]


def test_build_dispatch_channels_truncates_long_notice_for_whatsapp():
    recipient_phone = "9876543210"
    long_notice = "A" * 3000
    channels = build_dispatch_channels(
        notice_text=long_notice,
        recipient_phone=recipient_phone,
        recipient_email=None,
        subject="Legal Notice",
        executive_summary="Under Section 35 Consumer Protection Act, claim of Rs. 50,000.",
    )
    # Encoded URL should remain safe (< 2500 chars)
    assert len(channels["whatsapp_url"]) < 2500
    assert "Full%20legal%20notice" in channels["whatsapp_url"] or "Consumer%20Protection%20Act" in channels["whatsapp_url"]


def test_build_dispatch_channels_handles_empty_phone():
    channels = build_dispatch_channels(
        notice_text="Demand notice",
        recipient_phone=None,
        recipient_email="test@example.com",
        subject="Legal Notice",
    )
    assert channels["whatsapp_url"] is not None
    # wa.me/?text=... without phone number allows user to select contact in WhatsApp
    assert "wa.me/?text=" in channels["whatsapp_url"]
    assert "mailto:test@example.com" in channels["mailto_url"]


@pytest.mark.anyio
async def test_dispatch_notice_endpoint_generates_valid_response():
    from app.modules.wizard.api import dispatch_notice, NoticeDispatchRequest
    req = NoticeDispatchRequest(
        template_id="housing_deposit",
        sender_name="Rahul Verma",
        recipient_name="Sharma Properties",
        recipient_phone="+91 9988776655",
        recipient_email="landlord@example.com",
        dispute_amount="75000",
        notice_days=15,
    )
    res = await dispatch_notice(req)
    assert "SECURITY DEPOSIT" in res["title"]
    assert "919988776655" in res["whatsapp_url"]
    assert "mailto:landlord@example.com" in res["mailto_url"]
    assert res["financial_breakdown"]["principal"] == 75000.0
    assert "Model Tenancy Act" in res["document_text"]
    assert res["ref_code"] != ""

