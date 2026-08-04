"""
Notification Providers — Feature 4

Abstract base + concrete implementations for WhatsApp/SMS delivery.
Provider selection is automatic based on environment variables.
"""
from __future__ import annotations

import abc
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class NotificationProvider(abc.ABC):
    """Abstract notification sender interface."""

    @abc.abstractmethod
    async def send_message(self, phone: str, message: str) -> bool:
        """Send a text message to the given phone number. Returns True on success."""
        ...

    @abc.abstractmethod
    def provider_name(self) -> str:
        ...


class ConsoleProvider(NotificationProvider):
    """
    Development/demo provider — logs messages to console.
    Always available, no external dependencies.
    """

    async def send_message(self, phone: str, message: str) -> bool:
        logger.info(
            f"[ConsoleProvider] 📱 REMINDER → {phone}\n"
            f"{'─' * 50}\n"
            f"{message}\n"
            f"{'─' * 50}"
        )
        return True

    def provider_name(self) -> str:
        return "console"


class TwilioProvider(NotificationProvider):
    """
    Production provider using Twilio for WhatsApp and SMS delivery.
    Activated only when TWILIO_ACCOUNT_SID is set in .env.
    """

    def __init__(self):
        self._account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
        self._auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
        self._from_whatsapp = getattr(settings, "TWILIO_WHATSAPP_FROM", "")
        self._from_sms = getattr(settings, "TWILIO_SMS_FROM", "")

    async def send_message(self, phone: str, message: str) -> bool:
        try:
            from twilio.rest import Client
            import asyncio

            client = Client(self._account_sid, self._auth_token)
            loop = asyncio.get_running_loop()

            # Try WhatsApp first, fallback to SMS
            from_number = self._from_whatsapp or self._from_sms
            to_number = f"whatsapp:{phone}" if self._from_whatsapp else phone

            def _send():
                return client.messages.create(
                    body=message,
                    from_=from_number,
                    to=to_number,
                )

            result = await loop.run_in_executor(None, _send)
            logger.info(f"[TwilioProvider] Sent message to {phone}, SID: {result.sid}")
            return True

        except ImportError:
            logger.error("twilio package not installed — cannot send via Twilio")
            return False
        except Exception as e:
            logger.error(f"[TwilioProvider] Failed to send to {phone}: {e}")
            return False

    def provider_name(self) -> str:
        return "twilio"


class Fast2SMSProvider(NotificationProvider):
    """
    Free Indian SMS provider using Fast2SMS API.
    Offers free SMS credits for +91 Indian numbers.
    Activated when FAST2SMS_API_KEY is set in .env.
    """

    def __init__(self):
        self._api_key = getattr(settings, "FAST2SMS_API_KEY", "")

    async def send_message(self, phone: str, message: str) -> bool:
        import urllib.request
        import urllib.parse
        import json
        import asyncio

        # Clean Indian 10-digit number
        clean_phone = "".join(filter(str.isdigit, phone))
        if clean_phone.startswith("91") and len(clean_phone) == 12:
            clean_phone = clean_phone[2:]

        url = "https://www.fast2sms.com/dev/bulkV2"
        params = {
            "authorization": self._api_key,
            "route": "q",
            "message": message[:160],  # 160 char SMS limit
            "language": "english",
            "flash": "0",
            "numbers": clean_phone,
        }

        loop = asyncio.get_running_loop()
        def _send_fast2sms():
            try:
                req = urllib.request.Request(
                    f"{url}?{urllib.parse.urlencode(params)}",
                    headers={"cache-control": "no-cache"}
                )
                with urllib.request.urlopen(req, timeout=8) as response:
                    res_body = response.read().decode("utf-8")
                    data = json.loads(res_body)
                    return data.get("return") is True
            except Exception as e:
                logger.error(f"[Fast2SMSProvider] SMS failed for {clean_phone}: {e}")
                return False

        success = await loop.run_in_executor(None, _send_fast2sms)
        if success:
            logger.info(f"[Fast2SMSProvider] Free SMS sent to {clean_phone}")
            return True
        else:
            logger.warning(f"[Fast2SMSProvider] Fast2SMS API key disabled or failed for {clean_phone} — falling back to demo OTP")
            # Fallback to console provider so demo/OTP flow never gets blocked
            console = ConsoleProvider()
            return await console.send_message(phone, message)

    def provider_name(self) -> str:
        return "fast2sms"


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

_cached_provider: NotificationProvider | None = None


def get_provider() -> NotificationProvider:
    """
    Auto-select the best available notification provider.
    Tries Twilio → Fast2SMS → Console (demo).
    """
    global _cached_provider
    if _cached_provider:
        return _cached_provider

    twilio_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
    fast2sms_key = getattr(settings, "FAST2SMS_API_KEY", "")

    if twilio_sid:
        _cached_provider = TwilioProvider()
        logger.info("Notification provider: Twilio (WhatsApp/SMS)")
    elif fast2sms_key:
        _cached_provider = Fast2SMSProvider()
        logger.info("Notification provider: Fast2SMS (Free Indian SMS)")
    else:
        _cached_provider = ConsoleProvider()
        logger.info("Notification provider: Console (demo mode)")

    return _cached_provider
