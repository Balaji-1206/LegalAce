import pytest
from unittest.mock import AsyncMock, patch
from app.modules.chatbot import conversation_service


@pytest.mark.anyio
async def test_get_conversation_scoped_to_user():
    mock_db = {}
    mock_col = AsyncMock()
    mock_col.find_one = AsyncMock(return_value=None)
    mock_db["conversations"] = mock_col

    with patch("app.modules.chatbot.conversation_service.get_database", return_value=mock_db):
        res = await conversation_service.get_conversation("conv_123", user_id="user_owner")
        assert res is None
        mock_col.find_one.assert_called_once_with(
            {"conversation_id": "conv_123", "user_id": "user_owner"},
            {"_id": 0},
        )


@pytest.mark.anyio
async def test_delete_conversation_scoped_to_user():
    mock_db = {}
    mock_col = AsyncMock()
    mock_res = AsyncMock()
    mock_res.deleted_count = 1
    mock_col.delete_one = AsyncMock(return_value=mock_res)
    mock_db["conversations"] = mock_col

    with patch("app.modules.chatbot.conversation_service.get_database", return_value=mock_db):
        deleted = await conversation_service.delete_conversation("conv_123", user_id="user_owner")
        assert deleted is True
        mock_col.delete_one.assert_called_once_with(
            {"conversation_id": "conv_123", "user_id": "user_owner"}
        )


def test_safe_float_parsing():
    from app.modules.chatbot.service import _safe_float
    assert _safe_float(0.85) == 0.85
    assert _safe_float("0.75") == 0.75
    assert _safe_float("90%") == 90.0
    assert _safe_float("invalid_string", default=0.0) == 0.0
    assert _safe_float(None, default=0.5) == 0.5

