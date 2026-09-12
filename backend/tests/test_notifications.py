"""Unit tests for notifications and OTP security module."""
import pytest
from pydantic import ValidationError
from app.modules.notifications import service
from app.modules.notifications.api import SendOtpRequest, NotificationPrefRequest


def test_generate_otp_format():
    phone = "9876543210"
    otp = service.generate_otp(phone)
    assert len(otp) == 6
    assert otp.isdigit()


def test_verify_otp_success():
    phone = "9876543211"
    otp = service.generate_otp(phone)
    assert service.verify_otp(phone, otp) is True
    assert service.is_phone_verified(phone) is True


def test_verify_otp_invalid_code():
    phone = "9876543212"
    service.generate_otp(phone)
    assert service.verify_otp(phone, "000000") is False


def test_verify_otp_max_attempts_lockout():
    phone = "9876543213"
    service.generate_otp(phone)
    service.verify_otp(phone, "111111")
    service.verify_otp(phone, "222222")
    service.verify_otp(phone, "333333")
    assert service.verify_otp(phone, "444444") is False


def test_send_otp_request_valid_phone():
    req = SendOtpRequest(phone_number="9876543210")
    assert req.phone_number == "9876543210"


def test_send_otp_request_invalid_phone_raises_validation_error():
    with pytest.raises(ValidationError):
        SendOtpRequest(phone_number="not_a_phone")


def test_notification_pref_valid_channel():
    req = NotificationPrefRequest(
        user_id="usr_123",
        channel="sms",
        phone_number="9876543210",
    )
    assert req.channel == "sms"


def test_notification_pref_invalid_channel_raises_validation_error():
    with pytest.raises(ValidationError):
        NotificationPrefRequest(
            user_id="usr_123",
            channel="invalid_channel",
            phone_number="9876543210",
        )


@pytest.mark.anyio
async def test_set_deadline_notifications_unverified_raises_403():
    from fastapi import HTTPException
    from app.modules.notifications.api import set_deadline_notifications

    req = NotificationPrefRequest(
        user_id="usr_123",
        channel="whatsapp",
        phone_number="9999999999",
    )

    with pytest.raises(HTTPException) as exc_info:
        await set_deadline_notifications("deadline_123", req)
    assert exc_info.value.status_code == 403

