"""
Unified LLM Gateway for LegalAce.
Consolidates scattered multi-tier LLM calls (Ollama, Gemini, OpenAI) into a single,
resilient, cost-optimized, and cached pipeline.

Tier Order:
  1. In-Memory MD5 Cache (Instant, $0 cost)
  2. Ollama Local GPU (qwen3:8b, $0 cost)
  3. Gemini 3.6 Flash (Cloud Fallback)
  4. OpenAI GPT-4o (Emergency Cloud)
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import re
from typing import Any, Optional

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# LRU Cache config
_MAX_CACHE_SIZE = 250
_LLM_RESPONSE_CACHE: dict[str, Any] = {}


def _clean_and_parse_json(raw_text: str) -> dict:
    """Strip markdown fences, reasoning tags, and parse valid JSON."""
    cleaned = raw_text.strip()
    # Strip <think>...</think> tags if model produces chain-of-thought reasoning
    cleaned = re.sub(r"<think>[\s\S]*?</think>", "", cleaned, flags=re.DOTALL).strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\n?```$", "", cleaned)
        cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        match_arr = re.search(r"\[[\s\S]*\]", cleaned)
        if match_arr:
            try:
                return {"items": json.loads(match_arr.group(0))}
            except json.JSONDecodeError:
                pass

        logger.warning(f"Could not parse LLM output as JSON: {raw_text[:200]}")
        return {}


async def call_unified_llm(
    prompt: str,
    system_instruction: Optional[str] = None,
    json_mode: bool = True,
    temperature: float = 0.1,
    timeout_seconds: float = 25.0,
) -> dict | str:
    """
    Unified entry point for all LLM calls in LegalAce.
    Prioritizes Local-First execution (Ollama qwen3:8b) for $0 cost,
    with automatic failover to Google Gemini 3.6 Flash and OpenAI.
    """
    from app.api.llm_settings import get_active_provider

    provider = get_active_provider()  # "auto" | "ollama" | "gemini" | "openai"

    # Step 1: Check In-Memory Exact Match Cache
    cache_key = hashlib.md5(f"{prompt}_{system_instruction}_{json_mode}".encode("utf-8")).hexdigest()
    if cache_key in _LLM_RESPONSE_CACHE:
        logger.info(f"LLM Gateway: Cache hit for key {cache_key[:8]} ($0 cost, 0ms)")
        return _LLM_RESPONSE_CACHE[cache_key]

    raw_output: Optional[str] = None

    # Step 2: Tier 1 — Ollama Local GPU (RTX 4060, $0 cost, 100% VRAM via num_ctx=4096)
    if settings.OLLAMA_BASE_URL and provider in ("auto", "ollama"):
        try:
            import httpx
            base_url = settings.OLLAMA_BASE_URL.rstrip("/")
            if base_url.endswith("/v1"):
                base_url = base_url[:-3]
            chat_url = f"{base_url}/api/chat"

            logger.info(f"LLM Gateway: Dispatching to Ollama ({settings.OLLAMA_MODEL}) on local GPU...")
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            messages.append({"role": "user", "content": prompt})

            payload: dict[str, Any] = {
                "model": settings.OLLAMA_MODEL,
                "messages": messages,
                "stream": False,
                "keep_alive": "60m",
                "options": {
                    "num_ctx": 4096,
                    "temperature": temperature,
                    "num_predict": 768,
                },
            }
            if json_mode:
                payload["format"] = "json"

            async with httpx.AsyncClient(timeout=timeout_seconds) as http_client:
                resp = await http_client.post(chat_url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    raw_output = data.get("message", {}).get("content", "")
                    if raw_output and raw_output.strip():
                        logger.info(f"LLM Gateway: Ollama ({settings.OLLAMA_MODEL}) responded successfully ($0 cost, 100% GPU).")
        except Exception as err:
            logger.info(f"LLM Gateway: Ollama local unavailable or timed out ({err}) — falling over...")
            raw_output = None

    # Step 3: Tier 2 — Gemini Cloud Fallback
    if not raw_output and settings.GEMINI_API_KEY and provider in ("auto", "gemini"):
        try:
            from google import genai
            from google.genai import types

            logger.info(f"LLM Gateway: Dispatching to Gemini Cloud ({settings.GEMINI_MODEL})...")
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            loop = asyncio.get_running_loop()

            full_contents = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt
            config = types.GenerateContentConfig(
                response_mime_type="application/json" if json_mode else "text/plain",
                temperature=temperature,
            )

            def _generate():
                return client.models.generate_content(
                    model=settings.GEMINI_MODEL or "gemini-3.6-flash",
                    contents=full_contents,
                    config=config,
                )

            res = await asyncio.wait_for(loop.run_in_executor(None, _generate), timeout=timeout_seconds)
            raw_output = res.text
            if raw_output and raw_output.strip():
                logger.info(f"LLM Gateway: Gemini Cloud responded successfully.")
        except Exception as err:
            logger.warning(f"LLM Gateway: Gemini call failed: {err}")
            raw_output = None

    # Step 4: Tier 3 — OpenAI Emergency Cloud Backup
    if not raw_output and settings.OPENAI_API_KEY and provider in ("auto", "openai"):
        try:
            from openai import AsyncOpenAI
            logger.info(f"LLM Gateway: Dispatching to OpenAI ({settings.OPENAI_MODEL})...")
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            messages.append({"role": "user", "content": prompt})

            extra_kwargs = {}
            if json_mode:
                extra_kwargs["response_format"] = {"type": "json_object"}

            resp = await asyncio.wait_for(
                client.chat.completions.create(
                    model=settings.OPENAI_MODEL or "gpt-4o",
                    messages=messages,
                    temperature=temperature,
                    **extra_kwargs,
                ),
                timeout=timeout_seconds,
            )
            raw_output = resp.choices[0].message.content
        except Exception as err:
            logger.warning(f"LLM Gateway: OpenAI call failed: {err}")
            raw_output = None

    # Step 5: Format output & store in cache
    if not raw_output:
        return {} if json_mode else ""

    result = _clean_and_parse_json(raw_output) if json_mode else raw_output.strip()

    # Cache successful output
    if len(_LLM_RESPONSE_CACHE) >= _MAX_CACHE_SIZE:
        _LLM_RESPONSE_CACHE.pop(next(iter(_LLM_RESPONSE_CACHE)))
    _LLM_RESPONSE_CACHE[cache_key] = result

    return result
