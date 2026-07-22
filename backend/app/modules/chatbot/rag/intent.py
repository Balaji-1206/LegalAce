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
        "notice period", "employer", "employee", "job", "salary", "wage", "wages",
        "resign", "resignation", "workplace", "promotion", "demotion", "hr", "pf", "gratuity",
        "minimum wage", "overtime", "unpaid", "harassment at work", "posh", "labour", "labor",
        "experience letter", "relieving letter", "bond", "payslip", "pf withdrawal",
    ],
    "tenancy": [
        "landlord", "tenant", "rent", "deposit", "security deposit", "lease",
        "eviction", "evict", "flat", "house rent", "room", "accommodation",
        "rental", "notice to vacate", "paying guest", "pg", "house owner",
        "rent agreement", "rent control", "maintenance charges",
    ],
    "consumer": [
        "product", "defective", "refund", "seller", "amazon", "flipkart",
        "online shopping", "warranty", "guarantee", "shop", "merchant",
        "service provider", "consumer", "purchased", "bought", "billing",
        "overcharged", "fraud seller", "e-commerce", "mrp", "defective item",
        "consumer court", "consumer forum", "replacement",
    ],
    "criminal": [
        "police", "fir", "arrest", "search", "seizure", "phone", "privacy",
        "bail", "crime", "criminal", "theft", "robbery", "assault", "complaint",
        "extortion", "blackmail", "threat", "intimidation", "warrant", "interrogation",
        "police station", "ipc", "bns", "crpc", "bnss", "handcuff", "custody",
    ],
    "family": [
        "divorce", "marriage", "husband", "wife", "domestic", "violence",
        "dowry", "custody", "alimony", "maintenance", "separation",
        "child", "inheritance", "will", "succession", "abuse", "cruelty",
        "domestic violence act", "section 498a", "matrimonial",
    ],
    "property": [
        "property", "land", "flat", "apartment", "ownership", "title",
        "registry", "stamp duty", "builder", "real estate", "plot",
        "encroachment", "possession", "dispute", "mortgage", "rera",
        "delay possession", "illegal construction",
    ],
    "banking": [
        "bank", "loan", "emi", "credit card", "recovery agent", "cheque bounce",
        "section 138", "interest rate", "cibil", "fraud transaction",
        "unauthorized withdrawal", "loan app", "npa", "rbi", "bank manager",
    ],
    "cyber_crime": [
        "cyber", "online fraud", "phishing", "otp", "scam", "hacked", "account hack",
        "morphed", "cyber crime", "it act", "section 66", "online harassment",
        "financial fraud", "fake call", "cyber cell",
    ],
    "traffic": [
        "traffic", "challan", "fine", "traffic police", "motor vehicle", "mv act",
        "accident", "hit and run", "insurance claim", "drunk driving", "license",
        "rc", "towing", "helmet fine", "speeding",
    ],
    "general_legal": [
        "law", "legal", "right", "rights", "court", "lawyer", "advocate",
        "section", "act", "notice", "legal notice", "agreement", "contract",
        "compensation", "damages", "sue", "file case", "jurisdiction",
        "high court", "supreme court", "constitution", "fundamental rights",
        "legal aid", "nalsa", "justice", "statute", "clause", "petition",
    ]
}

def classify_intent(query: str) -> str:
    """
    Classify the legal intent of a user query.
    """
    query_lower = query.lower().strip()
    
    # 1. Check for basic greetings
    greetings = {"hi", "hello", "hey", "good morning", "good afternoon", "good evening", "howdy", "hola", "yo"}
    cleaned_query = re.sub(r'[^\w\s]', '', query_lower)
    if cleaned_query in greetings or (len(cleaned_query) <= 3 and cleaned_query not in {"fir", "law", "pay", "rbi", "pg", "pfa"}):
        return "greeting"

    # 2. Blacklist of completely non-legal terms (only if query contains NO legal terms)
    blacklist = [
        "cake recipe", "how to bake", "python code", "javascript tutorial",
        "cricket match score", "football score", "ipl match", "weather today"
    ]
    if any(phrase in query_lower for phrase in blacklist):
        return "out_of_scope"

    # 3. Category Matcher
    scores: dict[str, int] = {}
    for intent, keywords in INTENT_KEYWORDS.items():
        count = sum(1 for kw in keywords if re.search(rf"\b{re.escape(kw)}\b", query_lower))
        if count > 0:
            scores[intent] = count

    if scores:
        best_intent = max(scores, key=lambda k: scores[k])
        logger.info(f"Intent classified as '{best_intent}' for query: '{query[:80]}'")
        return best_intent

    return "general_legal"
