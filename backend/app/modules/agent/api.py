"""
FastAPI Endpoints for LegalAce Agent Orchestration Engine.

Supports both real-time Server-Sent Events (SSE) streaming and REST endpoints,
as well as user action confirmation calls.
"""
from __future__ import annotations

import json
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.core.logging import get_logger
from app.modules.agent.schemas import (
    AgentRequest,
    AgentResponse,
    ConfirmActionRequest,
)
from app.modules.agent.planner import generate_agent_plan
from app.modules.agent import executor, synthesizer, tools
from app.modules.chatbot import conversation_service
from app.modules.deadline_engine import service as deadline_service
from app.modules.wizard import service as wizard_service

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1/agent", tags=["Agent"])


@router.post(
    "/execute-sync",
    response_model=AgentResponse,
    summary="Execute AI Legal Agent synchronously",
    description="Full orchestrator run: planning -> tool execution -> response synthesis.",
)
async def execute_agent_sync(request: AgentRequest) -> AgentResponse:
    try:
        # Step 1: Resolve conversation ID
        if request.conversation_id and await conversation_service.conversation_exists(request.conversation_id):
            conversation_id = request.conversation_id
        else:
            conversation_id = await conversation_service.create_conversation(request.user_id)

        # Step 2: Load FULL conversation history (per user feedback: "should know full chat as context")
        history = await conversation_service.get_conversation_messages(conversation_id)

        # Step 3: Build query text including document attachment if present
        effective_query = request.message
        if request.document_name and request.document_content:
            effective_query = (
                f"[Attached File: {request.document_name}]\n"
                f"File Context: {request.document_content[:1500]}\n\n"
                f"User Query: {request.message}"
            )

        # Step 4: Generate LLM plan
        plan = await generate_agent_plan(
            user_message=effective_query,
            history_messages=history,
            agent_mode=request.agent_mode or "general",
            has_document=bool(request.document_content),
        )

        # Step 5: Execute plan (respecting user confirmation requirements for mutating tools)
        results, pending_actions = await executor.execute_plan(
            plan=plan,
            user_id=request.user_id,
            conversation_history=history,
        )

        # Step 6: Synthesize final agent response
        agent_response = synthesizer.synthesize_agent_response(
            conversation_id=conversation_id,
            plan=plan,
            step_results=results,
            pending_actions=pending_actions,
        )

        # Step 7: Persist messages to MongoDB
        citation_dicts = [c.model_dump() for c in agent_response.law_citations]
        await conversation_service.append_messages(
            conversation_id=conversation_id,
            user_message=request.message,
            assistant_message=agent_response.final_answer,
            intent=plan.agent_mode,
            citations=citation_dicts,
            rights=agent_response.rights,
            action_steps=agent_response.action_steps,
        )

        # Step 8: Store episodic agent memory
        try:
            from app.modules.agent import memory
            await memory.store_agent_episode(
                user_id=request.user_id,
                conversation_id=conversation_id,
                objective=plan.objective,
                agent_mode=plan.agent_mode,
                plan_steps=[s.model_dump() for s in plan.steps],
                executed_tools=[r.tool for r in results],
                outcome_summary=agent_response.final_answer[:200],
            )
        except Exception as mem_err:
            logger.warning(f"Failed to store agent episode: {mem_err}")

        return agent_response
    except Exception as e:
        logger.error(f"Error in execute_agent_sync: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to execute agent orchestration layer.")



