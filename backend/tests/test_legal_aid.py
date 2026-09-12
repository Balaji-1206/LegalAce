import pytest
from pydantic import ValidationError
from app.modules.legal_aid.api import EligibilityCheckRequest
from app.modules.legal_aid import service


def test_eligibility_request_zero_income_valid():
    req = EligibilityCheckRequest(annual_income=0, state="Karnataka")
    assert req.annual_income == 0


def test_eligibility_request_positive_income_valid():
    req = EligibilityCheckRequest(annual_income=250000, state="Delhi (NCR)")
    assert req.annual_income == 250000


def test_eligibility_request_negative_income_raises_validation_error():
    with pytest.raises(ValidationError):
        EligibilityCheckRequest(annual_income=-100, state="Karnataka")


def test_check_eligibility_qualifies_below_state_threshold():
    result = service.check_eligibility(
        annual_income=200000,
        state="Karnataka",
        category_flags=[],
    )
    assert result.eligible is True
    assert any("Section 12(h)" in reason for reason in result.reasons)


def test_check_eligibility_fails_above_state_threshold_without_flags():
    result = service.check_eligibility(
        annual_income=600000,
        state="Karnataka",
        category_flags=[],
    )
    assert result.eligible is False
    assert len(result.qualifying_categories) == 0


def test_check_eligibility_woman_child_qualifies_regardless_of_income():
    result = service.check_eligibility(
        annual_income=1200000,
        state="Maharashtra",
        category_flags=["woman_child"],
    )
    assert result.eligible is True
    assert "Woman or Child" in result.qualifying_categories


def test_check_eligibility_sc_st_qualifies_regardless_of_income():
    result = service.check_eligibility(
        annual_income=900000,
        state="Tamil Nadu",
        category_flags=["sc_st"],
    )
    assert result.eligible is True
    assert "Scheduled Caste / Scheduled Tribe" in result.qualifying_categories


def test_check_eligibility_suggested_authority_state_match():
    result = service.check_eligibility(
        annual_income=150000,
        state="Karnataka",
        category_flags=[],
    )
    assert result.suggested_authority == "Karnataka SLSA"


def test_check_eligibility_suggested_authority_fallback_for_unknown_state():
    result = service.check_eligibility(
        annual_income=150000,
        state="Unknown Territory",
        category_flags=[],
    )
    assert "NALSA" in result.suggested_authority
