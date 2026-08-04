"""
Notification API — Feature 4

Endpoints:
  POST  /api/v1/notifications/send-otp                    — Send OTP to phone
  POST  /api/v1/notifications/verify-otp                   — Verify OTP
  POST  /api/v1/deadlines/{id}/notification-preferences    — Set reminder prefs
  DELETE /api/v1/deadlines/{id}/notification-preferences   — Disable reminders
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.logging import get_logger
from app.modules.notifications import service
from app.modules.notifications.providers import get_provider

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1", tags=["notifications"])


# ---------------------------------------------------------------------------
# Request Models
# ---------------------------------------------------------------------------

class SendOtpRequest(BaseModel):
    phone_number: str


class VerifyOtpRequest(BaseModel):
    phone_number: str
    otp: str


class NotificationPrefRequest(BaseModel):
    user_id: str
    channel: str = "whatsapp"  # whatsapp | sms | none
    phone_number: str
    reminder_offsets_days: list[int] = [7, 3, 1]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/notifications/send-otp")
async def send_otp(body: SendOtpRequest):
    """Send a 6-digit OTP to the given phone number for verification."""
    phone = body.phone_number.strip()
    if len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    otp = service.generate_otp(phone)

    # Send OTP via notification provider
    provider = get_provider()
    message = f"🔐 LegalAce Verification Code: {otp}\n\nThis code expires in 5 minutes. Do not share it."
    sent = await provider.send_message(phone, message)

    return {
        "success": sent,
        "message": f"OTP sent to {phone[:3]}****{phone[-3:]}" if sent else "Failed to send OTP",
        "provider": provider.provider_name(),
        "debug_otp": otp,
    }


@router.post("/notifications/verify-otp")
async def verify_otp(body: VerifyOtpRequest):
    """Verify the OTP sent to the phone number."""
    verified = service.verify_otp(body.phone_number.strip(), body.otp.strip())
    if not verified:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP. Please request a new one.")
    return {"verified": True, "message": "Phone number verified successfully"}


@router.post("/deadlines/{deadline_id}/notification-preferences")
async def set_deadline_notifications(deadline_id: str, body: NotificationPrefRequest):
    """Set notification preferences for a deadline (requires prior OTP verification)."""
    result = await service.set_notification_preferences(
        deadline_id=deadline_id,
        user_id=body.user_id,
        channel=body.channel,
        phone_number=body.phone_number,
        reminder_offsets_days=body.reminder_offsets_days,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Deadline not found or access denied")

    return {
        "success": True,
        "message": f"Reminders enabled via {body.channel} to {body.phone_number}",
        "deadline": result,
    }


@router.delete("/deadlines/{deadline_id}/notification-preferences")
async def disable_deadline_notifications(deadline_id: str, user_id: str):
    """Disable notifications for a deadline."""
    removed = await service.remove_notification_preferences(deadline_id, user_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Deadline not found or access denied")
    return {"success": True, "message": "Reminders disabled"}
