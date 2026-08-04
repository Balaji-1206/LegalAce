"""
Legal Aid Service — Feature 5

Eligibility checker under Legal Services Authorities Act 1987 (Section 12)
and nearest authority locator with seeded DLSA/SLSA directory data.
"""
from __future__ import annotations

from app.core.logging import get_logger
from app.database.mongodb import get_database
from app.modules.legal_aid.models import EligibilityResult, AuthorityLocation

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Statutory Eligibility Categories (Section 12, LSA Act 1987)
# ---------------------------------------------------------------------------

ELIGIBILITY_CATEGORIES = [
    {
        "id": "sc_st",
        "name": "Scheduled Caste / Scheduled Tribe",
        "description": "Member of a Scheduled Caste or Scheduled Tribe as per Constitution",
        "statutory_reference": "Section 12(a), Legal Services Authorities Act 1987",
        "income_threshold": None,
        "requires_proof": True,
    },
    {
        "id": "trafficking_victim",
        "name": "Victim of Trafficking / Begar",
        "description": "Victim of trafficking in human beings or begar as under Article 23 of the Constitution",
        "statutory_reference": "Section 12(b), Legal Services Authorities Act 1987",
        "income_threshold": None,
        "requires_proof": False,
    },
    {
        "id": "woman_child",
        "name": "Woman or Child",
        "description": "Any woman or child (below 18 years of age)",
        "statutory_reference": "Section 12(c), Legal Services Authorities Act 1987",
        "income_threshold": None,
        "requires_proof": False,
    },
    {
        "id": "disabled",
        "name": "Person with Disability",
        "description": "Person with disability as defined in the Rights of Persons with Disabilities Act 2016",
        "statutory_reference": "Section 12(d), Legal Services Authorities Act 1987",
        "income_threshold": None,
        "requires_proof": True,
    },
    {
        "id": "mass_disaster",
        "name": "Victim of Mass Disaster / Ethnic Violence",
        "description": "Person affected by mass disaster, ethnic violence, caste atrocity, flood, drought, earthquake, or industrial disaster",
        "statutory_reference": "Section 12(e), Legal Services Authorities Act 1987",
        "income_threshold": None,
        "requires_proof": False,
    },
    {
        "id": "industrial_workman",
        "name": "Industrial Workman",
        "description": "Industrial workman as defined under any labour law",
        "statutory_reference": "Section 12(f), Legal Services Authorities Act 1987",
        "income_threshold": None,
        "requires_proof": True,
    },
    {
        "id": "custody",
        "name": "Person in Custody",
        "description": "Person in custody including protective or judicial custody, in a jail, juvenile home, psychiatric hospital, or other custodial institution",
        "statutory_reference": "Section 12(g), Legal Services Authorities Act 1987",
        "income_threshold": None,
        "requires_proof": False,
    },
    {
        "id": "income_below",
        "name": "Annual Income Below Threshold",
        "description": "Person whose annual income does not exceed the prescribed threshold (₹3,00,000 for most states, ₹5,00,000 for Supreme Court matters)",
        "statutory_reference": "Section 12(h), Legal Services Authorities Act 1987",
        "income_threshold": 300000,
        "requires_proof": True,
    },
]

# State-level income thresholds (some states have higher limits)
STATE_INCOME_THRESHOLDS = {
    "Delhi (NCR)": 300000,
    "Maharashtra": 300000,
    "Karnataka": 300000,
    "Tamil Nadu": 300000,
    "Telangana": 300000,
    "Uttar Pradesh": 300000,
    "West Bengal": 300000,
    "Gujarat": 300000,
    "Kerala": 300000,
    "Punjab": 300000,
    "Other / Central": 300000,
}

# ---------------------------------------------------------------------------
# Seeded Authority Directory (real DLSA/SLSA offices)
# ---------------------------------------------------------------------------

