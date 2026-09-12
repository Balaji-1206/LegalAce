import pytest
from unittest.mock import AsyncMock, MagicMock
from app.modules.wizard.outcome_service import OutcomeService, PlanOutcomeBody

@pytest.mark.anyio
async def test_record_outcome_success():
    mock_db = MagicMock()
    mock_col = MagicMock()
    mock_db.__getitem__.return_value = mock_col
    service = OutcomeService(mock_db)

    mock_col.update_one = AsyncMock(return_value=MagicMock(upserted_id="123", modified_count=1))

    body = PlanOutcomeBody(
        user_id="user_test_101",
        scenario_id="housing_deposit",
        plan_title="Tenancy Security Deposit Recovery",
        status="resolved",
        recovered_amount=40000,
        days_taken=15,
        rating=5,
        feedback="The statutory 15-day notice worked perfectly without court proceedings.",
    )
    res = await service.record_outcome(body)
    assert res["status"] == "recorded"
    assert res["scenario_id"] == "housing_deposit"
    mock_col.update_one.assert_called_once()

@pytest.mark.anyio
async def test_get_scenario_stats():
    mock_db = MagicMock()
    mock_col = MagicMock()
    mock_db.__getitem__.return_value = mock_col
    service = OutcomeService(mock_db)

    # Mock aggregation cursor
    mock_cursor = AsyncMock()
    mock_cursor.to_list = AsyncMock(return_value=[
        {
            "_id": "housing_deposit",
            "total": 50,
            "resolved": 42,
            "avg_days": 16.5,
            "total_recovered": 1250000,
            "avg_rating": 4.6,
        },
        {
            "_id": "cheque_bounce",
            "total": 30,
            "resolved": 24,
            "avg_days": 21.0,
            "total_recovered": 850000,
            "avg_rating": 4.4,
        }
    ])
    mock_col.aggregate = MagicMock(return_value=mock_cursor)

    stats = await service.get_scenario_stats()
    assert "housing_deposit" in stats
    assert stats["housing_deposit"]["resolution_rate"] == 84  # 42/50 * 100
    assert stats["housing_deposit"]["total_cases"] == 50
    assert stats["cheque_bounce"]["resolution_rate"] == 80   # 24/30 * 100
