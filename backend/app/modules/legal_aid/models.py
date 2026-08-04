"""
Legal Aid Models — Feature 5

Pydantic models for eligibility rules and authority location data.
"""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class EligibilityCategory(BaseModel):
    id: str
    name: str
    description: str
    statutory_reference: str
    income_threshold: Optional[int] = Field(None, description="Annual income threshold in INR, if applicable")
    requires_proof: bool = False


class EligibilityResult(BaseModel):
    eligible: bool
    qualifying_categories: list[str] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)
    suggested_authority: Optional[str] = None
    statutory_basis: str = ""
    disclaimer: str = "Eligibility is indicative based on self-reported data. Final determination is made by the Legal Services Authority."


class AuthorityLocation(BaseModel):
    name: str
    authority_type: str  # DLSA, SLSA, Consumer Forum, RERA, Police
    state: str
    district: str = ""
    address: str = ""
    phone: str = ""
    email: str = ""
    website: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
