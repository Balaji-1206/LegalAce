"""
Tool Execution Engine for LegalAce Agent.

Executes planned tools sequentially and respects user confirmation requirements
for mutating operations (e.g. deadline creation, document notice generation).
"""
from __future__ import annotations

import time
import uuid
from typing import AsyncGenerator, List, Dict, Any, Tuple, Optional

from app.core.logging import get_logger
from app.modules.agent.schemas import AgentPlan, PlannedStep, ToolExecutionResult, PendingAction
from app.modules.agent.tools import TOOL_REGISTRY

logger = get_logger(__name__)


import asyncio

async def _execute_single_step(
    step: PlannedStep,
    user_id: str,
    conversation_history: List[Dict[str, Any]],
) -> Tuple[ToolExecutionResult, Optional[PendingAction]]:
    """Execute a single step and return (ToolExecutionResult, Optional[PendingAction])."""
    start_t = time.perf_counter()
    tool_def = TOOL_REGISTRY.get(step.tool)

    if not tool_def:
        logger.error(f"Tool '{step.tool}' not found in registry.")
        return ToolExecutionResult(
            step_id=step.step_id,
            tool=step.tool,
            reason=step.reason,
            status="error",
            summary=f"Unknown tool '{step.tool}'",
        ), None

    # Check user confirmation requirement
    if step.requires_confirmation or tool_def.is_mutating:
        action_id = str(uuid.uuid4())
        if step.tool == "deadline_create":
            title = step.args.get("title", "Legal Reminder")
            days = step.args.get("days_from_now", 15)
            prompt_text = f"Would you like LegalAce to create a deadline reminder: '{title}' due in {days} days?"
        elif step.tool == "generate_notice":
            template = step.args.get("template_id", "legal_notice")
            prompt_text = f"Would you like LegalAce to generate a formal statutory Legal Notice document based on '{template}'?"
        else:
            prompt_text = f"Would you like LegalAce to proceed with action '{step.tool}'?"

        pending = PendingAction(
            action_id=action_id,
            action_type=step.tool,
            title=step.args.get("title", step.tool.replace("_", " ").title()),
            details={**step.args, "user_id": user_id},
            prompt_text=prompt_text,
        )

        res = ToolExecutionResult(
            step_id=step.step_id,
            tool=step.tool,
            reason=step.reason,
            status="pending_confirmation",
            summary=f"Requires user confirmation: {prompt_text}",
            data={"pending_action_id": action_id, "pending_action": pending.model_dump()},
            execution_time_ms=0.0,
        )
        logger.info(f"Step {step.step_id} ('{step.tool}') held for user confirmation.")
        return res, pending

    # Execute tool
    try:
        logger.info(f"Executing step {step.step_id}: {step.tool} ({step.reason})")
        exec_args = {**step.args, "user_id": user_id}
        if step.tool == "legal_search" and "history" not in exec_args:
            exec_args["history"] = conversation_history

        output = await tool_def.handler(exec_args)
        elapsed = (time.perf_counter() - start_t) * 1000

        # ReAct Retry Hook: If legal_search returns 0 chunks, attempt a retry with intent keywords
        if step.tool == "legal_search" and output.get("chunk_count", 0) == 0:
            query = exec_args.get("query", "")
            if len(query.split()) > 10:
                # Try simplified query
                simplified = " ".join([w for w in query.split() if len(w) > 3][:6])
                logger.info(f"ReAct Retry: Query produced 0 law chunks. Retrying with simplified: '{simplified}'")
                exec_args["query"] = simplified
                output = await tool_def.handler(exec_args)

        summary = ""
        if step.tool == "legal_search":
            summary = f"Retrieved {output.get('chunk_count', 0)} law sections (Intent: {output.get('intent')})"
        elif step.tool == "situation_lookup":
            summary = f"Found {len(output.get('situations', []))} matching situation guides"
        elif step.tool == "action_plan":
            summary = f"Generated {len(output.get('action_plan', {}).get('steps', []))} step action plan"
        elif step.tool == "document_analyze":
            summary = f"Analyzed contract: fairness score {output.get('analysis', {}).get('fairness_score', 0)}/100"
        elif step.tool == "deadline_extract":
            summary = f"Extracted {output.get('count', 0)} deadline items from text"
        else:
            summary = f"Successfully executed {step.tool}"

        return ToolExecutionResult(
            step_id=step.step_id,
            tool=step.tool,
            reason=step.reason,
            status="success",
            summary=summary,
            data=output,
            execution_time_ms=elapsed,
        ), None
    except Exception as e:
        elapsed = (time.perf_counter() - start_t) * 1000
        logger.error(f"Error executing step {step.step_id} ({step.tool}): {e}", exc_info=True)
        return ToolExecutionResult(
            step_id=step.step_id,
            tool=step.tool,
            reason=step.reason,
            status="error",
            summary=f"Failed execution: {str(e)}",
            execution_time_ms=elapsed,
        ), None


