"""
AI Deadline Extractor — Module 3

Uses OpenAI to extract structured legal deadlines from raw text.
Falls back to rule-based regex extraction if OpenAI is unavailable.
"""
from __future__ import annotations
import json
import re
from datetime import datetime, timezone, timedelta
from typing import List
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Rule-based patterns (fallback)
# ---------------------------------------------------------------------------

# Detects "within X days", "in X days", "X day notice period"
DAYS_PATTERNS = [
    r"within\s+(\d+)\s+days?",
    r"in\s+(\d+)\s+days?",
    r"(\d+)[- ]day\s+notice",
    r"(\d+)[- ]day\s+period",
    r"(\d+)\s+days?\s+(?:before|after|from)",
    r"limitation\s+period.*?(\d+)\s+year",
    r"(\d+)\s+year.*?limitation",
]

# Detects explicit date strings
DATE_PATTERNS = [
    r"\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})\b",
    r"\b(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})\b",
]

# Keyword → category mapping
CATEGORY_KEYWORDS = {
    "rent": "rental",
    "lease": "rental",
    "tenant": "rental",
    "landlord": "rental",
    "deposit": "rental",
    "eviction": "rental",
    "salary": "employment",
    "employ": "employment",
    "termination": "employment",
    "retrench": "employment",
    "notice period": "employment",
    "loan": "banking",
    "emi": "banking",
    "bank": "banking",
    "insurance": "insurance",
    "policy": "insurance",
    "premium": "insurance",
    "consumer": "consumer",
    "complaint": "consumer",
    "refund": "consumer",
    "defective": "consumer",
}

PRIORITY_KEYWORDS = {
    "high": ["urgent", "immediately", "asap", "critical", "overdue", "expired", "sue", "court"],
    "medium": ["soon", "approaching", "reminder", "notice", "deadline", "expire"],
    "low": ["renew", "upcoming", "future", "consider"],
}


def detect_category(text: str) -> str:
    text_lower = text.lower()
    for keyword, category in CATEGORY_KEYWORDS.items():
        if keyword in text_lower:
            return category
    return "general"


def detect_priority(text: str) -> str:
    text_lower = text.lower()
    for priority, keywords in PRIORITY_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            return priority
    return "medium"


def rule_based_extract(text: str) -> List[dict]:
    """Extract deadlines using regex patterns when AI is unavailable."""
    deadlines = []
    text_lower = text.lower()
    category = detect_category(text)
    priority = detect_priority(text)

    # Look for days-based deadlines
    for pattern in DAYS_PATTERNS:
        matches = re.findall(pattern, text_lower)
        for match in matches:
            days = int(match) if isinstance(match, str) else int(match[0])
            # Convert year matches
            if "year" in pattern:
                days = days * 365
            deadline_date = datetime.now(timezone.utc) + timedelta(days=days)
            valid_warnings = [w for w in [30, 15, 7, 1] if w < days] or [1]
            deadlines.append({
                "title": f"Legal Action Required — {category.title()}",
                "description": f"You have {days} days to take legal action based on: \"{text[:120]}...\"",
                "category": category,
                "deadline_date": deadline_date.isoformat(),
                "days_from_now": days,
                "priority": priority if days <= 30 else "medium",
                "warning_days": valid_warnings,
            })
            break  # One deadline per text block

    # Look for explicit date deadlines
    if not deadlines:
        for pattern in DATE_PATTERNS:
            matches = re.findall(pattern, text)
            for match in matches:
                try:
                    if len(match[0]) == 4:
                        year, month, day = int(match[0]), int(match[1]), int(match[2])
                    else:
                        day, month, year = int(match[0]), int(match[1]), int(match[2])
                        if year < 100:
                            year += 2000
                    deadline_date = datetime(year, month, day, tzinfo=timezone.utc)
                    days_remaining = (deadline_date - datetime.now(timezone.utc)).days
                    if days_remaining > 0:
                        deadlines.append({
                            "title": f"Deadline on {deadline_date.strftime('%d %B %Y')}",
                            "description": f"Important date extracted from: \"{text[:120]}...\"",
                            "category": category,
                            "deadline_date": deadline_date.isoformat(),
                            "days_from_now": days_remaining,
                            "priority": "high" if days_remaining <= 15 else priority,
                            "warning_days": [30, 15, 7, 1],
                        })
                except (ValueError, OverflowError):
                    continue
                break

    return deadlines


# ---------------------------------------------------------------------------
# AI-powered extraction (OpenAI)
# ---------------------------------------------------------------------------

AI_EXTRACTION_PROMPT = """You are a legal deadline extraction AI for Indian law.

Given the following text from a user's legal conversation or document, extract ALL important legal deadlines, dates, and time-sensitive obligations.

Text:
---
{text}
---

Return ONLY a valid JSON array of deadline objects. Each object must have:
- "title": short title (max 8 words)
- "description": what action is needed and why
- "category": one of [rental, employment, consumer, banking, insurance, general]
- "deadline_date": ISO 8601 datetime string (use null if only days_from_now is known)
- "days_from_now": integer days from today (use null if deadline_date is given)
- "priority": one of [low, medium, high]
- "warning_days": array of integers e.g. [30, 15, 7, 1]

Rules:
- If text mentions "within 30 days" and today is {today}, compute deadline_date accordingly
- For limitation periods (2 years for consumer), compute from earliest reasonable start date
- Return [] if no legal deadlines can be extracted
- Return ONLY the JSON array, no other text

Today: {today}
"""


async def ai_extract_deadlines(text: str) -> List[dict]:
    """Use OpenAI to extract structured deadlines from text."""
    from openai import AsyncOpenAI
    
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    prompt = AI_EXTRACTION_PROMPT.format(text=text[:2000], today=today)
    
    try:
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content or '{"deadlines":[]}'
        parsed = json.loads(raw)
        
        # Handle both {"deadlines": [...]} and bare array
        if isinstance(parsed, list):
            return parsed
        return parsed.get("deadlines", [])
    
    except Exception as e:
        logger.warning(f"AI extraction failed, using rule-based fallback: {e}")
        return rule_based_extract(text)


async def extract_deadlines_from_text(text: str) -> List[dict]:
    """Main entry point — tries AI first, then rule-based fallback."""
    if not text or len(text.strip()) < 10:
        return []
    
    try:
        deadlines = await ai_extract_deadlines(text)
        if deadlines:
            logger.info(f"AI extracted {len(deadlines)} deadline(s) from text")
            return deadlines
    except Exception:
        pass
    
    # Fallback
    fallback = rule_based_extract(text)
    logger.info(f"Rule-based extractor found {len(fallback)} deadline(s)")
    return fallback
