"""
Intent Classifier for legal queries.
"""
from __future__ import annotations

import re

from app.core.logging import get_logger

logger = get_logger(__name__)

INTENT_KEYWORDS: dict[str, list[str]] = {
    "employment": [
        "fired", "terminated", "dismissed", "layoff", "laid off", "retrench",
        "notice period", "employer", "employee", "job", "salary", "wage",
        "resign", "workplace", "promotion", "demotion", "hr", "pf", "gratuity",
        "minimum wage", "overtime", "unpaid", "harassment at work", "posh",
    ],
    "tenancy": [
        "landlord", "tenant", "rent", "deposit", "security deposit", "lease",
        "eviction", "evict", "flat", "house rent", "room", "accommodation",
        "rental", "notice to vacate", "paying guest", "pg", "house owner",
    ],
    "consumer": [
        "product", "defective", "refund", "seller", "amazon", "flipkart",
        "online shopping", "warranty", "guarantee", "shop", "merchant",
        "service provider", "consumer", "purchased", "bought", "billing",
        "overcharged", "fraud seller", "e-commerce",
    ],
    "criminal": [
        "police", "fir", "arrest", "search", "seizure", "phone", "privacy",
        "bail", "crime", "criminal", "theft", "robbery", "assault", "complaint",
        "extortion", "blackmail", "threat", "intimidation", "warrant",
    ],
    "family": [
        "divorce", "marriage", "husband", "wife", "domestic", "violence",
        "dowry", "custody", "alimony", "maintenance", "separation",
        "child", "inheritance", "will", "succession", "abuse", "cruelty",
    ],
    "property": [
        "property", "land", "flat", "apartment", "ownership", "title",
        "registry", "stamp duty", "builder", "real estate", "plot",
        "encroachment", "possession", "dispute", "mortgage",
    ],
}

def classify_intent(query: str) -> str:
    """
    Classify the legal intent of a user query.
    """
    query_lower = query.lower()
    scores: dict[str, int] = {}

    for intent, keywords in INTENT_KEYWORDS.items():
        count = sum(1 for kw in keywords if re.search(rf"\b{re.escape(kw)}\b", query_lower))
        if count > 0:
            scores[intent] = count

    if not scores:
        logger.debug(f"No keyword match for query — defaulting to 'general': '{query[:80]}'")
        return "general"

    best_intent = max(scores, key=lambda k: scores[k])
    logger.debug(f"Intent classified as '{best_intent}' for query: '{query[:80]}'")
    return best_intent
