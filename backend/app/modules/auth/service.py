from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timezone
import uuid

from app.core.logging import get_logger
from app.modules.auth.schemas import LoginRequest, RegisterRequest, ResetPasswordRequest, UserOut

logger = get_logger(__name__)

PBKDF2_ROUNDS = 100_000
DEMO_USER_EMAIL = "demo@legalace.in"
DEMO_USER_PASSWORD = "legalace123"


def hash_password(password: str) -> str:
    """Generate salted PBKDF2 HMAC-SHA256 password hash."""
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PBKDF2_ROUNDS,
    ).hex()
    return f"{salt}${hashed}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    """Verify password against stored salt$hash string."""
    try:
        if "$" not in stored_hash:
            return False
        salt, expected_hash = stored_hash.split("$", 1)
        actual_hash = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            PBKDF2_ROUNDS,
        ).hex()
        return secrets.compare_digest(actual_hash, expected_hash)
    except Exception as err:
        logger.error(f"Error verifying password: {err}")
        return False


def generate_session_token(user_id: str) -> str:
    """Generate session authentication token."""
    random_part = secrets.token_urlsafe(32)
    return f"la_{user_id}_{random_part}"


async def seed_demo_user(db) -> dict:
    """Ensure demo citizen account exists in MongoDB users collection."""
    users_coll = db["users"]
    existing = await users_coll.find_one({"email": DEMO_USER_EMAIL.lower()})
    if existing:
        return existing

    demo_doc = {
        "user_id": "user_demo_rahul",
        "name": "Adv. Rahul Sharma",
        "email": DEMO_USER_EMAIL.lower(),
        "password_hash": hash_password(DEMO_USER_PASSWORD),
        "phone": "+91 98765 43210",
        "persona": "citizen",
        "state": "Delhi (NCR)",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await users_coll.insert_one(demo_doc)
    logger.info(f"Seeded demo account '{DEMO_USER_EMAIL}' into MongoDB 'users' collection.")
    return demo_doc


async def authenticate_user(db, req: LoginRequest) -> UserOut:
    """Validate user credentials against MongoDB users collection."""
    clean_email = req.email.strip().lower()
    clean_pass = req.password.strip()

    if not clean_email or not clean_pass:
        raise ValueError("Invalid email or password.")

    users_coll = db["users"]
    user_doc = await users_coll.find_one({"email": clean_email})
    if not user_doc:
        raise ValueError("Invalid email or password.")

    stored_hash = user_doc.get("password_hash", "")
    if not verify_password(clean_pass, stored_hash):
        raise ValueError("Invalid email or password.")

    return UserOut(
        id=user_doc.get("user_id", str(uuid.uuid4())),
        name=user_doc.get("name", "LegalAce User"),
        email=user_doc.get("email", clean_email),
        phone=user_doc.get("phone"),
        persona=user_doc.get("persona", "citizen"),
        state=user_doc.get("state", "Delhi (NCR)"),
        createdAt=user_doc.get("created_at", datetime.now(timezone.utc).isoformat()),
    )


async def register_user(db, req: RegisterRequest) -> UserOut:
    """Register new account in MongoDB users collection."""
    clean_email = req.email.strip().lower()
    clean_name = req.name.strip()
    clean_pass = req.password.strip()

    if not clean_name:
        raise ValueError("Please provide a valid full name.")
    if "@" not in clean_email or len(clean_email) < 5:
        raise ValueError("Please provide a valid email address.")
    if len(clean_pass) < 6:
        raise ValueError("Password must be at least 6 characters.")

    users_coll = db["users"]
    existing = await users_coll.find_one({"email": clean_email})
    if existing:
        raise ValueError("An account with this email already exists. Please sign in.")

    new_id = f"user_{uuid.uuid4().hex[:10]}"
    created_at = datetime.now(timezone.utc).isoformat()
    new_doc = {
        "user_id": new_id,
        "name": clean_name,
        "email": clean_email,
        "password_hash": hash_password(clean_pass),
        "phone": req.phone.strip() if req.phone else None,
        "persona": req.persona or "citizen",
        "state": req.state or "Delhi (NCR)",
        "created_at": created_at,
    }

    await users_coll.insert_one(new_doc)
    logger.info(f"Registered new user '{clean_email}' in MongoDB 'users' collection.")

    return UserOut(
        id=new_id,
        name=clean_name,
        email=clean_email,
        phone=new_doc["phone"],
        persona=new_doc["persona"],
        state=new_doc["state"],
        createdAt=created_at,
    )


async def reset_password(db, req: ResetPasswordRequest) -> dict:
    """Reset account password directly in MongoDB users collection."""
    clean_email = req.email.strip().lower()
    clean_pass = req.new_password.strip()

    if not clean_email or "@" not in clean_email:
        raise ValueError("Please provide a valid email address.")
    if len(clean_pass) < 6:
        raise ValueError("Password must be at least 6 characters.")

    users_coll = db["users"]
    user_doc = await users_coll.find_one({"email": clean_email})
    if not user_doc:
        raise ValueError("No account registered with this email address.")

    new_hash = hash_password(clean_pass)
    await users_coll.update_one(
        {"email": clean_email},
        {"$set": {"password_hash": new_hash}},
    )
    logger.info(f"Updated password for '{clean_email}' in MongoDB.")

    return {
        "status": "success",
        "email": clean_email,
        "message": "Password updated successfully. You can now log in.",
    }