@router.post(
    "/execute",
    summary="Stream AI Legal Agent execution via Server-Sent Events (SSE)",
    description="Streams real-time agent planning and tool execution steps.",
)
async def execute_agent_stream(request: AgentRequest, raw_req: Request):
    """
    Streams SSE events:
    - plan
    - step_start
    - step_complete
    - final
    """
    try:
        # Step 1: Resolve conversation ID
        if request.conversation_id and await conversation_service.conversation_exists(request.conversation_id):
            conversation_id = request.conversation_id
        else:
            conversation_id = await conversation_service.create_conversation(request.user_id)

        # Step 2: Load FULL conversation history
        history = await conversation_service.get_conversation_messages(conversation_id)

        effective_query = request.message
        if request.document_name and request.document_content:
            effective_query = (
                f"[Attached File: {request.document_name}]\n"
                f"File Context: {request.document_content[:1500]}\n\n"
                f"User Query: {request.message}"
            )

        async def event_generator() -> AsyncGenerator[str, None]:
            # Generate LLM plan
            plan = await generate_agent_plan(
                user_message=effective_query,
                history_messages=history,
                agent_mode=request.agent_mode or "general",
                has_document=bool(request.document_content),
            )

            step_results = []
            pending_actions = []

            # Stream steps
            async for step_event in executor.execute_plan_stream(
                plan=plan,
                user_id=request.user_id,
                conversation_history=history,
            ):
                if await raw_req.is_disconnected():
                    logger.info("Client disconnected from SSE stream.")
                    break

                evt_name = step_event["event"]
                data_json = json.dumps(step_event["data"])

                if evt_name == "step_complete":
                    # Collect result
                    data_obj = step_event["data"]
                    if data_obj.get("status") == "pending_confirmation" and "pending_action" in data_obj.get("data", {}):
                        pending_actions.append(executor.PendingAction(**data_obj["data"]["pending_action"]))

                    step_results.append(executor.ToolExecutionResult(**data_obj))

                yield f"event: {evt_name}\ndata: {data_json}\n\n"

            # Synthesize final response
            agent_response = synthesizer.synthesize_agent_response(
                conversation_id=conversation_id,
                plan=plan,
                step_results=step_results,
                pending_actions=pending_actions,
            )

            # Save messages
            citation_dicts = [c.model_dump() for c in agent_response.law_citations]
            await conversation_service.append_messages(
                conversation_id=conversation_id,
                user_message=request.message,
                assistant_message=agent_response.final_answer,
                intent=plan.agent_mode,
                citations=citation_dicts,
                rights=agent_response.rights,
                action_steps=agent_response.action_steps,
            )

            final_json = json.dumps(agent_response.model_dump())
            yield f"event: final\ndata: {final_json}\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    except Exception as e:
        logger.error(f"Error in execute_agent_stream: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to stream agent execution.")


@router.post(
    "/confirm-action",
    summary="Confirm or reject a pending agent action",
    description="Called when user clicks 'Approve' or 'Cancel' on a pending action prompt.",
)
async def confirm_action(body: ConfirmActionRequest):
    """
    Executes a pending action upon user confirmation (USER CHOICE: Ask for confirmation).
    """
    if not body.approved:
        logger.info(f"User rejected pending action '{body.action_type}' ({body.action_id})")
        return {"status": "rejected", "message": "Action cancelled by user."}

    logger.info(f"User approved pending action '{body.action_type}' ({body.action_id})")
    details = body.details

    try:
        if body.action_type == "deadline_create":
            from datetime import datetime, timezone, timedelta
            days = details.get("days_from_now", 15)
            dt = datetime.now(timezone.utc) + timedelta(days=days)
            created = await deadline_service.create_deadline(
                user_id=body.user_id,
                title=details.get("title", "Legal Reminder"),
                description=details.get("description", ""),
                category=details.get("category", "general"),
                deadline_date=dt,
                priority=details.get("priority", "medium"),
                related_conversation_id=body.conversation_id,
            )
            return {"status": "success", "result": created, "message": "Deadline successfully created in Legal Health Monitor."}

        elif body.action_type == "generate_notice":
            template_id = details.get("template_id", "housing_legal_notice")
            doc_args = details.get("details") if isinstance(details.get("details"), dict) else details
            doc = wizard_service.generate_legal_document(template_id, doc_args)
            return {"status": "success", "result": doc, "message": "Statutory legal notice document generated successfully."}


        else:
            return {"status": "success", "message": f"Action {body.action_type} confirmed."}
    except Exception as e:
        logger.error(f"Error confirming action {body.action_type}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to execute confirmed action: {e}")
