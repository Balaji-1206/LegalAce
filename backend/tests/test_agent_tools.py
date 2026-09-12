import pytest
from app.modules.agent.tools import TOOL_REGISTRY
from app.modules.agent.planner import create_rule_based_plan


@pytest.mark.anyio
async def test_legal_aid_lookup_tool_registered_and_executable():
    assert "legal_aid_lookup" in TOOL_REGISTRY
    tool = TOOL_REGISTRY["legal_aid_lookup"]
    assert tool.is_mutating is False

    result = await tool.handler({
        "annual_income": 150000,
        "state": "Karnataka",
        "category_flags": [],
    })

    assert "eligibility" in result
    assert result["eligibility"]["eligible"] is True
    assert "authorities" in result
    assert len(result["authorities"]) > 0


def test_planner_dispatches_legal_aid_tool_for_legal_aid_query():
    plan = create_rule_based_plan(
        user_message="I cannot afford a lawyer, can I get free legal aid from DLSA in Karnataka?",
        agent_mode="general",
    )
    tool_names = [s.tool for s in plan.steps]
    assert "legal_aid_lookup" in tool_names
