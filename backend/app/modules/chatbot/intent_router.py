"""
Deterministic Intent Router for Citizen Legal Queries.
Classifies legal category, relevant Indian statutes, and dispute urgency in < 1ms
without requiring expensive or slow LLM inference.
"""
from __future__ import annotations

import re
from typing import Optional

CATEGORY_KEYWORDS: dict[str, dict[str, list[str] | str]] = {
    "housing": {
        "statute": "Model Tenancy Act 2021 & Transfer of Property Act 1882",
        "keywords": ["landlord", "tenant", "rent", "deposit", "eviction", "lease", "broker", "vacate", "rental agreement", "painting charge", "maintenance"],
    },
    "cheque_debt": {
        "statute": "Section 138 Negotiable Instruments Act 1881",
        "keywords": ["cheque", "bounce", "dishonour", "insufficient funds", "stop payment", "drawee", "memo", "debt recovery", "loan default", "recovery agent"],
    },
    "consumer": {
        "statute": "Consumer Protection Act 2019 (CPA)",
        "keywords": ["defective", "warranty", "refund", "replacement", "amazon", "flipkart", "damaged product", "unfair trade", "mrp", "overcharging", "service deficiency"],
    },
    "employment": {
        "statute": "Payment of Wages Act 1936 & Industrial Disputes Act 1947",
        "keywords": ["salary", "unpaid wages", "termination", "fired", "resignation", "notice period", "pf", "provident fund", "gratuity", "posh", "harassment at work"],
    },
    "insurance": {
        "statute": "Insurance Regulatory and Development Authority Act 1999 (IRDAI)",
        "keywords": ["insurance", "claim rejected", "mediclaim", "tpa", "health insurance", "motor claim", "repudiation", "policyholder"],
    },
    "cyber": {
        "statute": "Information Technology Act 2000 (Section 66C/66D)",
        "keywords": ["cyber", "otp fraud", "phishing", "scam", "hacked", "identity theft", "financial fraud", "upi fraud", "online blackmail"],
    },
    "real_estate": {
        "statute": "Real Estate (Regulation and Development) Act 2016 (RERA)",
        "keywords": ["rera", "builder", "possession delay", "flat", "allotment", "society", "maintenance delay", "promoter"],
    },
    "rti": {
        "statute": "Right to Information Act 2005",
        "keywords": ["rti", "public authority", "pio", "information officer", "first appeal", "government record"],
    },
    "women_rights": {
        "statute": "Protection of Women from Domestic Violence Act 2005 & POSH Act 2013",
        "keywords": ["domestic violence", "maintenance", "dowry", "posh", "498a", "zero fir", "sexual harassment", "streedhan"],
    },
}

URGENCY_KEYWORDS = [
    "arrest", "police", "fir", "jail", "threatened", "beaten", "emergency", "evicted today", "immediate", "lock out"
]


def classify_citizen_query(query: str) -> dict:
    """
    Classify query intent deterministically using keyword scoring.
    Returns:
      - detected_category: best matching category id or 'general'
      - relevant_statute: primary governing Indian statute
      - is_urgent: True if emergency/police/arrest is mentioned
      - confidence: 0.0 - 1.0 based on keyword density
    """
    q_lower = query.lower()

    # Check urgency
    is_urgent = any(re.search(rf"\b{re.escape(w)}\b", q_lower) for w in URGENCY_KEYWORDS)

    scores: dict[str, int] = {}
    for cat_id, info in CATEGORY_KEYWORDS.items():
        keywords = info["keywords"]
        score = 0
        for kw in keywords:
            if re.search(rf"\b{re.escape(kw)}\b", q_lower):
                score += 2 if " " in kw else 1
        if score > 0:
            scores[cat_id] = score

    if not scores:
        return {
            "detected_category": "general",
            "relevant_statute": "Constitution of India & General Statutory Law",
            "is_urgent": is_urgent,
            "confidence": 0.3,
        }

    best_cat = max(scores, key=scores.get)
    best_statute = CATEGORY_KEYWORDS[best_cat]["statute"]
    confidence = min(0.95, 0.4 + (scores[best_cat] * 0.15))

    return {
        "detected_category": best_cat,
        "relevant_statute": str(best_statute),
        "is_urgent": is_urgent,
        "confidence": confidence,
    }
