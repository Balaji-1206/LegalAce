"""
Tests for Document X-Ray Module (Feature 3).
Validates text extraction, date parsing, LLM dict/list normalization,
and fallback rule-based extraction.
"""
import io
import pytest
from app.modules.document_xray.api import ALLOWED_EXTENSIONS, MAX_FILE_SIZE
from app.modules.document_xray import service
from app.modules.document_xray.models import DocumentXRayResult


def test_allowed_document_xray_extensions():
    """Verify supported document extensions for analysis."""
    assert ".pdf" in ALLOWED_EXTENSIONS
    assert ".docx" in ALLOWED_EXTENSIONS
    assert ".txt" in ALLOWED_EXTENSIONS
    assert ".png" in ALLOWED_EXTENSIONS
    assert ".jpg" in ALLOWED_EXTENSIONS
    assert ".exe" not in ALLOWED_EXTENSIONS


def test_document_xray_file_size_limit():
    """Verify 10 MB limit."""
    assert MAX_FILE_SIZE == 10 * 1024 * 1024


def test_parse_to_iso_date():
    """Verify robust ISO date conversion for various Indian legal date formats."""
    assert service.parse_to_iso_date("2024-05-15") == "2024-05-15"
    assert service.parse_to_iso_date("15-05-2024") == "2024-05-15"
    assert service.parse_to_iso_date("15/05/2024") == "2024-05-15"
    assert service.parse_to_iso_date("15 Jan 2024") == "2024-01-15"
    assert service.parse_to_iso_date("15 January 2024") == "2024-01-15"
    assert service.parse_to_iso_date("") is None


def test_normalize_xray_data_with_dict_outputs():
    """Ensure LLMs returning key-value dictionaries are properly normalized to lists."""
    raw_llm_output = {
        "document_type": "Rental Agreement",
        "parties": {"landlord": "Mr. Ramesh", "tenant": "Mr. Suresh"},
        "key_dates": {"start_date": "15-01-2024", "end_date": "14-01-2025"},
        "obligations": {"rent": "Pay Rs 20,000", "notice": "30 days"},
        "red_flags": {"penalty": "Forfeiture of entire security deposit without notice"},
        "summary": "1-year residential tenancy agreement."
    }

    norm = service.normalize_xray_data(raw_llm_output)

    assert isinstance(norm["parties"], list)
    assert any("Landlord" in p for p in norm["parties"])
    assert isinstance(norm["key_dates"], list)
    assert norm["key_dates"][0]["iso_date"] == "2024-01-15"
    assert isinstance(norm["obligations"], list)
    assert isinstance(norm["red_flags"], list)

    # Validate that DocumentXRayResult Pydantic model parses without error
    model = DocumentXRayResult(**norm)
    assert model.document_type == "Rental Agreement"
    assert len(model.key_dates) == 2


def test_rule_based_extraction_dates_and_red_flags():
    """Test rule-based fallback when LLM is offline or busy."""
    sample_text = """
    RENTAL AGREEMENT
    This deed is made on 01-04-2024 between Mr. Gupta and Mr. Sharma.
    The tenant must pay rent within 5 days of each month.
    The tenant shall maintain the premises.
    If rent is unpaid, the landlord may forfeit the deposit without notice.
    """
    extracted = service._rule_based_extraction(sample_text)

    assert extracted["document_type"] == "Rent Agreement"
    assert len(extracted["key_dates"]) >= 1
    assert extracted["key_dates"][0]["iso_date"] == "2024-04-01"
    assert len(extracted["obligations"]) >= 1
    assert len(extracted["red_flags"]) >= 1


@pytest.mark.anyio
async def test_analyze_document_file_plain_text():
    """Integration test: analyze a plain text legal demand notice."""
    notice_text = """
    LEGAL DEMAND NOTICE
    Date: 10-10-2024
    To: XYZ Electronics Ltd
    From: Rahul Sen
    Subject: Defective refrigerator under Consumer Protection Act 2019
    You are hereby called upon to refund Rs. 35,000 within 15 days of this notice.
    Failing which legal proceedings will be initiated before District Consumer Disputes Redressal Commission.
    """
    result, preview = await service.analyze_document_file(
        file_bytes=notice_text.encode("utf-8"),
        filename="notice.txt",
        mime_type="text/plain",
    )

    assert result.document_type in ("Legal Notice", "Consumer Complaint", "Legal Document")
    assert len(result.key_dates) >= 1
    assert any("2024-10-10" == d.iso_date for d in result.key_dates)
    assert len(result.obligations) >= 1


def test_analyze_base64_api_endpoint():
    """Verify POST /api/v1/document-xray/analyze-base64 works via TestClient."""
    import base64
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    notice = "LEGAL NOTICE: Pay Rs 10000 on 12-08-2024 to Landlord Ramesh."
    b64 = base64.b64encode(notice.encode("utf-8")).decode("utf-8")

    res = client.post(
        "/api/v1/document-xray/analyze-base64",
        json={
            "file_base64": b64,
            "filename": "notice.txt",
            "mime_type": "text/plain",
            "user_id": "test_base64_user"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert "result" in data
    assert "document_type" in data["result"]
    assert "upload_id" in data
