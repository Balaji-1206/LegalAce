from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from app.database.mongodb import get_database
from app.modules.auth.schemas import (
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    AuthResponse,
    UserOut,
)
from app.modules.auth.service import (
    authenticate_user,
    register_user,
    generate_session_token,
    seed_demo_user,
    reset_password,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=AuthResponse, summary="Sign in with email and password")
@router.post("/signin", response_model=AuthResponse, include_in_schema=False)
async def login(payload: LoginRequest) -> AuthResponse:
    """Authenticate citizen credentials against MongoDB and return session token."""
    try:
        db = get_database()
        user = await authenticate_user(db, payload)
        token = generate_session_token(user.id)
        return AuthResponse(
            user=user,
            token=token,
            message="Login successful",
        )
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(err),
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login service error: {err}",
        )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED, summary="Create new citizen account")
@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def register(payload: RegisterRequest) -> AuthResponse:
    """Register citizen account into MongoDB and return active session token."""
    try:
        db = get_database()
        user = await register_user(db, payload)
        token = generate_session_token(user.id)
        return AuthResponse(
            user=user,
            token=token,
            message="Account registered successfully",
        )
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration error: {err}",
        )


@router.post("/seed", summary="Seed demo user credentials into MongoDB")
async def seed_demo():
    """Manual trigger to seed demo user if needed."""
    try:
        db = get_database()
        user_doc = await seed_demo_user(db)
        return {
            "status": "success",
            "email": user_doc.get("email"),
            "name": user_doc.get("name"),
            "message": "Demo user is ready in MongoDB.",
        }
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Seed error: {err}",
        )


@router.post("/reset-password", summary="Reset account password without external keys")
async def reset_password_route(payload: ResetPasswordRequest):
    """Update password in MongoDB users collection directly."""
    try:
        db = get_database()
        result = await reset_password(db, payload)
        return result
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password reset error: {err}",
        )