async def execute_plan(
    plan: AgentPlan,
    user_id: str,
    conversation_history: List[Dict[str, Any]],
) -> Tuple[List[ToolExecutionResult], List[PendingAction]]:
    """
    Parallel & sequential batch execution of an AgentPlan.
    Runs non-mutating steps concurrently using asyncio.gather().
    """
    results: List[ToolExecutionResult] = []
    pending_actions: List[PendingAction] = []

    # Separate steps into non-mutating (parallelizable) vs mutating
    non_mutating_steps = [s for s in plan.steps if not s.requires_confirmation and not TOOL_REGISTRY.get(s.tool, TOOL_REGISTRY["legal_search"]).is_mutating]
    mutating_steps = [s for s in plan.steps if s not in non_mutating_steps]

    if non_mutating_steps:
        # Run non-mutating steps concurrently!
        tasks = [
            _execute_single_step(step, user_id, conversation_history)
            for step in non_mutating_steps
        ]
        step_outputs = await asyncio.gather(*tasks)
        for res, pending in step_outputs:
            results.append(res)
            if pending:
                pending_actions.append(pending)

    # Run mutating steps sequentially
    for step in mutating_steps:
        res, pending = await _execute_single_step(step, user_id, conversation_history)
        results.append(res)
        if pending:
            pending_actions.append(pending)

    # Sort results by step_id to maintain order
    results.sort(key=lambda r: r.step_id)
    return results, pending_actions



async def execute_plan_stream(
    plan: AgentPlan,
    user_id: str,
    conversation_history: List[Dict[str, Any]],
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Generator yielding step-by-step SSE events during agent execution.
    """
    # 1. Send plan event
    yield {
        "event": "plan",
        "data": {
            "objective": plan.objective,
            "agent_mode": plan.agent_mode,
            "steps": [
                {
                    "step_id": s.step_id,
                    "tool": s.tool,
                    "reason": s.reason,
                    "requires_confirmation": s.requires_confirmation,
                }
                for s in plan.steps
            ],
        },
    }

    results: List[ToolExecutionResult] = []
    pending_actions: List[PendingAction] = []

    # 2. Iterate and execute steps
    for step in plan.steps:
        # Notify step start
        yield {
            "event": "step_start",
            "data": {
                "step_id": step.step_id,
                "tool": step.tool,
                "reason": step.reason,
            },
        }

        start_t = time.perf_counter()
        tool_def = TOOL_REGISTRY.get(step.tool)

        if not tool_def:
            res = ToolExecutionResult(
                step_id=step.step_id,
                tool=step.tool,
                reason=step.reason,
                status="error",
                summary=f"Unknown tool '{step.tool}'",
            )
            results.append(res)
            yield {"event": "step_complete", "data": res.model_dump()}
            continue

        if step.requires_confirmation or tool_def.is_mutating:
            action_id = str(uuid.uuid4())
            prompt_text = ""
            if step.tool == "deadline_create":
                title = step.args.get("title", "Legal Reminder")
                days = step.args.get("days_from_now", 15)
                prompt_text = f"Would you like LegalAce to create a deadline reminder: '{title}' due in {days} days?"
            elif step.tool == "generate_notice":
                template = step.args.get("template_id", "legal_notice")
                prompt_text = f"Would you like LegalAce to generate a formal statutory Legal Notice document based on '{template}'?"
            else:
                prompt_text = f"Would you like LegalAce to proceed with action '{step.tool}'?"

            pending = PendingAction(
                action_id=action_id,
                action_type=step.tool,
                title=step.args.get("title", step.tool.replace("_", " ").title()),
                details={**step.args, "user_id": user_id},
                prompt_text=prompt_text,
            )
            pending_actions.append(pending)

            res = ToolExecutionResult(
                step_id=step.step_id,
                tool=step.tool,
                reason=step.reason,
                status="pending_confirmation",
                summary=f"Action prepared — requires your approval: '{pending.title}'",
                data={"pending_action": pending.model_dump()},
                execution_time_ms=0.0,
            )
            results.append(res)
            yield {"event": "step_complete", "data": res.model_dump()}
            continue

        try:
            exec_args = {**step.args, "user_id": user_id}
            if step.tool == "legal_search" and "history" not in exec_args:
                exec_args["history"] = conversation_history

            output = await tool_def.handler(exec_args)
            elapsed = (time.perf_counter() - start_t) * 1000

            summary = ""
            if step.tool == "legal_search":
                summary = f"Retrieved {output.get('chunk_count', 0)} statutory law sections (Intent: {output.get('intent')})"
            elif step.tool == "situation_lookup":
                summary = f"Found {len(output.get('situations', []))} verified situation guides"
            elif step.tool == "action_plan":
                summary = f"Generated {len(output.get('action_plan', {}).get('steps', []))} action steps"
            elif step.tool == "document_analyze":
                summary = f"Contract analysis complete: fairness score {output.get('analysis', {}).get('fairness_score', 0)}/100"
            elif step.tool == "deadline_extract":
                summary = f"Extracted {output.get('count', 0)} limitation periods"
            else:
                summary = f"Executed {step.tool}"

            res = ToolExecutionResult(
                step_id=step.step_id,
                tool=step.tool,
                reason=step.reason,
                status="success",
                summary=summary,
                data=output,
                execution_time_ms=elapsed,
            )
            results.append(res)
            yield {"event": "step_complete", "data": res.model_dump()}
        except Exception as e:
            elapsed = (time.perf_counter() - start_t) * 1000
            res = ToolExecutionResult(
                step_id=step.step_id,
                tool=step.tool,
                reason=step.reason,
                status="error",
                summary=f"Failed execution: {str(e)}",
                execution_time_ms=elapsed,
            )
            results.append(res)
            yield {"event": "step_complete", "data": res.model_dump()}
