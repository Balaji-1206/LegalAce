from datetime import datetime, timezone
import pytest
from pydantic import ValidationError
from app.modules.deadline_engine.api import DeadlineCreateBody
from app.modules.deadline_engine.extractor import (
    detect_category,
    detect_priority,
    rule_based_extract,
)


def test_deadline_create_body_optional_description_default():
    payload = {
        "user_id": "usr_test_123",
        "title": "File Written Statement",
        "deadline_date": datetime(2026, 10, 15, 12, 0, tzinfo=timezone.utc),
    }
    deadline = DeadlineCreateBody(**payload)
    assert deadline.description == ""


def test_deadline_create_body_explicit_description():
    payload = {
        "user_id": "usr_test_123",
        "title": "File Appeal",
        "description": "Appeal against order dated 1st Sept",
        "deadline_date": datetime(2026, 10, 15, 12, 0, tzinfo=timezone.utc),
    }
    deadline = DeadlineCreateBody(**payload)
    assert deadline.description == "Appeal against order dated 1st Sept"


def test_deadline_create_body_missing_required_user_id_raises_validation_error():
    payload = {
        "title": "File Appeal",
        "deadline_date": datetime(2026, 10, 15, 12, 0, tzinfo=timezone.utc),
    }
    with pytest.raises(ValidationError):
        DeadlineCreateBody(**payload)


def test_deadline_create_body_missing_required_title_raises_validation_error():
    payload = {
        "user_id": "usr_test_123",
        "deadline_date": datetime(2026, 10, 15, 12, 0, tzinfo=timezone.utc),
    }
    with pytest.raises(ValidationError):
        DeadlineCreateBody(**payload)


def test_detect_category_rental_keywords():
    text = "Tenant has not paid rent for the commercial lease deposit."
    assert detect_category(text) == "rental"


def test_detect_category_employment_keywords():
    text = "Employer terminated without salary or notice period payout."
    assert detect_category(text) == "employment"


def test_detect_category_consumer_keywords():
    text = "Consumer filed complaint seeking refund for defective electronics."
    assert detect_category(text) == "consumer"


def test_detect_category_unmatched_fallback():
    text = "General inquiry about constitutional rights."
    assert detect_category(text) == "general"


def test_detect_priority_urgent_keywords():
    text = "Need urgent action immediately before court hearing."
    assert detect_priority(text) == "high"


def test_detect_priority_default_medium():
    text = "Please submit the response at your convenience."
    assert detect_priority(text) == "medium"


def test_rule_based_extract_within_days_pattern_default_priority():
    text = "You must respond to the eviction notice within 15 days of service."
    extracted = rule_based_extract(text)
    assert len(extracted) == 1
    assert extracted[0]["category"] == "rental"
    assert extracted[0]["days_from_now"] == 15
    assert extracted[0]["priority"] == "medium"


def test_rule_based_extract_within_days_pattern_urgent_priority():
    text = "Urgent: Court summons requires appearance within 10 days."
    extracted = rule_based_extract(text)
    assert len(extracted) == 1
    assert extracted[0]["days_from_now"] == 10
    assert extracted[0]["priority"] == "high"


def test_empty_health_score_includes_nested_stats():
    from app.modules.deadline_engine.service import _empty_health_score
    result = _empty_health_score("usr_999")
    assert "stats" in result
    assert result["stats"] == {"active": 0, "completed": 0, "expired": 0}
    assert result["score"] == 100
    assert result["grade"] == "Excellent"


@pytest.mark.anyio
async def test_compute_health_score_with_docs_includes_nested_stats():
    from unittest.mock import AsyncMock, MagicMock, patch
    from app.modules.deadline_engine import service

    mock_db = {}
    mock_col = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[
        {"status": "active", "priority": "medium", "deadline_date": None},
        {"status": "completed", "priority": "medium"},
    ])
    mock_col.find = MagicMock(return_value=mock_cursor)
    mock_db[service.COLLECTION] = mock_col

    with patch("app.modules.deadline_engine.service.get_database", return_value=mock_db):
        score_data = await service.compute_health_score("usr_123")
        assert "stats" in score_data
        assert score_data["stats"]["active"] == 1
        assert score_data["stats"]["completed"] == 1
        assert score_data["stats"]["expired"] == 0

