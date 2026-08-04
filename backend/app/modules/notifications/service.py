"""
Notification Service — Feature 4

OTP verification, notification preference management,
and scheduled reminder dispatch for deadline alerts.
"""
from __future__ import annotations

import random
import time
from datetime import datetime, timezone, timedelta

from app.core.logging import get_logger
from app.database.mongodb import get_database
from app.modules.notifications.providers import get_provider

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# In-Memory OTP Store (production should use Redis)
# ---------------------------------------------------------------------------

_otp_store: dict[str, dict] = {}  # phone -> {otp, expires_at, attempts}
OTP_EXPIRY_SECONDS = 300  # 5 minutes
OTP_MAX_ATTEMPTS = 3


def generate_otp(phone: str) -> str:
    """Generate a 6-digit OTP for phone verification."""
    otp = str(random.randint(100000, 999999))
    _otp_store[phone] = {
        "otp": otp,
        "expires_at": time.time() + OTP_EXPIRY_SECONDS,
        "attempts": 0,
    }
    logger.info(f"Generated OTP for {phone}: {otp}")
    return otp


def verify_otp(phone: str, otp: str) -> bool:
    """Verify OTP for the given phone number."""
    entry = _otp_store.get(phone)
    if not entry:
        return False

    if time.time() > entry["expires_at"]:
        del _otp_store[phone]
        return False

    entry["attempts"] += 1
    if entry["attempts"] > OTP_MAX_ATTEMPTS:
        del _otp_store[phone]
        return False

    if entry["otp"] == otp:
        del _otp_store[phone]
        return True

    return False


# ---------------------------------------------------------------------------
# Notification Preferences (stored on deadline documents)
# ---------------------------------------------------------------------------

async def set_notification_preferences(
    deadline_id: str,
    user_id: str,
    channel: str,
    phone_number: str,
    reminder_offsets_days: list[int] | None = None,
) -> dict | None:
    """
    Set notification preferences on a deadline.
    Channel: 'whatsapp' | 'sms' | 'none'
    """
    from bson import ObjectId

    db = get_database()
    prefs = {
        "channel": channel,
        "phone_number": phone_number,
        "reminder_offsets_days": reminder_offsets_days or [7, 3, 1],
        "verified": True,
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db["deadlines"].find_one_and_update(
        {"_id": ObjectId(deadline_id), "user_id": user_id},
        {"$set": {"notification_preferences": prefs, "updated_at": datetime.now(timezone.utc)}},
        return_document=True,
    )

    if not result:
        return None

    result["id"] = str(result.pop("_id"))
    for field in ("deadline_date", "created_at", "updated_at", "completed_at"):
        if field in result and isinstance(result[field], datetime):
            result[field] = result[field].isoformat()
    return result


async def remove_notification_preferences(deadline_id: str, user_id: str) -> bool:
    """Disable notifications for a deadline."""
    from bson import ObjectId

    db = get_database()
    result = await db["deadlines"].update_one(
        {"_id": ObjectId(deadline_id), "user_id": user_id},
        {"$unset": {"notification_preferences": ""}, "$set": {"updated_at": datetime.now(timezone.utc)}},
    )
    return result.modified_count > 0


# ---------------------------------------------------------------------------
# Reminder Dispatch (called by scheduler)
# ---------------------------------------------------------------------------

async def check_and_send_reminders() -> int:
    """
    Check all active deadlines for reminder triggers and send notifications.
    Called daily by the APScheduler job.
    Returns number of reminders sent.
    """
    db = get_database()
    now = datetime.now(timezone.utc)
    sent_count = 0

    # Find all active deadlines with notification_preferences set
    cursor = db["deadlines"].find({
        "status": "active",
        "notification_preferences": {"$exists": True},
        "notification_preferences.channel": {"$ne": "none"},
    })

    async for deadline in cursor:
        prefs = deadline.get("notification_preferences", {})
        if not prefs.get("phone_number") or not prefs.get("verified"):
            continue

        deadline_date = deadline["deadline_date"]
        if deadline_date.tzinfo is None:
            deadline_date = deadline_date.replace(tzinfo=timezone.utc)

        days_remaining = (deadline_date - now).days
        offsets = prefs.get("reminder_offsets_days", [7, 3, 1])
        notified = deadline.get("notified_days", [])

        for offset in offsets:
            if days_remaining <= offset and offset not in notified:
                # Build message
                message = (
                    f"⚖️ LegalAce Reminder\n\n"
                    f"📋 {deadline.get('title', 'Legal Deadline')}\n"
                    f"⏳ {days_remaining} day(s) remaining\n"
                    f"📅 Due: {deadline_date.strftime('%d %b %Y')}\n\n"
                    f"📝 {deadline.get('description', '')[:120]}\n\n"
                    f"Take action now to protect your legal rights."
                )

                provider = get_provider()
                success = await provider.send_message(prefs["phone_number"], message)

                if success:
                    # Mark this offset as notified
                    await db["deadlines"].update_one(
                        {"_id": deadline["_id"]},
                        {"$push": {"notified_days": offset}},
                    )
                    sent_count += 1
                    logger.info(
                        f"Sent {prefs.get('channel', 'console')} reminder for "
                        f"'{deadline.get('title')}' ({days_remaining}d remaining) to {prefs['phone_number']}"
                    )
                break  # Only send one reminder per deadline per run

    return sent_count
