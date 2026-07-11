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
    query_lower = query.lower().strip()
    
    # 1. Check for basic greetings
    greetings = {"hi", "hello", "hey", "good morning", "good afternoon", "good evening", "howdy", "hola", "yo"}
    cleaned_query = re.sub(r'[^\w\s]', '', query_lower)
    if cleaned_query in greetings or len(cleaned_query) <= 3:
        return "greeting"

    # 2. Blacklist of completely non-legal terms
    blacklist = [
        "cake", "bake", "recipe", "cook", "food", "ingredients", 
        "programming", "coding", "javascript", "python", "html", "css", "java", "c++",
        "weather", "temperature", "vacation", "cricket", "football", "ipl", "score"
    ]
    if any(re.search(rf"\b{re.escape(word)}\b", query_lower) for word in blacklist):
        return "out_of_scope"

    # 3. Category Matcher
    scores: dict[str, int] = {}
    for intent, keywords in INTENT_KEYWORDS.items():
        count = sum(1 for kw in keywords if re.search(rf"\b{re.escape(kw)}\b", query_lower))
        if count > 0:
            scores[intent] = count

    if scores:
        best_intent = max(scores, key=lambda k: scores[k])
        logger.debug(f"Intent classified as '{best_intent}' for query: '{query[:80]}'")
        return best_intent

    # 4. Fallback to general (will be filtered by FAISS score threshold in pipeline)
    return "general"