AUTHORITY_DIRECTORY = [
    # Karnataka
    {"name": "Karnataka SLSA", "authority_type": "SLSA", "state": "Karnataka", "district": "Bengaluru",
     "address": "Nyaya Degula, 1st Floor, High Court Buildings, Bengaluru - 560001",
     "phone": "080-22110969", "email": "kslsa@nic.in", "website": "https://kslsa.kar.nic.in"},
    {"name": "DLSA Bengaluru Urban", "authority_type": "DLSA", "state": "Karnataka", "district": "Bengaluru",
     "address": "District Courts Complex, Sheshadri Road, Bengaluru - 560001",
     "phone": "080-22210052", "email": "dlsa-bengaluru@kar.nic.in", "website": "https://kslsa.kar.nic.in"},

    # Maharashtra
    {"name": "Maharashtra SLSA", "authority_type": "SLSA", "state": "Maharashtra", "district": "Mumbai",
     "address": "High Court Building, Fort, Mumbai - 400032",
     "phone": "022-22611436", "email": "mslsa@nic.in", "website": "https://mahalsa.gov.in"},
    {"name": "DLSA Mumbai", "authority_type": "DLSA", "state": "Maharashtra", "district": "Mumbai",
     "address": "City Civil Court, Fort, Mumbai - 400001",
     "phone": "022-22621015", "email": "dlsa-mumbai@mah.nic.in", "website": "https://mahalsa.gov.in"},

    # Delhi
    {"name": "DSLSA Delhi", "authority_type": "SLSA", "state": "Delhi (NCR)", "district": "Delhi",
     "address": "Patiala House Courts, New Delhi - 110001",
     "phone": "011-23386175", "email": "dslsa@nic.in", "website": "https://dslsa.org"},
    {"name": "DLSA New Delhi", "authority_type": "DLSA", "state": "Delhi (NCR)", "district": "New Delhi",
     "address": "Patiala House Courts Complex, New Delhi - 110001",
     "phone": "011-23386176", "email": "dlsa-newdelhi@nic.in", "website": "https://dslsa.org"},

    # Tamil Nadu
    {"name": "Tamil Nadu SLSA", "authority_type": "SLSA", "state": "Tamil Nadu", "district": "Chennai",
     "address": "High Court Campus, Chennai - 600104",
     "phone": "044-25301244", "email": "tnslsa@nic.in", "website": "https://tnslsa.tn.gov.in"},
    {"name": "DLSA Chennai", "authority_type": "DLSA", "state": "Tamil Nadu", "district": "Chennai",
     "address": "City Civil Court, Chennai - 600001",
     "phone": "044-25361020", "email": "dlsa-chennai@tn.nic.in", "website": "https://tnslsa.tn.gov.in"},

    # Telangana
    {"name": "Telangana SLSA", "authority_type": "SLSA", "state": "Telangana", "district": "Hyderabad",
     "address": "High Court of Telangana, Gowliguda, Hyderabad - 500002",
     "phone": "040-24523684", "email": "tslsa@nic.in", "website": "https://tslsa.telangana.gov.in"},

    # Uttar Pradesh
    {"name": "UP SLSA", "authority_type": "SLSA", "state": "Uttar Pradesh", "district": "Lucknow",
     "address": "High Court of Allahabad, Lucknow Bench, Lucknow",
     "phone": "0522-2627130", "email": "upslsa@nic.in", "website": "https://upslsa.up.nic.in"},

    # West Bengal
    {"name": "West Bengal SLSA", "authority_type": "SLSA", "state": "West Bengal", "district": "Kolkata",
     "address": "High Court, Kolkata - 700001",
     "phone": "033-22485085", "email": "wbslsa@nic.in", "website": "https://wbslsa.org"},

    # Gujarat
    {"name": "Gujarat SLSA", "authority_type": "SLSA", "state": "Gujarat", "district": "Ahmedabad",
     "address": "High Court Campus, Sola Road, Ahmedabad",
     "phone": "079-27913400", "email": "gujslsa@nic.in", "website": "https://gujslsa.gujarat.gov.in"},

    # Kerala
    {"name": "Kerala SLSA", "authority_type": "SLSA", "state": "Kerala", "district": "Ernakulam",
     "address": "High Court of Kerala, Ernakulam, Kochi - 682031",
     "phone": "0484-2391570", "email": "kelsa@nic.in", "website": "https://kelsa.kerala.gov.in"},

    # Punjab
    {"name": "Punjab SLSA", "authority_type": "SLSA", "state": "Punjab", "district": "Chandigarh",
     "address": "Punjab & Haryana High Court, Chandigarh",
     "phone": "0172-2740166", "email": "pbslsa@nic.in", "website": "https://pulsa.gov.in"},

    # NALSA (National)
    {"name": "NALSA (National)", "authority_type": "NALSA", "state": "Other / Central", "district": "",
     "address": "12/11, Jam Nagar House, Shahjahan Road, New Delhi - 110011",
     "phone": "011-23386176", "email": "nalsa-dla@nic.in", "website": "https://nalsa.gov.in"},
]


