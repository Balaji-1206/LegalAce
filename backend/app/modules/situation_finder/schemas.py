"""
Pydantic validation schemas for Situation Finder API.
"""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field

class LawCitationSchema(BaseModel):
    act: str = Field(..., description="Name of the Indian Act")
    section: str = Field(..., description="Section number")
    section_title: str = Field(..., description="Section title")

class SituationResponse(BaseModel):
    situation_id: str = Field(..., description="Unique identifier for the situation")
    title: str = Field(..., description="A short real-life situation summary")
    description: str = Field(..., description="Detailed description of the situation")
    category: str = Field(..., description="The main category (e.g. employment)")
    applicable_laws: list[LawCitationSchema] = Field(default_factory=list, description="Laws that apply to this situation")
    user_rights: list[str] = Field(default_factory=list, description="Rights the user possesses in this situation")
    action_steps: list[str] = Field(default_factory=list, description="Roadmap list of action steps")
    important_deadlines: list[str] = Field(default_factory=list, description="Time periods or constraints")
    related_situations: list[str] = Field(default_factory=list, description="IDs of related situations")

class CategorySummary(BaseModel):
    id: str = Field(..., description="Short category identifier (e.g., employment)")
    name: str = Field(..., description="Display name for the category")
    icon: str = Field(..., description="Emoji icon representation")
    color_gradient: list[str] = Field(..., description="CSS gradient color colors list")
    situation_count: int = Field(..., description="Total situations matching this category")
