from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=1, description="Account password")


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Full name of citizen")
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="Password (min 6 characters)")
    state: str = Field(default="Delhi (NCR)", description="Selected State / Jurisdiction")
    phone: str | None = Field(default=None, description="Optional contact phone")
    persona: str = Field(default="citizen", description="Role or persona identifier")


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    phone: str | None = None
    persona: str = "citizen"
    state: str = "Delhi (NCR)"
    createdAt: str


class AuthResponse(BaseModel):
    user: UserOut
    token: str
    message: str = "Authentication successful"


class ResetPasswordRequest(BaseModel):
    email: str = Field(..., description="Registered user email address")
    new_password: str = Field(..., min_length=6, description="New password (min 6 characters)")