# ---------------------------------------------------------------------------
# Eligibility Check Logic
# ---------------------------------------------------------------------------

def check_eligibility(
    annual_income: int,
    state: str,
    category_flags: list[str],
) -> EligibilityResult:
    """
    Check free legal aid eligibility under Section 12, LSA Act 1987.
    Returns eligibility result with qualifying categories and reasons.
    """
    qualifying = []
    reasons = []

    for cat in ELIGIBILITY_CATEGORIES:
        cat_id = cat["id"]

        # Category flag-based eligibility
        if cat_id in category_flags:
            if cat_id == "income_below":
                threshold = STATE_INCOME_THRESHOLDS.get(state, 300000)
                if annual_income <= threshold:
                    qualifying.append(cat["name"])
                    reasons.append(
                        f"✅ Annual income ₹{annual_income:,} is below the state threshold of ₹{threshold:,} "
                        f"({cat['statutory_reference']})"
                    )
            else:
                qualifying.append(cat["name"])
                reasons.append(f"✅ {cat['description']} ({cat['statutory_reference']})")

    # Auto-check income even if not explicitly flagged
    if "income_below" not in category_flags and annual_income > 0:
        threshold = STATE_INCOME_THRESHOLDS.get(state, 300000)
        if annual_income <= threshold:
            qualifying.append("Annual Income Below Threshold")
            reasons.append(
                f"✅ Annual income ₹{annual_income:,} qualifies automatically under Section 12(h) — "
                f"threshold ₹{threshold:,} for {state}"
            )

    eligible = len(qualifying) > 0

    # Find suggested authority
    suggested = None
    for auth in AUTHORITY_DIRECTORY:
        if auth["state"] == state and auth["authority_type"] in ("DLSA", "SLSA"):
            suggested = auth["name"]
            break

    if not suggested:
        suggested = "NALSA (National Legal Services Authority) — Helpline: 15100"

    return EligibilityResult(
        eligible=eligible,
        qualifying_categories=qualifying,
        reasons=reasons if eligible else [
            "❌ Based on the information provided, you may not qualify for free legal aid under Section 12 of the LSA Act 1987.",
            "💡 You can still contact NALSA helpline 15100 or your State Legal Services Authority for guidance.",
        ],
        suggested_authority=suggested,
        statutory_basis="Section 12, Legal Services Authorities Act 1987 (as amended)",
    )


# ---------------------------------------------------------------------------
# Authority Directory Lookup
# ---------------------------------------------------------------------------

def get_authorities_by_state(state: str, authority_type: str | None = None) -> list[dict]:
    """Get authorities for a given state, optionally filtered by type."""
    results = []
    for auth in AUTHORITY_DIRECTORY:
        if auth["state"] == state:
            if authority_type is None or auth["authority_type"] == authority_type:
                results.append(auth)

    # Always include NALSA
    if not any(a["authority_type"] == "NALSA" for a in results):
        for auth in AUTHORITY_DIRECTORY:
            if auth["authority_type"] == "NALSA":
                results.append(auth)
                break

    return results


def get_supported_states() -> list[str]:
    """Return list of states with DLSA/SLSA data."""
    states = sorted(set(auth["state"] for auth in AUTHORITY_DIRECTORY if auth["authority_type"] != "NALSA"))
    return states


def get_eligibility_categories() -> list[dict]:
    """Return all statutory eligibility categories."""
    return ELIGIBILITY_CATEGORIES
